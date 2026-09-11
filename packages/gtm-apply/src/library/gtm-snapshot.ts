import type { GtmClient } from "@anthnyalxndr/gtm-client";
import type { tagmanager_v2 } from "@googleapis/tagmanager";
import { pullSnapshot, snapshotToSpec } from "../snapshot/pull.js";
import type { ApiSnapshotData, ContainerType, SnapshotSource } from "../snapshot/types.js";
import { applySpec, type ApplySpecOutcome } from "../spec/execute.js";
import type {
  ClientSpec,
  ContainerSpec,
  FolderSpec,
  TagSpec,
  TransformationSpec,
  TriggerSpec,
  VariableSpec,
} from "../spec/types.js";
import type { SpecIssue } from "../spec/validate.js";
import {
  checkNames,
  externalName,
  mergeConventions,
  type ConventionOverrides,
  type NamingConventions,
} from "../spec/conventions.js";
import { closure, refKey, type EntityRef } from "./closure.js";
import { notesEncoding, resolveEncoding } from "./encoding.js";
import {
  NOTED_KINDS,
  readMetadata,
  type EntityMetadata,
  type MetadataEncoding,
  type MetadataError,
  type MetadataIndex,
  type NotedEntity,
} from "./metadata.js";
import { describeLiteral, findLiterals, type LiteralBearer } from "./literals.js";
import {
  DEFAULT_PLACEHOLDER_PATTERN,
  MANIFEST_VARIABLE_NAME,
  readManifest,
  type ExternalDependency,
  type LibraryManifest,
} from "./manifest.js";

/** A recipe as discovered in the library: its roots and everything they reach. */
export interface Recipe {
  name: string;
  description?: string;
  /** Entities that declare this recipe. */
  roots: EntityRef[];
  /** Roots plus their reference closure. */
  entities: EntityRef[];
  dependencies: ExternalDependency[];
}

/** What a content package commits: the API pull plus what was read and computed from it. */
export interface GtmSnapshotData {
  /** The pull, exactly as the API returned it. */
  data: ApiSnapshotData;
  manifest: LibraryManifest | null;
  /** The encoding in effect, by registered name. */
  encoding: { name: string; options?: Record<string, unknown> };
  /** Every entity's library metadata read from its notes at pull time, keyed by `kind:name`. */
  metadata: MetadataIndex;
  /** The recipe index computed at pull time. */
  recipes: Recipe[];
}

type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Accepts a snapshot literal (const or not) or a GtmSnapshotData. */
export type GtmSnapshotInput = DeepReadonly<GtmSnapshotData>;

/** Literal recipe names when the data is a const literal; string otherwise. */
export type RecipeNameOf<S> = S extends {
  readonly recipes: readonly { readonly name: infer N }[];
}
  ? N & string
  : string;

type ConstantNames<S> = S extends { readonly data: { readonly variable: readonly (infer V)[] } }
  ? V extends { readonly name: infer N extends string; readonly type: "c" }
    ? N
    : never
  : never;
/** Literal names of the library's constant variables when the data is a const literal; string otherwise. */
export type ConstantNameOf<S> = [ConstantNames<S>] extends [never] ? string : ConstantNames<S>;

/** Names of constants whose metadata declares a placeholder, when the data is a const literal; never otherwise. */
export type PlaceholderConstantNameOf<S> = S extends { readonly metadata: infer M }
  ? {
      [K in keyof M]: K extends `variable:${infer N}`
        ? M[K] extends { readonly placeholder: object }
          ? N
          : never
        : never;
    }[keyof M]
  : never;

type RecipeVariableNames<S, RS extends readonly string[]> = S extends {
  readonly recipes: readonly (infer Rec)[];
}
  ? Rec extends { readonly name: RS[number]; readonly entities: readonly (infer E)[] }
    ? E extends { readonly kind: "variable"; readonly name: infer N extends string }
      ? N
      : never
    : never
  : never;

/**
 * Constants a plan selecting the recipes `RS` must supply: placeholder
 * constants reached by those recipes. Literal when the data is a const
 * literal; never otherwise, so plans against a pulled library are unchecked.
 */
