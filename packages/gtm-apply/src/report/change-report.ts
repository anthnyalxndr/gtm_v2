import { SERVER_FIELDS } from "../resources/entities.js";
import { refKey, type EntityRef, type RefKind } from "../library/closure.js";
import {
  toApiClient,
  toApiTag,
  toApiTemplate,
  toApiTransformation,
  toApiTrigger,
  toApiVariable,
  type ExistingState,
} from "../spec/convert.js";
import type { ContainerSpec } from "../spec/types.js";

/** What happened to one entity between the existing container and the desired spec. */
export type ChangeKind = "added" | "removed" | "changed" | "unchanged";

/** One field that differs on a changed entity; before/after ignore server-owned fields. */
export interface FieldDiff {
  path: string;
  before: unknown;
  after: unknown;
}

export interface EntityChange {
  kind: RefKind;
  name: string;
  change: ChangeKind;
  /** Field-level differences, for a changed entity. */
  diffs?: FieldDiff[];
  /** Recipes whose closure includes this entity, when the source is a tracking plan. */
  recipes?: string[];
  /** The value a constant variable is set to, when known. */
  value?: string;
}

export interface ChangeReportCounts {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

export interface ChangeReport {
  container?: string;
  workspace?: string;
  /** How the desired state was produced, e.g. "plan" or "snapshot". */
  source?: string;
  counts: ChangeReportCounts;
  changes: EntityChange[];
}

export interface ComputeChangesOptions {
  container?: string;
  workspace?: string;
  source?: string;
  /** Report entities present in the container but not the spec as removed. Apply never deletes; off by default. */
  removals?: boolean;
  /** Keep unchanged entities in the report (default drops them to keep it about the change). */
  includeUnchanged?: boolean;
}

/** Entity kinds carried in a spec, in apply order, each with the converter used for a fair diff. */
const KINDS: {
  kind: Exclude<RefKind, "builtInVariable" | "folder">;
  section: keyof ContainerSpec;
  raw: keyof ExistingState["raw"];
  convert: (item: never, ids: ExistingState) => { body: unknown };
}[] = [
  {
    kind: "customTemplate",
    section: "customTemplate",
    raw: "customTemplate",
    convert: (t) => ({ body: toApiTemplate(t) }),
  },
  { kind: "variable", section: "variable", raw: "variable", convert: toApiVariable },
  { kind: "client", section: "client", raw: "client", convert: toApiClient },
  {
    kind: "transformation",
    section: "transformation",
    raw: "transformation",
    convert: toApiTransformation,
  },
  { kind: "trigger", section: "trigger", raw: "trigger", convert: toApiTrigger },
  { kind: "tag", section: "tag", raw: "tag", convert: toApiTag },
];

const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Top-level fields where the desired body differs from the existing entity, server fields aside. */
function fieldDiffs(
  existing: Record<string, unknown>,
  desired: Record<string, unknown>
): FieldDiff[] {
  const out: FieldDiff[] = [];
  const keys = new Set([...Object.keys(existing), ...Object.keys(desired)]);
  for (const key of keys) {
    if (SERVER_FIELDS.includes(key)) continue;
    if (!eq(existing[key], desired[key])) {
      out.push({ path: key, before: existing[key], after: desired[key] });
    }
  }
  return out;
}

const constantValue = (v: {
  type?: string | null;
  parameter?: { key?: string | null; value?: string | null }[];
}): string | undefined =>
  v.type === "c" ? (v.parameter?.find((p) => p.key === "value")?.value ?? undefined) : undefined;

/**
 * Compare a desired spec against the existing container state, per entity kind:
 * what is added, changed (with a field-level diff), and, when asked, removed.
 * Pure; the same computation serves a dry run and a real apply.
 */
export function computeChanges(
  existing: ExistingState,
  spec: ContainerSpec,
  options: ComputeChangesOptions = {}
): ChangeReport {
  const changes: EntityChange[] = [];

  // Built-in variables: enabled or not, no field diff.
  const existingBuiltIns = existing.builtIns;
  for (const type of spec.builtInVariable ?? []) {
    changes.push({
      kind: "builtInVariable",
      name: type,
      change: existingBuiltIns.has(type) ? "unchanged" : "added",
    });
  }

  // Folders: name is the whole entity.
  const existingFolders = new Set(existing.raw.folder.map((f) => f.name));
  for (const f of spec.folder ?? []) {
    changes.push({
      kind: "folder",
      name: f.name,
      change: existingFolders.has(f.name) ? "unchanged" : "added",
    });
  }

  for (const { kind, section, raw, convert } of KINDS) {
    const desired = (spec[section] ?? []) as { name?: string | null }[];
    const current = existing.raw[raw] as { name?: string | null }[];
    const byName = new Map(current.filter((e) => e.name).map((e) => [e.name as string, e]));
    for (const item of desired) {
      if (!item.name) continue;
      const value = constantValue(item as never);
      const cur = byName.get(item.name);
      if (!cur) {
        changes.push({
          kind,
          name: item.name,
          change: "added",
          ...(value !== undefined ? { value } : {}),
        });
        continue;
      }
      const { body } = convert(item as never, existing);
      const diffs = fieldDiffs(cur as Record<string, unknown>, body as Record<string, unknown>);
      changes.push({
        kind,
        name: item.name,
        change: diffs.length ? "changed" : "unchanged",
        ...(diffs.length ? { diffs } : {}),
        ...(value !== undefined ? { value } : {}),
      });
    }
    if (options.removals) {
      const desiredNames = new Set(desired.map((e) => e.name));
      for (const e of current) {
        if (e.name && !desiredNames.has(e.name))
          changes.push({ kind, name: e.name, change: "removed" });
      }
    }
  }

  const kept = options.includeUnchanged ? changes : changes.filter((c) => c.change !== "unchanged");
  return {
    ...(options.container ? { container: options.container } : {}),
    ...(options.workspace ? { workspace: options.workspace } : {}),
    ...(options.source ? { source: options.source } : {}),
    counts: countBy(changes),
    changes: kept,
  };
}

/** Kinds carried in a spec, in apply order, for a spec-to-spec comparison. */
const SPEC_KINDS: { kind: RefKind; section: keyof ContainerSpec }[] = [
  { kind: "customTemplate", section: "customTemplate" },
  { kind: "variable", section: "variable" },
  { kind: "client", section: "client" },
  { kind: "transformation", section: "transformation" },
  { kind: "trigger", section: "trigger" },
  { kind: "tag", section: "tag" },
];

/**
 * Compare two specs directly (both name-based), for a staged-versus-pulled
 * report where there are no container ids to resolve. Same model as
 * computeChanges.
 */
export function computeSpecChanges(
  before: ContainerSpec,
  after: ContainerSpec,
  options: ComputeChangesOptions = {}
): ChangeReport {
  const changes: EntityChange[] = [];

  const beforeBuiltIns = new Set(before.builtInVariable ?? []);
  const afterBuiltIns = new Set(after.builtInVariable ?? []);
  for (const type of afterBuiltIns) {
    changes.push({
      kind: "builtInVariable",
      name: type,
      change: beforeBuiltIns.has(type) ? "unchanged" : "added",
    });
  }
  if (options.removals) {
    for (const type of beforeBuiltIns) {
      if (!afterBuiltIns.has(type))
        changes.push({ kind: "builtInVariable", name: type, change: "removed" });
    }
  }

  const beforeFolders = new Set((before.folder ?? []).map((f) => f.name));
  const afterFolders = new Set((after.folder ?? []).map((f) => f.name));
  for (const name of afterFolders) {
    changes.push({ kind: "folder", name, change: beforeFolders.has(name) ? "unchanged" : "added" });
  }
  if (options.removals) {
    for (const name of beforeFolders) {
      if (!afterFolders.has(name)) changes.push({ kind: "folder", name, change: "removed" });
    }
  }

  for (const { kind, section } of SPEC_KINDS) {
    const desired = (after[section] ?? []) as { name?: string | null }[];
    const current = (before[section] ?? []) as { name?: string | null }[];
    const byName = new Map(current.filter((e) => e.name).map((e) => [e.name as string, e]));
    for (const item of desired) {
      if (!item.name) continue;
      const value = constantValue(item as never);
      const cur = byName.get(item.name);
      if (!cur) {
        changes.push({
          kind,
          name: item.name,
          change: "added",
          ...(value !== undefined ? { value } : {}),
        });
        continue;
      }
      const diffs = fieldDiffs(cur as Record<string, unknown>, item as Record<string, unknown>);
      changes.push({
        kind,
        name: item.name,
        change: diffs.length ? "changed" : "unchanged",
        ...(diffs.length ? { diffs } : {}),
        ...(value !== undefined ? { value } : {}),
      });
    }
    if (options.removals) {
      const desiredNames = new Set(desired.map((e) => e.name));
      for (const e of current) {
        if (e.name && !desiredNames.has(e.name))
          changes.push({ kind, name: e.name, change: "removed" });
      }
    }
  }

  const kept = options.includeUnchanged ? changes : changes.filter((c) => c.change !== "unchanged");
  return {
    ...(options.container ? { container: options.container } : {}),
    ...(options.workspace ? { workspace: options.workspace } : {}),
    ...(options.source ? { source: options.source } : {}),
    counts: countBy(changes),
    changes: kept,
  };
}

function countBy(changes: readonly EntityChange[]): ChangeReportCounts {
  const counts: ChangeReportCounts = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  for (const c of changes) counts[c.change] += 1;
  return counts;
}

/**
 * Attribute each change to the recipes whose closure includes the entity.
 * `recipeEntities` maps a recipe name to the refKeys of its entities.
 */
export function attributeRecipes(
  report: ChangeReport,
  recipeEntities: ReadonlyMap<string, ReadonlySet<string>>
): ChangeReport {
  for (const change of report.changes) {
    const key = refKey({ kind: change.kind, name: change.name } as EntityRef);
    const recipes = [...recipeEntities.entries()]
      .filter(([, keys]) => keys.has(key))
      .map(([name]) => name);
    if (recipes.length) change.recipes = recipes;
  }
  return report;
}
