import type { ContainerSpec } from "../spec/types.js";
import { refKey, type EntityRef } from "./closure.js";

/**
 * Library metadata rides in an entity's notes: the text above a line that is
 * exactly `---` is the customer-facing note, the JSON object below it is the
 * library's. The JSON never reaches a customer container.
 *
 *   Sends the GA4 form_submit event when the lead form is submitted.
 *   ---
 *   {"recipes": ["form_submit"]}
 */
export const NOTES_DELIMITER = "---";

/** How a variable's placeholder value should be replaced by a plan. */
export interface PlaceholderMetadata {
  /** What kind of value goes here, e.g. "path", "url", "ga4MeasurementId". */
  kind?: string;
  description?: string;
  example?: string;
  /** Regular expression a supplied value must match. */
  pattern?: string;
}

/** The JSON trailer of an entity's notes. Unknown keys round-trip untouched. */
export interface EntityMetadata {
  /** Recipes the entity declares; only tags, clients and transformations may. */
  recipes?: string[];
  /** Marks a variable whose library value is a placeholder a plan must replace. */
  placeholder?: PlaceholderMetadata;
  [key: string]: unknown;
}

export interface ParsedNotes {
  /** The customer-facing text; the whole note when there is no trailer. */
  text: string;
  metadata?: EntityMetadata;
  /** Why a trailer that starts with `{` could not be read. */
  error?: string;
}

const LIST = /[,\s]+/;
/** Split a comma or whitespace separated list of recipe names. */
export function parseRecipeList(value: string): string[] {
  return value
    .split(LIST)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function normalize(raw: Record<string, unknown>): EntityMetadata {
  const out: EntityMetadata = { ...raw };
  if (typeof raw.recipes === "string") out.recipes = parseRecipeList(raw.recipes);
  else if (Array.isArray(raw.recipes)) out.recipes = raw.recipes.map(String);
  return out;
}

/**
 * Split notes into customer text and library metadata. The trailer is
 * everything after the last `---` line; it counts only when it starts with
 * `{`, so prose that happens to contain a rule is left alone.
 */
export function parseNotes(notes: string | null | undefined): ParsedNotes {
  const raw = notes ?? "";
  const lines = raw.split(/\r?\n/);
  let at = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === NOTES_DELIMITER) {
      at = i;
      break;
    }
  }
  if (at < 0) return { text: raw };
  const trailer = lines
    .slice(at + 1)
    .join("\n")
    .trim();
  if (!trailer.startsWith("{")) return { text: raw };
  const text = lines.slice(0, at).join("\n").trimEnd();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trailer);
  } catch (err) {
    return { text, error: `metadata trailer is not valid JSON: ${(err as Error).message}` };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { text, error: "metadata trailer is not a JSON object" };
  }
  return { text, metadata: normalize(parsed as Record<string, unknown>) };
}

/** The inverse of parseNotes: customer text, then the trailer when there is metadata. */
export function formatNotes(text: string, metadata?: EntityMetadata): string {
  const body = text.trimEnd();
  if (!metadata || Object.keys(metadata).length === 0) return body;
  return `${body}${body ? "\n" : ""}${NOTES_DELIMITER}\n${JSON.stringify(metadata)}`;
}

/** Entity kinds whose spec carries a notes field (folders keep only a name). */
export const NOTED_KINDS = ["variable", "trigger", "tag", "client", "transformation"] as const;
export type NotedKind = (typeof NOTED_KINDS)[number];

/** The part of an entity a metadata encoding needs. */
export interface NotedEntity {
  name?: string | null;
  notes?: string | null;
}

/** How a library stores metadata on an entity and how the entity should reach a customer. */
export interface MetadataEncoding {
  name: string;
  read(entity: NotedEntity): { metadata?: EntityMetadata; error?: string };
  /** The entity as a customer container should receive it, library metadata removed. */
  forCustomer<T extends NotedEntity>(entity: T): T;
}

/** Every entity's metadata, keyed by `kind:name` (see refKey). */
export type MetadataIndex = Record<string, EntityMetadata>;

export interface MetadataError {
  ref: EntityRef;
  message: string;
}

/** Read every entity's metadata once. Entities whose trailer fails to parse are reported, not indexed. */
export function readMetadata(
  spec: ContainerSpec,
  encoding: MetadataEncoding
): { index: MetadataIndex; errors: MetadataError[] } {
  const index: MetadataIndex = {};
  const errors: MetadataError[] = [];
  for (const kind of NOTED_KINDS) {
    for (const entity of spec[kind] ?? []) {
      if (!entity.name) continue;
      const ref: EntityRef = { kind, name: entity.name };
      const { metadata, error } = encoding.read(entity as NotedEntity);
      if (error) errors.push({ ref, message: error });
      if (metadata) index[refKey(ref)] = metadata;
    }
  }
  return { index, errors };
}