export type RequiredConstantNameOf<S, RS extends readonly string[]> = PlaceholderConstantNameOf<S> &
  RecipeVariableNames<S, RS>;

/** Tag types grouped into destination families a plan can enable or disable. */
export const DEFAULT_DESTINATION_FAMILIES: Readonly<Record<string, string>> = {
  gaawe: "ga4",
  gaawc: "ga4",
  sgtmgaaw: "ga4",
  googtag: "googleTag",
  awct: "googleAds",
  sp: "googleAds",
  gclidw: "googleAds",
  sgtmadsct: "googleAds",
  flc: "floodlight",
  fls: "floodlight",
};

export interface GtmSnapshotOptions {
  /** Override the encoding named by the manifest. */
  encoding?: MetadataEncoding;
  /** Naming rules layered over the manifest's; turns naming lint on. */
  conventions?: ConventionOverrides;
}

export interface SelectOptions {
  /** Keep only destination tags in these families; tags of no family are always kept. */
  destinations?: readonly string[];
}

type Named = { name?: string | null };
type Entities<T extends Named> = ReadonlyMap<string, T> | readonly T[];

const ROOT_KINDS = ["tag", "client", "transformation"] as const;

/**
 * A container pulled at one moment, with a recipe index over it. `data` is
 * the pull as the API returned it and never changes. The entity views
 * (`tags`, `triggers`, …) are a working copy: assign them to stage edits,
 * `spec` and `push()` reflect the staged state, `reset()` discards it, and
 * `toJSON()` always writes the pristine pull.
 *
 *   const lib = await new GtmSnapshot(client, { container: "GTM-XXXX" }).init();
 *   const same = GtmSnapshot.fromData(JSON.parse(await readFile("library.json", "utf-8")));
 */
export class GtmSnapshot<
  R extends string = string,
  C extends string = string,
  S extends GtmSnapshotInput = GtmSnapshotInput,
