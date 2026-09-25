import { canonicalValue, compareStrings } from "../spec/canonical.js";
import type { ApiSnapshotData } from "./types.js";

/**
 * Fields in the order they are written. pulledAt comes first, so a diff of
 * two snapshots starts with the one line that always changes.
 */
const FIELD_ORDER: readonly (keyof ApiSnapshotData)[] = [
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
];

/** The field each collection is sorted by. */
const SORT_KEY: Partial<Record<keyof ApiSnapshotData, string>> = {
  environments: "name",
  destinations: "destinationId",
  folder: "name",
  variable: "name",
  trigger: "name",
  tag: "name",
  builtInVariable: "type",
  gtagConfig: "gtagConfigId",
  customTemplate: "name",
  client: "name",
  transformation: "name",
};

const field = (e: unknown, key: string): string => {
  const v = (e as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
};

/** Collections sorted by their identity, keys in a stable order, pulledAt kept. */
export function canonicalSnapshot(data: ApiSnapshotData): ApiSnapshotData {
  const out: Record<string, unknown> = {};
  for (const name of FIELD_ORDER) {
    const value = data[name];
    const key = SORT_KEY[name];
    if (key && Array.isArray(value)) {
      out[name] = [...value]
        .sort((a, b) => compareStrings(field(a, key), field(b, key)))
        .map((e) => canonicalValue(e));
      continue;
    }
    out[name] = canonicalValue(value, name);
  }
  return out as unknown as ApiSnapshotData;
}

/** Two-space JSON with a trailing newline, the way a committed snapshot file is written. */
export function stringifySnapshot(data: ApiSnapshotData): string {
  return JSON.stringify(canonicalSnapshot(data), null, 2) + "\n";
}
