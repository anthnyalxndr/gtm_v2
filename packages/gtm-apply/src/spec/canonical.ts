import type { ContainerSpec } from "./types.js";

/**
 * Canonical form: the same content always serializes to the same bytes, on
 * any machine. Applied where a spec is written (normalize, export, pull),
 * never inside normalizeExport: a GtmSnapshot keeps the API's order because
 * select() returns entities in library order.
 */

/** Spec sections in the order they are written. */
const SECTION_ORDER = [
  "containerType",
  "folder",
  "builtInVariable",
  "variable",
  "trigger",
  "tag",
  "client",
  "transformation",
] as const;

/** Keys written first, in this order; every other key follows alphabetically. */
const LEADING_KEYS: readonly string[] = ["name", "type", "parentFolderName", "notes"];

/** String arrays whose order carries no meaning. */
const UNORDERED_NAME_LISTS: ReadonlySet<string> = new Set([
  "firingTriggerName",
  "blockingTriggerName",
  "builtInVariable",
]);

/** Arrays of keyed items whose order carries no meaning. A `list` parameter's items keep theirs. */
const KEYED_ARRAYS: ReadonlySet<string> = new Set(["parameter", "map"]);

/** Code-unit order, so every machine agrees; never localeCompare. */
export const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** The item's `key` when it is a string, else null. */
const keyOf = (v: unknown): string | null =>
  isRecord(v) && typeof v.key === "string" ? v.key : null;

/** True when every item has a string key and no key repeats. */
function uniquelyKeyed(items: readonly unknown[]): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyOf(item);
    if (key === null || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function orderKeys(record: Record<string, unknown>): string[] {
  const rest = Object.keys(record)
    .filter((k) => !LEADING_KEYS.includes(k))
    .sort(compareStrings);
  return [...LEADING_KEYS.filter((k) => k in record), ...rest];
}

/**
 * Canonical form of any value inside a spec. `parentKey` is the key the value
 * sits under; it decides whether an array is sorted.
 */
export function canonicalValue(value: unknown, parentKey = ""): unknown {
  if (Array.isArray(value)) {
    const items = value.map((v) => canonicalValue(v));
    if (UNORDERED_NAME_LISTS.has(parentKey) && items.every((i) => typeof i === "string")) {
      return [...new Set(items as string[])].sort(compareStrings);
    }
    if (KEYED_ARRAYS.has(parentKey) && uniquelyKeyed(items)) {
      return [...items].sort((a, b) => compareStrings(keyOf(a) ?? "", keyOf(b) ?? ""));
    }
    return items;
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const k of orderKeys(value)) out[k] = canonicalValue(value[k], k);
    return out;
  }
  return value;
}

const nameOf = (e: unknown): string => (isRecord(e) && typeof e.name === "string" ? e.name : "");

/** Sections in fixed order, entities sorted by name, empty sections dropped, keys ordered. */
export function canonicalSpec(spec: ContainerSpec): ContainerSpec {
  const input = spec as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const section of SECTION_ORDER) {
    const value = input[section];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      out[section] =
        section === "builtInVariable"
          ? canonicalValue(value, section)
          : [...value]
              .sort((a, b) => compareStrings(nameOf(a), nameOf(b)))
              .map((e) => canonicalValue(e));
      continue;
    }
    out[section] = value;
  }
  for (const k of Object.keys(input).sort(compareStrings)) {
    if (!(SECTION_ORDER as readonly string[]).includes(k)) out[k] = canonicalValue(input[k], k);
  }
  return out as ContainerSpec;
}

/** Two-space JSON with a trailing newline, the way a committed spec file is written. */
export function stringifySpec(spec: ContainerSpec): string {
  return JSON.stringify(canonicalSpec(spec), null, 2) + "\n";
}
