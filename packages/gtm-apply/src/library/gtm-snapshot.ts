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
import { closure, refKey, type EntityRef } from "./closure.js";
import {
  notesEncoding,
  resolveEncoding,
  type RecipeEncoding,
  type RecipeRoot,
} from "./encoding.js";
import {
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

/** What a content package commits: the API snapshot plus the recipe index computed at pull time. */
export interface GtmSnapshotData extends ApiSnapshotData {
  manifest: LibraryManifest | null;
  encoding: { name: string; options?: Record<string, unknown> };
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
  encoding?: RecipeEncoding;
}

export interface SelectOptions {
  /** Keep only destination tags in these families; tags of no family are always kept. */
  destinations?: readonly string[];
}

const ROOT_KINDS = ["tag", "client", "transformation"] as const;

const DATA_KEYS = [
  "pulledAt",
  "source",
  "container",
  "containerType",
  "workspace",
  "containerVersionHeader",
  "environments",
  "environment",
  "destinations",
  "folder",
  "variable",
  "trigger",
  "tag",
  "builtInVariable",
  "gtagConfig",
  "customTemplate",
  "client",
  "transformation",
  "zone",
  "manifest",
  "encoding",
  "recipes",
] as const satisfies readonly (keyof GtmSnapshotData)[];

/**
 * A GTM container used as a recipe library. The pulled data are the
 * instance's own members (serialize it with JSON.stringify); name-keyed maps,
 * recipe selection, lint and push sit on top.
 *
 *   const lib = await new GtmSnapshot(client, { container: "GTM-XXXX" }).init();
 *   const same = GtmSnapshot.fromData(JSON.parse(await readFile("library.json", "utf-8")));
 */
export class GtmSnapshot<R extends string = string> implements GtmSnapshotData {
  pulledAt!: string;
  source!: SnapshotSource;
  container!: tagmanager_v2.Schema$Container;
  containerType!: ContainerType;
  workspace!: tagmanager_v2.Schema$Workspace | null;
  containerVersionHeader!: tagmanager_v2.Schema$ContainerVersionHeader | null;
  environments!: tagmanager_v2.Schema$Environment[];
  environment!: tagmanager_v2.Schema$Environment | null;
  destinations!: tagmanager_v2.Schema$Destination[];
  folder!: tagmanager_v2.Schema$Folder[];
  variable!: tagmanager_v2.Schema$Variable[];
  trigger!: tagmanager_v2.Schema$Trigger[];
  tag!: tagmanager_v2.Schema$Tag[];
  builtInVariable!: tagmanager_v2.Schema$BuiltInVariable[];
  gtagConfig!: tagmanager_v2.Schema$GtagConfig[];
  customTemplate!: tagmanager_v2.Schema$CustomTemplate[];
  client!: tagmanager_v2.Schema$Client[];
  transformation!: tagmanager_v2.Schema$Transformation[];
  zone!: tagmanager_v2.Schema$Zone[];
  manifest!: LibraryManifest | null;
  encoding!: { name: string; options?: Record<string, unknown> };
  recipes!: Recipe[];

  readonly #client: GtmClient | null;
  readonly #source: SnapshotSource | null;
  readonly #options: GtmSnapshotOptions;
  #spec: ContainerSpec | null = null;
  #encoding: RecipeEncoding | null = null;
  #index: Map<string, Recipe> = new Map();

  /** Pull on init() from the container the source names. */
  constructor(client: GtmClient, source: SnapshotSource, options?: GtmSnapshotOptions);
  /** Load committed data; no client needed. Prefer fromData() for literal recipe names. */
  constructor(data: GtmSnapshotData, options?: GtmSnapshotOptions);
  constructor(
    clientOrData: GtmClient | GtmSnapshotData,
    sourceOrOptions?: SnapshotSource | GtmSnapshotOptions,
    options: GtmSnapshotOptions = {}
  ) {
    if ("container" in clientOrData && "recipes" in clientOrData) {
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

  /** Build from committed data. Recipe names become literal types for a const literal. */
  static fromData<const S extends GtmSnapshotInput>(
    data: S,
    options: GtmSnapshotOptions = {}
  ): GtmSnapshot<RecipeNameOf<S>> {
    return new GtmSnapshot<RecipeNameOf<S>>(data as unknown as GtmSnapshotData, options);
  }

  /** Pull from Tag Manager. A no-op once loaded. */
  async init(): Promise<this> {
    if (this.#spec) return this;
    if (!this.#client || !this.#source) throw new Error("GtmSnapshot has no client to pull with");
    const api = await pullSnapshot(this.#client, this.#source);
    const spec = snapshotToSpec(api);
    const manifest = readManifest(spec);
    const encoding = this.#options.encoding ?? encodingFrom(manifest);
    this.#load({
      ...api,
      manifest,
      encoding: { name: encoding.name, options: manifest?.encoding?.options },
      recipes: indexRecipes(spec, encoding, manifest),
    });
    return this;
  }

  #load(data: GtmSnapshotData): void {
    for (const key of DATA_KEYS) (this as Record<string, unknown>)[key] = data[key];
    const spec = snapshotToSpec(data);
    const manifest = data.manifest ?? readManifest(spec);
    const encoding =
      this.#options.encoding ??
      (data.encoding
        ? resolveEncoding(data.encoding.name, data.encoding.options)
        : encodingFrom(manifest));
    const recipes = indexRecipes(spec, encoding, manifest);
    this.manifest = manifest;
    this.encoding = { name: encoding.name, options: data.encoding?.options };
    this.recipes = recipes;
    this.#spec = spec;
    this.#encoding = encoding;
    this.#index = new Map(recipes.map((r) => [r.name, r]));
  }

  #ready(): { spec: ContainerSpec; encoding: RecipeEncoding } {
    if (!this.#spec || !this.#encoding) {
      throw new Error("GtmSnapshot is not initialized; call init() first");
    }
    return { spec: this.#spec, encoding: this.#encoding };
  }

  /** The whole library as a normalized spec, manifest included. */
  get spec(): ContainerSpec {
    return this.#ready().spec;
  }
  /** The encoding in effect (the manifest's, or the override given at construction). */
  get recipeEncoding(): RecipeEncoding {
    return this.#ready().encoding;
  }
  get recipeNames(): R[] {
    return [...this.#index.keys()] as R[];
  }
  recipe(name: R): Recipe | undefined {
    return this.#index.get(name);
  }
  get tags(): ReadonlyMap<string, TagSpec> {
    return byName(this.spec.tag);
  }
  get triggers(): ReadonlyMap<string, TriggerSpec> {
    return byName(this.spec.trigger);
  }
  get variables(): ReadonlyMap<string, VariableSpec> {
    return byName(this.spec.variable);
  }
  get folders(): ReadonlyMap<string, FolderSpec> {
    return byName(this.spec.folder);
  }
  get clients(): ReadonlyMap<string, ClientSpec> {
    return byName(this.spec.client);
  }
  get transformations(): ReadonlyMap<string, TransformationSpec> {
    return byName(this.spec.transformation);
  }
  get templates(): ReadonlyMap<string, tagmanager_v2.Schema$CustomTemplate> {
    return byName(this.customTemplate);
  }
  get zones(): ReadonlyMap<string, tagmanager_v2.Schema$Zone> {
    return byName(this.zone);
  }
  get builtIns(): ReadonlySet<string> {
    return new Set(this.spec.builtInVariable ?? []);
  }

  /** Destination family of a tag type, from the manifest's overrides then the defaults. */
  familyOf(tagType: string | null | undefined): string | undefined {
    if (!tagType) return undefined;
    return this.manifest?.destinations?.[tagType] ?? DEFAULT_DESTINATION_FAMILIES[tagType];
  }

  /**
   * The spec that implements the named recipes: the union of their closures,
   * in library order, with recipe declarations stripped and the manifest left
   * out. Unknown recipe names throw.
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
    const pick = <T extends { name?: string | null }>(kind: EntityRef["kind"], items?: T[]) =>
      (items ?? []).filter((e) => e.name && wanted.has(refKey({ kind, name: e.name })));
    const strip = <T extends RecipeRoot>(e: T): T => (encoding.strip?.(e) as T | undefined) ?? e;
    const out: ContainerSpec = {};
    if (spec.containerType) out.containerType = spec.containerType;
    const folder = pick("folder", spec.folder);
    const variable = pick("variable", spec.variable).filter(
      (v) => v.name !== MANIFEST_VARIABLE_NAME
    );
    const trigger = pick("trigger", spec.trigger);
    const tag = pick("tag", spec.tag).map(strip);
    const client = pick("client", spec.client).map(strip);
    const transformation = pick("transformation", spec.transformation).map(strip);
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

  /** Problems in how the library declares its recipes. */
  lint(): SpecIssue[] {
    const { spec, encoding } = this.#ready();
    const issues: SpecIssue[] = [];
    const declared = this.manifest?.recipes ? new Set(Object.keys(this.manifest.recipes)) : null;
    for (const kind of ROOT_KINDS) {
      for (const entity of spec[kind] ?? []) {
        for (const name of encoding.recipesOf(entity as RecipeRoot)) {
          if (declared && !declared.has(name)) {
            issues.push({
              entity: `${kind} "${entity.name}"`,
              path: "",
              message: `declares recipe "${name}", which is not in the manifest`,
            });
          }
        }
      }
    }
    for (const recipe of this.recipes) {
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
    return issues;
  }

  /** Apply the whole library, manifest included, back to its container. Never strips declarations. */
  push(
    client: GtmClient,
    target: { container?: string; workspace: string },
    options: { dryRun?: boolean; publish?: boolean; versionName?: string } = {}
  ): Promise<ApplySpecOutcome> {
    const container = target.container ?? this.#source?.container ?? this.container.publicId;
    if (!container) throw new Error("push needs a target container");
    return applySpec(client, {
      ...options,
      container,
      workspace: target.workspace,
      spec: this.spec,
    });
  }

  /** The data members only; what a content package writes to its committed file. */
  toJSON(): GtmSnapshotData {
    const out = {} as Record<string, unknown>;
    for (const key of DATA_KEYS) out[key] = this[key];
    return out as unknown as GtmSnapshotData;
  }
}

function byName<T extends { name?: string | null }>(
  items: readonly T[] | undefined
): ReadonlyMap<string, T> {
  return new Map((items ?? []).filter((e) => e.name).map((e) => [e.name as string, e]));
}

function encodingFrom(manifest: LibraryManifest | null): RecipeEncoding {
  return manifest?.encoding
    ? resolveEncoding(manifest.encoding.name, manifest.encoding.options)
    : notesEncoding();
}

/** Discover recipes: roots by declaration, entities by closure. */
export function indexRecipes(
  spec: ContainerSpec,
  encoding: RecipeEncoding,
  manifest: LibraryManifest | null
): Recipe[] {
  const roots = new Map<string, EntityRef[]>();
  for (const name of Object.keys(manifest?.recipes ?? {})) roots.set(name, []);
  for (const kind of ROOT_KINDS) {
    for (const entity of spec[kind] ?? []) {
      if (!entity.name) continue;
      for (const name of encoding.recipesOf(entity as RecipeRoot)) {
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
