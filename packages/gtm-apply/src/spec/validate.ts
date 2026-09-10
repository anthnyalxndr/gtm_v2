import {
  BUILT_IN_VARIABLE_TYPES,
  SCHEMAS,
  type PropertyDef,
  type SchemaName,
} from "./generated/tagmanager-v2.js";
import { SERVER_FIELDS } from "../resources/entities.js";
import type { ContainerSpec } from "./types.js";

/** One problem found in a spec, located by entity and field path. */
export interface SpecIssue {
  /** e.g. `tag "Ads - Lead"`, or `tag[2]` when the entry has no name. */
  entity: string;
  /** Field path inside the entity, e.g. `parameter[0].type`. Empty for the entity itself. */
  path: string;
  message: string;
}

export class SpecValidationError extends Error {
  constructor(public readonly issues: SpecIssue[]) {
    super(`Spec has ${issues.length} problem(s):\n${issues.map(formatIssue).join("\n")}`);
  }
}

export function formatIssue(issue: SpecIssue): string {
  return `${issue.entity}${issue.path ? `: ${issue.path}` : ""} ${issue.message}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const show = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : typeof v);

/** Long enums (built-in variables have over a hundred values) are cut short in messages. */
function listEnum(values: readonly string[]): string {
  if (values.length <= 12) return values.join(", ");
  return `${values.slice(0, 10).join(", ")}, … (${values.length} values)`;
}

/** Spec-only fields that replace API id references, per entity schema. */
const SPEC_FIELDS: Partial<Record<SchemaName, Record<string, PropertyDef>>> = {
  Variable: { parentFolderName: { kind: "string" } },
  Trigger: { parentFolderName: { kind: "string" } },
  Tag: {
    parentFolderName: { kind: "string" },
    firingTriggerName: { kind: "string[]" },
    blockingTriggerName: { kind: "string[]" },
  },
  Folder: {},
};
/** API id references that a spec expresses by name instead. */
const ID_FIELDS = new Set([
  "parentFolderId",
  "firingTriggerId",
  "blockingTriggerId",
  ...SERVER_FIELDS,
]);

const TOP_LEVEL: Record<string, SchemaName | "builtIn"> = {
  folder: "Folder",
  variable: "Variable",
  trigger: "Trigger",
  tag: "Tag",
  builtInVariable: "builtIn",
};

interface Ctx {
  entity: string;
  issues: SpecIssue[];
}

const push = (ctx: Ctx, path: string, message: string): void => {
  ctx.issues.push({ entity: ctx.entity, path, message });
};

function checkValue(ctx: Ctx, path: string, def: PropertyDef, value: unknown): void {
  switch (def.kind) {
    case "string":
      if (typeof value !== "string")
        return push(ctx, path, `must be a string (got ${show(value)})`);
      if (def.enum && !def.enum.includes(value)) {
        push(ctx, path, `must be one of ${listEnum(def.enum)} (got ${show(value)})`);
      }
      return;
    case "boolean":
      if (typeof value !== "boolean") push(ctx, path, `must be a boolean (got ${show(value)})`);
      return;
    case "number":
      if (typeof value !== "number") push(ctx, path, `must be a number (got ${show(value)})`);
      return;
    case "string[]":
      if (!Array.isArray(value)) return push(ctx, path, `must be an array (got ${show(value)})`);
      value.forEach((v, i) =>
        checkValue(ctx, `${path}[${i}]`, { kind: "string", enum: def.enum }, v)
      );
      return;
    case "ref":
      if (!isRecord(value)) return push(ctx, path, `must be an object (got ${show(value)})`);
      checkObject(ctx, path, def.ref!, value);
      return;
    case "ref[]":
      if (!Array.isArray(value)) return push(ctx, path, `must be an array (got ${show(value)})`);
      value.forEach((v, i) => checkValue(ctx, `${path}[${i}]`, { kind: "ref", ref: def.ref }, v));
      return;
    case "unknown":
      return;
  }
}

function checkObject(
  ctx: Ctx,
  path: string,
  schema: SchemaName,
  value: Record<string, unknown>
): void {
  const props: Record<string, PropertyDef> = { ...SCHEMAS[schema], ...SPEC_FIELDS[schema] };
  const isEntity = schema in SPEC_FIELDS;
  for (const [key, v] of Object.entries(value)) {
    const at = path ? `${path}.${key}` : key;
    if (isEntity && ID_FIELDS.has(key)) {
      push(ctx, at, "is a server or id field; specs reference folders and triggers by name");
      continue;
    }
    const def = props[key];
    if (!def) {
      push(
        ctx,
        at,
        `is not a field of ${schema}; run \`pnpm gen:discovery --fetch\` if the API added it`
      );
      continue;
    }
    if (v === undefined) continue;
    if (v === null) {
      push(ctx, at, "must be omitted rather than null");
      continue;
    }
    checkValue(ctx, at, def, v);
  }
}

function checkEntity(
  issues: SpecIssue[],
  kind: string,
  index: number,
  schema: SchemaName,
  value: unknown
): void {
  const label =
    isRecord(value) && typeof value.name === "string" && value.name
      ? `${kind} "${value.name}"`
      : `${kind}[${index}]`;
  const ctx: Ctx = { entity: label, issues };
  if (!isRecord(value)) return push(ctx, "", `must be an object (got ${show(value)})`);
  if (typeof value.name !== "string" || value.name.length === 0) {
    push(ctx, "name", "is required");
  }
  if (schema !== "Folder" && (typeof value.type !== "string" || value.type.length === 0)) {
    push(ctx, "type", "is required");
  }
  checkObject(ctx, "", schema, value);
}

/**
 * Check a normalized spec against the Tag Manager API schemas: every field
 * must exist on its resource, primitives must have the right type, and enum
 * fields must hold a known value. Returns every problem found; an empty
 * array means the spec is well-formed (references are checked by the planner).
 */
export function validateSpec(spec: unknown): SpecIssue[] {
  const issues: SpecIssue[] = [];
  if (!isRecord(spec)) {
    return [{ entity: "spec", path: "", message: `must be an object (got ${show(spec)})` }];
  }
  for (const [key, value] of Object.entries(spec)) {
    const kind = TOP_LEVEL[key];
    const top: Ctx = { entity: "spec", issues };
    if (!kind) {
      push(top, key, `is not a spec section; expected one of ${Object.keys(TOP_LEVEL).join(", ")}`);
      continue;
    }
    if (value === undefined) continue;
    if (!Array.isArray(value)) {
      push(top, key, `must be an array (got ${show(value)})`);
      continue;
    }
    if (kind === "builtIn") {
      value.forEach((v, i) =>
        checkValue(top, `${key}[${i}]`, { kind: "string", enum: BUILT_IN_VARIABLE_TYPES }, v)
      );
      continue;
    }
    value.forEach((v, i) => checkEntity(issues, key, i, kind, v));
  }
  return issues;
}

/** Throw a SpecValidationError listing every issue when the spec is not well-formed. */
export function assertValidSpec(spec: unknown): asserts spec is ContainerSpec {
  const issues = validateSpec(spec);
  if (issues.length > 0) throw new SpecValidationError(issues);
}
