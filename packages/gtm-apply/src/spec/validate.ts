import { gtagConfigTagId } from "../resources/gtag-configs.js";
import {
  BUILT_IN_VARIABLE_TYPES,
  SCHEMAS,
  type PropertyDef,
  type SchemaName,
} from "./generated/tagmanager-v2.js";
import { SERVER_FIELDS } from "../resources/entities.js";
import { sectionsFor } from "./kinds.js";
import type { ContainerSpec } from "./types.js";
import type { ContainerType } from "../snapshot/types.js";

const CONTAINER_TYPES: readonly ContainerType[] = ["web", "server", "amp", "android", "ios"];

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
  Client: { parentFolderName: { kind: "string" } },
  Transformation: { parentFolderName: { kind: "string" } },
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
  client: "Client",
  transformation: "Transformation",
  builtInVariable: "builtIn",
  environment: "Environment",
  gtagConfig: "GtagConfig",
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
        `is not a field of ${schema}; run \`pnpm --filter @anthnyalxndr/gtm-model gen:discovery --fetch\` if the API added it`
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
  const id = schema === "GtagConfig" && isRecord(value) ? gtagConfigTagId(value) : value;
  const named = schema === "GtagConfig" ? id : isRecord(value) ? value.name : undefined;
  const label = typeof named === "string" && named ? `${kind} "${named}"` : `${kind}[${index}]`;
  const ctx: Ctx = { entity: label, issues };
  if (!isRecord(value)) return push(ctx, "", `must be an object (got ${show(value)})`);
  if (schema === "GtagConfig") {
    if (!gtagConfigTagId(value)) {
      push(ctx, "parameter", "needs a tagId entry, which identifies the config");
    }
  } else if (typeof value.name !== "string" || value.name.length === 0) {
    push(ctx, "name", "is required");
  }
  if (schema === "Environment") return checkEnvironment(ctx, value);
  if (schema !== "Folder" && (typeof value.type !== "string" || value.type.length === 0)) {
    push(ctx, "type", "is required");
  }
  checkObject(ctx, "", schema, value);
  if (schema === "Variable" && value.type === "c") checkConstantLength(ctx, value);
}

function checkUniqueTagIds(issues: SpecIssue[], configs: unknown[]): void {
  const seen = new Map<string, number>();
  for (const c of configs) {
    const tagId = isRecord(c) ? gtagConfigTagId(c) : undefined;
    if (tagId) seen.set(tagId, (seen.get(tagId) ?? 0) + 1);
  }
  for (const [tagId, count] of seen) {
    if (count > 1) {
      issues.push({
        entity: `gtagConfig "${tagId}"`,
        path: "tagId",
        message: "appears in more than one config",
      });
    }
  }
}

/** Environment fields a spec may carry; Tag Manager sets every other one. */
const ENVIRONMENT_SPEC_FIELDS = new Set(["name", "description", "url", "enableDebug", "type"]);

function checkEnvironment(ctx: Ctx, env: Record<string, unknown>): void {
  if (typeof env.name === "string" && ["live", "latest"].includes(env.name.trim().toLowerCase())) {
    push(ctx, "name", "is built in; Live and Latest are never in a spec");
  }
  for (const key of Object.keys(env)) {
    if (!ENVIRONMENT_SPEC_FIELDS.has(key)) {
      push(ctx, key, "is set by Tag Manager and never in a spec");
    }
  }
  if (env.type !== undefined && env.type !== "user") {
    push(ctx, "type", 'must be "user" (only custom environments are in a spec)');
  }
  checkObject(ctx, "", "Environment", env);
}

/** Tag Manager rejects a constant variable whose value is longer than this. */
export const CONSTANT_VALUE_MAX_LENGTH = 1024;

function checkConstantLength(ctx: Ctx, variable: Record<string, unknown>): void {
  const params = Array.isArray(variable.parameter) ? variable.parameter : [];
  for (const p of params) {
    if (!isRecord(p) || p.key !== "value" || typeof p.value !== "string") continue;
    if (p.value.length > CONSTANT_VALUE_MAX_LENGTH) {
      push(
        ctx,
        "parameter.value",
        `is ${p.value.length} characters; Tag Manager caps a constant's value at ${CONSTANT_VALUE_MAX_LENGTH}`
      );
    }
  }
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
  const top: Ctx = { entity: "spec", issues };
  let containerType: ContainerType | undefined;
  if (spec.containerType !== undefined) {
    if (
      typeof spec.containerType === "string" &&
      CONTAINER_TYPES.includes(spec.containerType as ContainerType)
    ) {
      containerType = spec.containerType as ContainerType;
    } else {
      push(
        top,
        "containerType",
        `must be one of ${CONTAINER_TYPES.join(", ")} (got ${show(spec.containerType)})`
      );
    }
  }
  const allowed = sectionsFor(containerType);
  for (const [key, value] of Object.entries(spec)) {
    if (key === "containerType") continue;
    const kind = TOP_LEVEL[key];
    if (!kind) {
      push(top, key, `is not a spec section; expected one of ${Object.keys(TOP_LEVEL).join(", ")}`);
      continue;
    }
    if (containerType && !allowed.includes(key as (typeof allowed)[number])) {
      push(top, key, `is not supported by a ${containerType} container`);
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
    if (kind === "GtagConfig") checkUniqueTagIds(issues, value);
  }
  return issues;
}

/** Throw a SpecValidationError listing every issue when the spec is not well-formed. */
export function assertValidSpec(spec: unknown): asserts spec is ContainerSpec {
  const issues = validateSpec(spec);
  if (issues.length > 0) throw new SpecValidationError(issues);
}