> {
  /** Phantom: the literal this library was built from, so plans can be typed against it. Never set. */
  declare readonly literal?: S;
  readonly #client: GtmClient | null;
  readonly #source: SnapshotSource | null;
  readonly #options: GtmSnapshotOptions;
  #data: ApiSnapshotData | null = null;
  #manifest: LibraryManifest | null = null;
  #encoding: MetadataEncoding | null = null;
  #encodingOptions: Record<string, unknown> | undefined;
  #spec: ContainerSpec | null = null;
  #metadata: MetadataIndex = {};
  #metadataErrors: MetadataError[] = [];
  #recipes: Recipe[] = [];
  #index = new Map<string, Recipe>();

  /** Pull on init() from the container the source names. */
  constructor(client: GtmClient, source: SnapshotSource, options?: GtmSnapshotOptions);
  /** Load committed data; no client needed. Prefer fromData() for literal recipe names. */
  constructor(data: GtmSnapshotData, options?: GtmSnapshotOptions);
  constructor(
    clientOrData: GtmClient | GtmSnapshotData,
    sourceOrOptions?: SnapshotSource | GtmSnapshotOptions,
    options: GtmSnapshotOptions = {}
  ) {
    if ("data" in clientOrData && "recipes" in clientOrData) {
      this.#client = null;
      this.#source = null;
      this.#options = (sourceOrOptions as GtmSnapshotOptions | undefined) ?? {};
      this.#load(clientOrData);
      return;
    }
    const source = sourceOrOptions as SnapshotSource | undefined;
    if (!source?.container) throw new Error("GtmSnapshot needs a source with a container id");
    this.#client = clientOrData as GtmClient;
    this.#source = source;
    this.#options = options;
  }

  /** Build from committed data. Recipe and constant names become literal types for a const literal. */
  static fromData<const S extends GtmSnapshotInput>(
    data: S,
    options: GtmSnapshotOptions = {}
  ): GtmSnapshot<RecipeNameOf<S>, ConstantNameOf<S>, S> {
    return new GtmSnapshot<RecipeNameOf<S>, ConstantNameOf<S>, S>(
      data as unknown as GtmSnapshotData,
      options
    );
  }

  /** Pull from Tag Manager. A no-op once loaded. */
  async init(): Promise<this> {
    if (this.#data) return this;
    if (!this.#client || !this.#source) throw new Error("GtmSnapshot has no client to pull with");
    const data = await pullSnapshot(this.#client, this.#source);
    const manifest = readManifest(snapshotToSpec(data));
    const encoding = this.#options.encoding ?? encodingFrom(manifest);
    this.#load({
      data,
      manifest,
      encoding: { name: encoding.name, options: manifest?.encoding?.options },
      metadata: {},
      recipes: [],
    });
    return this;
  }

  #load(input: GtmSnapshotData): void {
    this.#data = input.data;
    this.#spec = snapshotToSpec(input.data);
    this.#manifest = input.manifest ?? readManifest(this.#spec);
    this.#encodingOptions = input.encoding?.options;
    this.#encoding =
      this.#options.encoding ??
      (input.encoding
        ? resolveEncoding(input.encoding.name, input.encoding.options)
        : encodingFrom(this.#manifest));
    this.#reindex();
  }

  #reindex(): void {
    const read = readMetadata(this.#spec!, this.#encoding!);
    this.#metadata = read.index;
    this.#metadataErrors = read.errors;
    this.#recipes = indexRecipes(this.#spec!, this.#metadata, this.#manifest);
    this.#index = new Map(this.#recipes.map((r) => [r.name, r]));
  }

  #ready(): { spec: ContainerSpec; encoding: MetadataEncoding; data: ApiSnapshotData } {
    if (!this.#data || !this.#spec || !this.#encoding) {
      throw new Error("GtmSnapshot is not initialized; call init() first");
    }
    return { spec: this.#spec, encoding: this.#encoding, data: this.#data };
  }

  /** The pull as the API returned it. Never changes; see the entity views for staged edits. */
  get data(): ApiSnapshotData {
    return this.#ready().data;
  }
  get manifest(): LibraryManifest | null {
    this.#ready();
    return this.#manifest;
  }
  /** The encoding in effect (the manifest's, or the override given at construction). */
  get encoding(): MetadataEncoding {
    return this.#ready().encoding;
  }
  /** Every entity's library metadata over the staged state, keyed by `kind:name`. */
  get metadata(): Readonly<MetadataIndex> {
    this.#ready();
    return this.#metadata;
  }
  metadataOf(ref: EntityRef): EntityMetadata | undefined {
    this.#ready();
    return this.#metadata[refKey(ref)];
  }
  /** Matches library values a plan must replace: the manifest's placeholderPattern or the default. */
  get placeholderPattern(): RegExp {
    return new RegExp(this.manifest?.placeholderPattern ?? DEFAULT_PLACEHOLDER_PATTERN);
  }
  get containerType(): ContainerType {
    return this.data.containerType;
  }
  /** The recipe index over the staged state. */
  get recipes(): readonly Recipe[] {
    this.#ready();
    return this.#recipes;
  }
  recipe(name: R): Recipe | undefined {
    this.#ready();
    return this.#index.get(name);
  }
  get recipeNames(): R[] {
    return this.recipes.map((r) => r.name as R);
  }
  /** Names of the library's constant variables (type "c"), the manifest excluded. */
  get constantNames(): C[] {
    return (this.spec.variable ?? [])
      .filter((v) => v.type === "c" && v.name && v.name !== MANIFEST_VARIABLE_NAME)
      .map((v) => v.name as C);
  }

  /** The staged state as a normalized spec, manifest included. Assign the entity views to change it. */
  get spec(): ContainerSpec {
    return this.#ready().spec;
  }
  /** True when an entity view has been assigned since the pull or the last reset(). */
  get isDirty(): boolean {
    const { spec, data } = this.#ready();
    return JSON.stringify(spec) !== JSON.stringify(snapshotToSpec(data));
  }
  /** Discard staged edits and rebuild the views from the pull. */
  reset(): void {
    this.#spec = snapshotToSpec(this.data);
    this.#reindex();
  }

  #set<K extends "tag" | "trigger" | "variable" | "folder" | "client" | "transformation">(
    key: K,
    value: Entities<NonNullable<ContainerSpec[K]>[number]>
  ): void {
    const { spec } = this.#ready();
    const items = (
      value instanceof Map ? [...value.values()] : [...(value as Iterable<never>)]
    ) as NonNullable<ContainerSpec[K]>;
    if (items.length) spec[key] = items;
    else delete spec[key];
    this.#reindex();
  }

  get tags(): ReadonlyMap<string, TagSpec> {
    return byName(this.spec.tag);
  }
  set tags(value: Entities<TagSpec>) {
    this.#set("tag", value);
  }
  get triggers(): ReadonlyMap<string, TriggerSpec> {
    return byName(this.spec.trigger);
  }
  set triggers(value: Entities<TriggerSpec>) {
    this.#set("trigger", value);
  }
  get variables(): ReadonlyMap<string, VariableSpec> {
    return byName(this.spec.variable);
  }
  set variables(value: Entities<VariableSpec>) {
    this.#set("variable", value);
  }
  get folders(): ReadonlyMap<string, FolderSpec> {
    return byName(this.spec.folder);
  }
  set folders(value: Entities<FolderSpec>) {
    this.#set("folder", value);
  }
  get clients(): ReadonlyMap<string, ClientSpec> {
    return byName(this.spec.client);
  }
  set clients(value: Entities<ClientSpec>) {
    this.#set("client", value);
  }
  get transformations(): ReadonlyMap<string, TransformationSpec> {
    return byName(this.spec.transformation);
  }
  set transformations(value: Entities<TransformationSpec>) {
    this.#set("transformation", value);
  }
  get builtIns(): ReadonlySet<string> {
    return new Set(this.spec.builtInVariable ?? []);
  }
  set builtIns(value: Iterable<string>) {
    const { spec } = this.#ready();
    const list = [...new Set(value)] as ContainerSpec["builtInVariable"];
    if (list?.length) spec.builtInVariable = list;
    else delete spec.builtInVariable;
  }
  /** Custom templates from the pull; not stageable until the engine applies templates. */
  get templates(): ReadonlyMap<string, tagmanager_v2.Schema$CustomTemplate> {
    return byName(this.data.customTemplate);
  }

  /** Naming rules in effect: defaults, then the manifest's, then the constructor's. Null when neither declares any. */
  get conventions(): NamingConventions | null {
    const fromManifest = this.manifest?.conventions;
    const fromOptions = this.#options.conventions;
    if (!fromManifest && !fromOptions) return null;
    return mergeConventions(fromManifest, fromOptions);
  }

  /** The name a recipe's external dependency is expected to have on its platform. */
  externalNameOf(recipeName: R, dependency: ExternalDependency): string | undefined {
    return externalName(
      this.conventions ?? mergeConventions(),
      dependency.platform,
      dependency.resource,
      recipeName,
      dependency.nameTemplate
    );
  }

  /** Destination family of a tag type, from the manifest's overrides then the defaults. */
  familyOf(tagType: string | null | undefined): string | undefined {
    if (!tagType) return undefined;
    return this.manifest?.destinations?.[tagType] ?? DEFAULT_DESTINATION_FAMILIES[tagType];
  }

  /**
   * The spec that implements the named recipes: the union of their closures,
   * in library order, every entity as the customer should receive it (library
   * metadata removed from its notes) and the manifest left out. Unknown
   * recipe names throw.
   */
  select(names: readonly R[], options: SelectOptions = {}): ContainerSpec {
    const { spec, encoding } = this.#ready();
    const enabled = options.destinations ? new Set(options.destinations) : null;
    const roots: EntityRef[] = [];
    for (const name of names) {
      const recipe = this.#index.get(name);
      if (!recipe) throw new Error(`Unknown recipe "${name}"`);
      for (const root of recipe.roots) {
        if (enabled && root.kind === "tag") {
          const family = this.familyOf(this.tags.get(root.name)?.type);
          if (family && !enabled.has(family)) continue;
        }
        roots.push(root);
      }
    }
    const wanted = new Set(closure(spec, roots).map(refKey));
    const pick = <T extends Named>(kind: EntityRef["kind"], items?: T[]) =>
      (items ?? []).filter((e) => e.name && wanted.has(refKey({ kind, name: e.name })));
    const customer = <T extends NotedEntity>(e: T): T => encoding.forCustomer(e);
    const out: ContainerSpec = {};
    if (spec.containerType) out.containerType = spec.containerType;
    const folder = pick("folder", spec.folder);
    const variable = pick("variable", spec.variable)
      .filter((v) => v.name !== MANIFEST_VARIABLE_NAME)
      .map(customer);
    const trigger = pick("trigger", spec.trigger).map(customer);
    const tag = pick("tag", spec.tag).map(customer);
    const client = pick("client", spec.client).map(customer);
    const transformation = pick("transformation", spec.transformation).map(customer);
    const builtInVariable = (spec.builtInVariable ?? []).filter((b) =>
      wanted.has(refKey({ kind: "builtInVariable", name: b }))
    );
    if (folder.length) out.folder = folder;
    if (builtInVariable.length) out.builtInVariable = builtInVariable;
    if (variable.length) out.variable = variable;
    if (client.length) out.client = client;
    if (transformation.length) out.transformation = transformation;
    if (trigger.length) out.trigger = trigger;
    if (tag.length) out.tag = tag;
    return out;
  }

  /**
   * Problems in how the library declares itself: unreadable metadata
   * trailers, recipes declared where they cannot be, recipes the manifest
   * does not know, recipes that never fire, dependencies outside their
   * recipe, placeholders that disagree with their value, literals that look
   * site-specific, and naming when conventions are in effect.
   */
  lint(): SpecIssue[] {
    const { spec } = this.#ready();
    const issues: SpecIssue[] = [];
    const conventions = this.conventions;
    if (conventions) issues.push(...checkNames(spec, conventions));
    for (const { ref, message } of this.#metadataErrors) {
      issues.push({ entity: `${ref.kind} "${ref.name}"`, path: "notes", message });
    }
    const declared = this.manifest?.recipes ? new Set(Object.keys(this.manifest.recipes)) : null;
    const roots = new Set<string>(ROOT_KINDS);
    for (const kind of NOTED_KINDS) {
      for (const entity of spec[kind] ?? []) {
        if (!entity.name) continue;
        const recipes = this.#metadata[refKey({ kind, name: entity.name })]?.recipes ?? [];
        if (recipes.length === 0) continue;
        const label = `${kind} "${entity.name}"`;
        if (!roots.has(kind)) {
          issues.push({
            entity: label,
            path: "notes",
            message: "declares recipes, but only tags, clients and transformations can",
          });
          continue;
        }
        for (const name of recipes) {
          if (declared && !declared.has(name)) {
            issues.push({
              entity: label,
              path: "",
              message: `declares recipe "${name}", which is not in the manifest`,
            });
          }
        }
      }
    }
    for (const recipe of this.#recipes) {
      const entity = `recipe "${recipe.name}"`;
      if (recipe.roots.length === 0) {
        issues.push({ entity, path: "", message: "has no entities declaring it" });
        continue;
      }
      const hasTagRoot = recipe.roots.some((r) => r.kind === "tag");
      if (hasTagRoot && !recipe.entities.some((r) => r.kind === "trigger")) {
        issues.push({ entity, path: "", message: "reaches no trigger, so its tags never fire" });
      }
      const names = new Set(recipe.entities.map(refKey));
      recipe.dependencies.forEach((dep, i) => {
        if (!names.has(refKey({ kind: "variable", name: dep.constant }))) {
          issues.push({
            entity,
            path: `dependencies[${i}].constant`,
            message: `names "${dep.constant}", which is not a variable in the recipe`,
          });
        }
      });
    }
    const placeholder = this.placeholderPattern;
    for (const v of spec.variable ?? []) {
      if (!v.name || v.name === MANIFEST_VARIABLE_NAME) continue;
      const entry = this.#metadata[refKey({ kind: "variable", name: v.name })]?.placeholder;
      const label = `variable "${v.name}"`;
      if (v.type !== "c") {
        if (entry) {
          issues.push({
            entity: label,
            path: "notes",
            message: "declares a placeholder, but only constants hold customer values",
          });
        }
        continue;
      }
      const value = v.parameter?.find((p) => p.key === "value")?.value ?? "";
      const isPlaceholder = placeholder.test(value);
      if (entry && !isPlaceholder) {
        issues.push({
          entity: label,
          path: "value",
          message: `declares a placeholder but holds ${JSON.stringify(value)}, which would reach customers as is`,
        });
      } else if (!entry && isPlaceholder) {
        issues.push({
          entity: label,
          path: "notes",
          message: `holds the placeholder value ${JSON.stringify(value)} but declares no placeholder entry`,
        });
      }
    }
    const rules = this.manifest?.literals ?? {};
    const isPlaceholderValue = (value: string) => placeholder.test(value.trim());
    for (const kind of NOTED_KINDS) {
      for (const entity of spec[kind] ?? []) {
        if (!entity.name || entity.name === MANIFEST_VARIABLE_NAME) continue;
        const ref = { kind, name: entity.name };
        if (kind === "variable" && this.#metadata[refKey(ref)]?.placeholder) continue;
        for (const { path, hit } of findLiterals(
          entity as LiteralBearer,
          rules,
          isPlaceholderValue
        )) {
          issues.push({
            entity: `${kind} "${entity.name}"`,
            path,
            message: `holds ${JSON.stringify(hit.value)}, which ${describeLiteral(hit)}; hoist it into a Const with a placeholder entry, or list it in the manifest's literals.allow`,
          });
        }
      }
    }
    return issues;
  }

  /** Apply the staged state, manifest included, back to the container. Never strips declarations. */
  push(
    client: GtmClient,
    target: { container?: string; workspace: string },
    options: { dryRun?: boolean; publish?: boolean; versionName?: string } = {}
  ): Promise<ApplySpecOutcome> {
    const container = target.container ?? this.#source?.container ?? this.data.container.publicId;
    if (!container) throw new Error("push needs a target container");
    return applySpec(client, {
      ...options,
      container,
      workspace: target.workspace,
      spec: this.spec,
    });
  }

  /** The pristine pull with its manifest, encoding, metadata and recipe index; what a content package commits. */
  toJSON(): GtmSnapshotData {
    const { data, encoding } = this.#ready();
    const spec = snapshotToSpec(data);
    const { index } = readMetadata(spec, encoding);
    return {
      data,
      manifest: this.#manifest,
      encoding: {
        name: encoding.name,
        ...(this.#encodingOptions ? { options: this.#encodingOptions } : {}),
      },
      metadata: index,
      recipes: indexRecipes(spec, index, this.#manifest),
    };
  }
}

function byName<T extends Named>(items: readonly T[] | undefined): ReadonlyMap<string, T> {
  return new Map((items ?? []).filter((e) => e.name).map((e) => [e.name as string, e]));
}

function encodingFrom(manifest: LibraryManifest | null): MetadataEncoding {
  return manifest?.encoding
    ? resolveEncoding(manifest.encoding.name, manifest.encoding.options)
    : notesEncoding();
}

/** Discover recipes: roots by the `recipes` key of their metadata, entities by closure. */
export function indexRecipes(
  spec: ContainerSpec,
  metadata: MetadataIndex,
  manifest: LibraryManifest | null
): Recipe[] {
  const roots = new Map<string, EntityRef[]>();
  for (const name of Object.keys(manifest?.recipes ?? {})) roots.set(name, []);
  for (const kind of ROOT_KINDS) {
    for (const entity of spec[kind] ?? []) {
      if (!entity.name) continue;
      for (const name of metadata[refKey({ kind, name: entity.name })]?.recipes ?? []) {
        const list = roots.get(name) ?? [];
        list.push({ kind, name: entity.name });
        roots.set(name, list);
      }
    }
  }
  return [...roots.entries()].map(([name, rootRefs]) => ({
    name,
    ...(manifest?.recipes?.[name]?.description
      ? { description: manifest.recipes[name].description }
      : {}),
    roots: rootRefs,
    entities: closure(spec, rootRefs),
    dependencies: manifest?.recipes?.[name]?.dependencies ?? [],
  }));
}
