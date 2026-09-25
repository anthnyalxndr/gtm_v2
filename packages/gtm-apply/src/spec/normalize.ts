import type { tagmanager_v2 } from "@googleapis/tagmanager";
import { SERVER_FIELDS } from "../resources/entities.js";
import { BUILT_IN_TRIGGERS, upperSnakeToCamel } from "./catalog.js";
import type { BuiltInVariableType } from "./generated/tagmanager-v2.js";
import type {
  ClientSpec,
  ContainerSpec,
  TagSpec,
  TransformationSpec,
  TriggerSpec,
  VariableSpec,
} from "./types.js";
import { containerTypeOf } from "../snapshot/pull.js";

export class NormalizeError extends Error {}

const UPPER_SNAKE = /^[A-Z][A-Z0-9_]*$/;
/** Keys whose values are API enums written in upper snake case by the UI export. */
export const ENUM_KEYS: ReadonlySet<string> = new Set([
  "type",
  "tagFiringOption",
  "consentStatus",
  "caseConversionType",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursively drop server fields and lower-camel any upper-snake enum value. */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (SERVER_FIELDS.includes(k)) continue;
    if (ENUM_KEYS.has(k) && typeof v === "string" && UPPER_SNAKE.test(v) && v.length > 1) {
      out[k] = upperSnakeToCamel(v);
      continue;
    }
    out[k] = clean(v);
  }
  return out;
}

function containsTriggerReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsTriggerReference);
  if (!isRecord(value)) return false;
  if (typeof value.type === "string" && upperSnakeToCamel(value.type) === "triggerReference") {
    return true;
  }
  return Object.values(value).some(containsTriggerReference);
}

type IdMap = Map<string, string>;

function nameFor(map: IdMap, id: unknown, kind: string): string {
  const name = map.get(String(id));
  if (!name) throw new NormalizeError(`Unknown ${kind} id ${String(id)} referenced in export`);
  return name;
}

/**
 * Turn a GTM UI export, a bare ContainerVersion, or an already-normalized
 * spec into a ContainerSpec. Idempotent on normalized input.
 */
export function normalizeExport(input: unknown): ContainerSpec {
  if (!isRecord(input)) throw new NormalizeError("Export must be a JSON object");
  const cv = isRecord(input.containerVersion) ? input.containerVersion : input;

  const rawFolders = (cv.folder ?? []) as tagmanager_v2.Schema$Folder[];
  const rawVariables = (cv.variable ?? []) as VariableSpec[];
  const rawTriggers = (cv.trigger ?? []) as (tagmanager_v2.Schema$Trigger & TriggerSpec)[];
  const rawTags = (cv.tag ?? []) as (tagmanager_v2.Schema$Tag & TagSpec)[];
  const rawBuiltIns = (cv.builtInVariable ?? []) as (string | { type?: string | null })[];
  const rawClients = (cv.client ?? []) as ClientSpec[];
  const rawTransformations = (cv.transformation ?? []) as TransformationSpec[];

  const folderNames: IdMap = new Map(
    rawFolders.filter((f) => f.folderId).map((f) => [String(f.folderId), f.name ?? ""])
  );
  const triggerNames: IdMap = new Map([
    ...Object.entries(BUILT_IN_TRIGGERS).map(([name, id]): [string, string] => [id, name]),
    ...rawTriggers
      .filter((t) => t.triggerId)
      .map((t): [string, string] => [String(t.triggerId), t.name ?? ""]),
  ]);

  const withFolder = <T extends { parentFolderId?: string | null; parentFolderName?: string }>(
    entity: T
  ): Omit<T, "parentFolderId"> => {
    const { parentFolderId, ...rest } = entity;
    if (parentFolderId) {
      return { ...rest, parentFolderName: nameFor(folderNames, parentFolderId, "folder") };
    }
    return rest;
  };

  const tags = rawTags.map((t) => {
    if (t.type?.startsWith("cvt_")) {
      throw new NormalizeError(
        `Tag "${t.name}" uses custom template ${t.type}, which is bound to the source container. Import the template into the target first; custom templates are not supported by the normalizer yet.`
      );
    }
    if (containsTriggerReference(t.parameter)) {
      throw new NormalizeError(
        `Tag "${t.name}" contains a triggerReference parameter (trigger group). Not supported yet.`
      );
    }
    const { firingTriggerId, blockingTriggerId, ...rest } = t;
    const spec: TagSpec = withFolder(rest);
    if (firingTriggerId?.length) {
      spec.firingTriggerName = firingTriggerId.map((id) => nameFor(triggerNames, id, "trigger"));
    }
    if (blockingTriggerId?.length) {
      spec.blockingTriggerName = blockingTriggerId.map((id) =>
        nameFor(triggerNames, id, "trigger")
      );
    }
    return clean(spec) as TagSpec;
  });

  const triggers = rawTriggers.map((t) => {
    if (containsTriggerReference(t.parameter)) {
      throw new NormalizeError(
        `Trigger "${t.name}" contains a triggerReference parameter (trigger group). Not supported yet.`
      );
    }
    return clean(withFolder(t)) as TriggerSpec;
  });
  const variables = rawVariables.map((v) => clean(withFolder(v)) as VariableSpec);
  const clients = rawClients.map((c) => clean(withFolder(c)) as ClientSpec);
  const transformations = rawTransformations.map((t) => clean(withFolder(t)) as TransformationSpec);
  const builtIns = rawBuiltIns
    .map((b) => (typeof b === "string" ? b : (b.type ?? "")))
    .filter((t) => t.length > 0)
    .map((t) => (UPPER_SNAKE.test(t) ? upperSnakeToCamel(t) : t)) as BuiltInVariableType[];

  const spec: ContainerSpec = {};
  const containerType = containerTypeFrom(cv, input);
  if (containerType) spec.containerType = containerType;
  if (rawFolders.length) spec.folder = rawFolders.map((f) => ({ name: f.name ?? "" }));
  if (builtIns.length) spec.builtInVariable = [...new Set(builtIns)];
  if (variables.length) spec.variable = variables;
  if (triggers.length) spec.trigger = triggers;
  if (tags.length) spec.tag = tags;
  if (clients.length) spec.client = clients;
  if (transformations.length) spec.transformation = transformations;
  return spec;
}

/** A UI export carries container.usageContext; a normalized spec carries containerType. */
function containerTypeFrom(
  cv: Record<string, unknown>,
  input: Record<string, unknown>
): ContainerSpec["containerType"] {
  if (typeof cv.containerType === "string")
    return cv.containerType as ContainerSpec["containerType"];
  if (typeof input.containerType === "string") {
    return input.containerType as ContainerSpec["containerType"];
  }
  const container = isRecord(cv.container) ? cv.container : undefined;
  const usage = container?.usageContext;
  if (Array.isArray(usage) && usage.length > 0) {
    return containerTypeOf(
      usage.map((u) => (UPPER_SNAKE.test(String(u)) ? upperSnakeToCamel(String(u)) : String(u)))
    );
  }
  return undefined;
}
