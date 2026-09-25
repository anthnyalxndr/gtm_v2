# GTM as code foundations: canonical specs, account snapshots, pull directories

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** gtm-apply can write one directory per container (canonical `spec.json`, canonical `snapshot.json`, `container.json`) for a single container or a whole account, so that an unchanged container re-pulls with no git diff. This is the import primitive the gtm-as-code package builds on.

**Architecture:** Three pieces in gtm-apply and one in gtm-client. A canonical serializer (`spec/canonical.ts`, `snapshot/canonical.ts`) that is a pure function of content and is applied wherever a spec or snapshot is written, never inside `normalizeExport`. A by-key comparison in `matches()` so a canonical spec reconciles against a container whose parameters are stored in another order. Account listing in gtm-client plus multi-container snapshots in gtm-apply. A pull module (`snapshot/dir.ts`) that writes the three files and a `pull` CLI command that loops it over an account with partial-failure reporting.

**Tech Stack:** TypeScript (ES2022, NodeNext), pnpm workspace, vitest, `node:util` `parseArgs`, the in-memory fake Tag Manager service in `@anthnyalxndr/gtm-client/testing`.

**Spec:** `docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md` (sections "Canonical serialization", "Pull and account listing", "The files in a container directory"). Backlog: TASK-34, TASK-19, TASK-35 in milestone m-0. Decision: `backlog/decisions/decision-11`.

## Global Constraints

- Node `>=18` at runtime; tests run under the workspace's Node (22). Imports use `.js` suffixes (NodeNext).
- Prettier: `printWidth` 100, double quotes, semicolons, `trailingComma: es5`. The pre-commit hook runs prettier and `pnpm verify` (build, typecheck, tests of every package).
- Every production change ships with tests in the same commit. Commits are Conventional Commits, no `Co-Authored-By` trailer.
- `normalizeExport` and `GtmSnapshot` keep the order the API returned. Only serialization to text is canonical.
- No new runtime dependencies. Sorting uses code-unit comparison, never `localeCompare`.
- gtm-apply never imports the content package. gtm-client stays free of spec knowledge.
- Work on a branch cut from `main` named `feat/task-34-canonical-specs` (tasks 1 to 4 and 11), then `feat/task-19-account-snapshots` (5 to 7) and `feat/task-35-pull-dirs` (8 to 10), each cut from the tip of the previous branch with its PR based on `main`. Report the merge order; never stack PR bases on one another.

## Review Focus

1. A parameter array where two items share a `key` (the API does not produce this, but a hand-written spec can): `matches()` must fall back to positional comparison, and `canonicalValue` must keep the original order rather than collapse the duplicates. Pinned in Task 1 and Task 2.
2. A `list` parameter whose items are `map` parameters: the list keeps its order while each map's entries are sorted by key. Pinned in Task 2.
3. An account containing a container with no versions yet: `pullAccount` must report it as a failure and still write every other container. Pinned in Task 9.
4. A container whose spec cannot be normalized after a previous successful pull: `spec.json` from the earlier pull must survive, so a repo never loses its spec because of a transient normalize error. Pinned in Task 8.
5. `snapshot --account` and `snapshot --container A --container B` without `--out`: the command must refuse with a usage message rather than print several JSON documents to one stream. Pinned in Task 7.

---

## File structure

gtm-client:

- Modify: `packages/gtm-client/src/containers.ts` (add `listContainers`)
- Modify: `packages/gtm-client/src/index.ts` (export it)
- Modify: `packages/gtm-client/test/containers.test.ts`
- Modify: `packages/gtm-client/README.md`

gtm-apply:

- Modify: `packages/gtm-apply/src/resources/entities.ts` (`matches` by key)
- Create: `packages/gtm-apply/src/spec/canonical.ts` (`compareStrings`, `canonicalValue`, `canonicalSpec`, `stringifySpec`)
- Create: `packages/gtm-apply/src/snapshot/canonical.ts` (`canonicalSnapshot`, `stringifySnapshot`)
- Create: `packages/gtm-apply/src/snapshot/account.ts` (`pullSnapshots`, `snapshotAccount`)
- Create: `packages/gtm-apply/src/snapshot/dir.ts` (`ContainerRecord`, `containerRecord`, `writeContainerDir`, `pullContainer`, `pullAccount`)
- Modify: `packages/gtm-apply/src/gtm.ts` (`snapshotAccount`)
- Modify: `packages/gtm-apply/src/cli.ts` (canonical output, `--account`, repeated `--container`, `--out`, `pull`)
- Modify: `packages/gtm-apply/src/index.ts` (exports)
- Modify: `packages/gtm-apply/README.md`
- Create: `packages/gtm-apply/test/canonical.test.ts`, `test/account.test.ts`, `test/pull-dir.test.ts`
- Modify: `packages/gtm-apply/test/entities.test.ts`, `test/cli.test.ts`, `test/gtm.test.ts`

---

### Task 1: `matches` compares uniquely keyed arrays by key

**Files:**
- Modify: `packages/gtm-apply/src/resources/entities.ts:42-56`
- Test: `packages/gtm-apply/test/entities.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `matches(existing: unknown, desired: unknown): boolean` with the new array rule. The planner (`planEntities` in `spec/plan.ts`) and `ensureEntity` call it unchanged.

- [ ] **Step 1: Write the failing tests**

Add inside the existing `describe("matches", …)` block in `packages/gtm-apply/test/entities.test.ts`:

```ts
  it("compares arrays of uniquely keyed items by key, in any order", () => {
    const existing = {
      parameter: [
        { type: "template", key: "conversionLabel", value: "xyz" },
        { type: "template", key: "conversionId", value: "{{Const - Ads ID}}" },
      ],
    };
    const desired = {
      parameter: [
        { type: "template", key: "conversionId", value: "{{Const - Ads ID}}" },
        { type: "template", key: "conversionLabel", value: "xyz" },
      ],
    };
    expect(matches(existing, desired)).toBe(true);
    expect(matches(existing, { parameter: [desired.parameter[0], { ...desired.parameter[1], value: "abc" }] })).toBe(false);
    expect(matches(existing, { parameter: [desired.parameter[0], { type: "template", key: "other", value: "xyz" }] })).toBe(false);
  });

  it("falls back to positional comparison when keys repeat or are missing", () => {
    const dup = [{ key: "a", value: "1" }, { key: "a", value: "2" }];
    expect(matches({ p: dup }, { p: [dup[1], dup[0]] })).toBe(false);
    expect(matches({ p: dup }, { p: dup })).toBe(true);
    const unkeyed = [{ type: "map", map: [] }, { type: "template", value: "x" }];
    expect(matches({ list: unkeyed }, { list: [unkeyed[1], unkeyed[0]] })).toBe(false);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/entities.test.ts`
Expected: the first new test fails on `expect(matches(existing, desired)).toBe(true)` (received `false`); the second passes already.

- [ ] **Step 3: Implement the by-key rule**

Replace the array branch of `matches` in `packages/gtm-apply/src/resources/entities.ts` and add the helper above it:

```ts
/** A map by `key` when every item is an object with a distinct string `key`; null otherwise. */
function keyed(items: readonly unknown[]): Map<string, unknown> | null {
  const map = new Map<string, unknown>();
  for (const item of items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
    const key = (item as { key?: unknown }).key;
    if (typeof key !== "string" || map.has(key)) return null;
    map.set(key, item);
  }
  return map;
}

/**
 * True when every key in `desired` deep-equals the same key in `existing`.
 * Keys only present on `existing` (server fields, UI defaults) are ignored.
 * An array whose items all carry a distinct string `key` (Tag Manager
 * parameters and map entries) is compared by key, so order does not matter;
 * every other array is compared positionally, because there order is meaning.
 */
export function matches(existing: unknown, desired: unknown): boolean {
  if (typeof desired !== "object" || desired === null) return existing === desired;
  if (Array.isArray(desired)) {
    if (!Array.isArray(existing) || existing.length !== desired.length) return false;
    const want = keyed(desired);
    const have = want ? keyed(existing) : null;
    if (want && have) {
      return [...want].every(([key, item]) => have.has(key) && matches(have.get(key), item));
    }
    return desired.every((d, i) => matches(existing[i], d));
  }
  if (typeof existing !== "object" || existing === null) return false;
  const e = existing as Record<string, unknown>;
  return Object.entries(desired as Record<string, unknown>).every(
    ([k, v]) => SERVER_FIELDS.includes(k) || matches(e[k], v)
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/entities.test.ts test/plan.test.ts test/execute.test.ts`
Expected: PASS, including the existing "compares arrays positionally and deeply" test.

- [ ] **Step 5: Commit**

```bash
git add packages/gtm-apply/src/resources/entities.ts packages/gtm-apply/test/entities.test.ts
git commit -m "fix(plan): compare keyed parameter arrays by key so order never plans an update (TASK-34)"
```

---

### Task 2: Canonical spec serialization

**Files:**
- Create: `packages/gtm-apply/src/spec/canonical.ts`
- Test: `packages/gtm-apply/test/canonical.test.ts`

**Interfaces:**
- Consumes: `ContainerSpec` from `spec/types.ts`.
- Produces:
  - `compareStrings(a: string, b: string): number` (code-unit order).
  - `canonicalValue(value: unknown, parentKey?: string): unknown`.
  - `canonicalSpec(spec: ContainerSpec): ContainerSpec`.
  - `stringifySpec(spec: ContainerSpec): string` (2-space JSON, trailing newline).

- [ ] **Step 1: Write the failing tests**

Create `packages/gtm-apply/test/canonical.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canonicalSpec, canonicalValue, stringifySpec } from "../src/spec/canonical.js";
import type { ContainerSpec } from "../src/spec/types.js";

const ordered: ContainerSpec = {
  containerType: "web",
  builtInVariable: ["formId", "pagePath"],
  variable: [
    { name: "Const - A", type: "c", parameter: [{ type: "template", key: "value", value: "1" }] },
    { name: "Const - B", type: "c", parameter: [{ type: "template", key: "value", value: "2" }] },
  ],
  trigger: [{ name: "Custom Event - lead", type: "customEvent" }],
  tag: [
    {
      name: "Ads - Lead",
      type: "awct",
      firingTriggerName: ["All Pages", "Custom Event - lead"],
      parameter: [
        { type: "template", key: "conversionId", value: "{{Const - A}}" },
        { type: "template", key: "conversionLabel", value: "xyz" },
      ],
    },
  ],
};

const shuffled: ContainerSpec = {
  tag: [
    {
      parameter: [
        { value: "xyz", key: "conversionLabel", type: "template" },
        { type: "template", key: "conversionId", value: "{{Const - A}}" },
      ],
      firingTriggerName: ["Custom Event - lead", "All Pages"],
      type: "awct",
      name: "Ads - Lead",
    },
  ],
  trigger: [{ type: "customEvent", name: "Custom Event - lead" }],
  variable: [
    { name: "Const - B", type: "c", parameter: [{ type: "template", key: "value", value: "2" }] },
    { name: "Const - A", type: "c", parameter: [{ type: "template", key: "value", value: "1" }] },
  ],
  builtInVariable: ["pagePath", "formId", "pagePath"],
  containerType: "web",
};

describe("stringifySpec", () => {
  it("prints the same text for specs that differ only in order", () => {
    expect(stringifySpec(shuffled)).toBe(stringifySpec(ordered));
  });

  it("writes sections, entities and keys in a fixed order with a trailing newline", () => {
    const text = stringifySpec(shuffled);
    expect(text.endsWith("}\n")).toBe(true);
    expect(Object.keys(JSON.parse(text))).toEqual([
      "containerType",
      "builtInVariable",
      "variable",
      "trigger",
      "tag",
    ]);
    const tag = JSON.parse(text).tag[0];
    expect(Object.keys(tag)).toEqual(["name", "type", "firingTriggerName", "parameter"]);
    expect(tag.firingTriggerName).toEqual(["All Pages", "Custom Event - lead"]);
    expect(tag.parameter.map((p: { key: string }) => p.key)).toEqual([
      "conversionId",
      "conversionLabel",
    ]);
    expect(JSON.parse(text).builtInVariable).toEqual(["formId", "pagePath"]);
  });

  it("is idempotent", () => {
    const once = stringifySpec(shuffled);
    expect(stringifySpec(JSON.parse(once) as ContainerSpec)).toBe(once);
  });

  it("omits empty sections and keeps unknown top-level keys", () => {
    const spec = { tag: [], trigger: [{ name: "T", type: "pageview" }], zzz: 1 } as ContainerSpec;
    expect(Object.keys(canonicalSpec(spec))).toEqual(["trigger", "zzz"]);
  });
});

describe("canonicalValue", () => {
  it("keeps list item order while sorting each map's entries by key", () => {
    const list = [
      { type: "map", map: [{ key: "value", value: "2" }, { key: "name", value: "b" }] },
      { type: "map", map: [{ key: "value", value: "1" }, { key: "name", value: "a" }] },
    ];
    const out = canonicalValue({ type: "list", key: "eventSettingsTable", list }) as {
      list: { map: { key: string }[] }[];
    };
    expect(out.list.map((m) => m.map[0].key)).toEqual(["name", "name"]);
    expect(out.list.map((m) => m.map[1].key)).toEqual(["value", "value"]);
    expect(out.list[0].map[1]).toEqual({ key: "value", value: "2" });
  });

  it("keeps parameter order when keys repeat or are missing", () => {
    const dup = [{ key: "a", value: "2" }, { key: "a", value: "1" }];
    expect((canonicalValue({ parameter: dup }) as { parameter: unknown[] }).parameter).toEqual(dup);
    const missing = [{ type: "template", value: "b" }, { key: "a", value: "1" }];
    expect((canonicalValue({ parameter: missing }) as { parameter: unknown[] }).parameter).toEqual(
      missing
    );
  });

  it("does not sort arrays that are not name lists or keyed parameters", () => {
    const filters = [{ type: "equals" }, { type: "contains" }];
    expect((canonicalValue({ customEventFilter: filters }) as { customEventFilter: unknown[] }).customEventFilter).toEqual(filters);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/canonical.test.ts`
Expected: FAIL with "Cannot find module '../src/spec/canonical.js'".

- [ ] **Step 3: Implement the serializer**

Create `packages/gtm-apply/src/spec/canonical.ts`:

```ts
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
          : [...value].sort((a, b) => compareStrings(nameOf(a), nameOf(b))).map((e) => canonicalValue(e));
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/canonical.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Export and commit**

Add to `packages/gtm-apply/src/index.ts`, after the `normalizeExport` export line:

```ts
export { canonicalSpec, canonicalValue, stringifySpec, compareStrings } from "./spec/canonical.js";
```

```bash
git add packages/gtm-apply/src/spec/canonical.ts packages/gtm-apply/src/index.ts packages/gtm-apply/test/canonical.test.ts
git commit -m "feat(spec): canonical serialization so an unchanged container writes the same bytes (TASK-34)"
```

---

### Task 3: Canonical snapshot serialization

**Files:**
- Create: `packages/gtm-apply/src/snapshot/canonical.ts`
- Test: `packages/gtm-apply/test/canonical.test.ts` (append)

**Interfaces:**
- Consumes: `canonicalValue`, `compareStrings` from Task 2; `ApiSnapshotData` from `snapshot/types.ts`.
- Produces: `canonicalSnapshot(data: ApiSnapshotData): ApiSnapshotData`, `stringifySnapshot(data: ApiSnapshotData): string`.

- [ ] **Step 1: Write the failing test**

Append to `packages/gtm-apply/test/canonical.test.ts`:

```ts
import { stringifySnapshot } from "../src/snapshot/canonical.js";
import type { ApiSnapshotData } from "../src/snapshot/types.js";

function snapshotWith(order: "ab" | "ba"): ApiSnapshotData {
  const a = { name: "A", tagId: "1", type: "html", parameter: [{ key: "html", value: "x" }] };
  const b = { name: "B", tagId: "2", type: "html", parameter: [{ key: "html", value: "y" }] };
  return {
    pulledAt: "2026-09-23T00:00:00.000Z",
    source: { container: "GTM-ABC123" },
    container: { publicId: "GTM-ABC123", name: "acme.com", usageContext: ["web"] },
    containerType: "web",
    workspace: null,
    containerVersionHeader: { containerVersionId: "3", name: "v3" },
    environments: [{ name: "Live" }, { name: "Latest" }],
    environment: null,
    destinations: [{ destinationId: "G-2" }, { destinationId: "AW-1" }],
    folder: [],
    variable: [],
    trigger: [],
    tag: order === "ab" ? [a, b] : [b, a],
    builtInVariable: [{ type: "pagePath" }, { type: "clickUrl" }],
    gtagConfig: [{ gtagConfigId: "9", type: "googtag" }, { gtagConfigId: "8", type: "googtag" }],
    customTemplate: [],
    client: [],
    transformation: [],
  };
}

describe("stringifySnapshot", () => {
  it("sorts every collection by its identity and keeps pulledAt", () => {
    const text = stringifySnapshot(snapshotWith("ba"));
    expect(text).toBe(stringifySnapshot(snapshotWith("ab")));
    const parsed = JSON.parse(text) as ApiSnapshotData;
    expect(Object.keys(parsed)[0]).toBe("pulledAt");
    expect(parsed.tag.map((t) => t.name)).toEqual(["A", "B"]);
    expect(parsed.destinations.map((d) => d.destinationId)).toEqual(["AW-1", "G-2"]);
    expect(parsed.gtagConfig.map((g) => g.gtagConfigId)).toEqual(["8", "9"]);
    expect(parsed.builtInVariable.map((b) => b.type)).toEqual(["clickUrl", "pagePath"]);
    expect(parsed.environments.map((e) => e.name)).toEqual(["Latest", "Live"]);
    expect(text.endsWith("\n")).toBe(true);
  });
});
```

Move the two new `import` lines to the top of the file with the others (prettier does not reorder imports, and imports after code are a lint smell).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/canonical.test.ts`
Expected: FAIL with "Cannot find module '../src/snapshot/canonical.js'".

- [ ] **Step 3: Implement**

Create `packages/gtm-apply/src/snapshot/canonical.ts`:

```ts
import { canonicalValue, compareStrings } from "../spec/canonical.js";
import type { ApiSnapshotData } from "./types.js";

/** Fields in the order they are written. pulledAt first, so a diff of two snapshots starts with the one line that always changes. */
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/canonical.test.ts`
Expected: PASS.

- [ ] **Step 5: Export and commit**

Add to `packages/gtm-apply/src/index.ts`, after the `pullSnapshot, snapshotToSpec, containerTypeOf` export:

```ts
export { canonicalSnapshot, stringifySnapshot } from "./snapshot/canonical.js";
```

```bash
git add packages/gtm-apply/src/snapshot/canonical.ts packages/gtm-apply/src/index.ts packages/gtm-apply/test/canonical.test.ts
git commit -m "feat(snapshot): canonical snapshot serialization (TASK-34)"
```

---

### Task 4: The CLI prints canonical specs and snapshots

**Files:**
- Modify: `packages/gtm-apply/src/cli.ts:89-148`
- Test: `packages/gtm-apply/test/cli.test.ts`

**Interfaces:**
- Consumes: `stringifySpec`, `stringifySnapshot`.
- Produces: `normalize`, `export`, `snapshot` output is canonical. `out()` appends a newline, so the trailing newline of `stringify*` is trimmed before printing.

- [ ] **Step 1: Write the failing test**

Add to the `describe("runCli", …)` block in `packages/gtm-apply/test/cli.test.ts`:

```ts
  it("normalize prints canonical output and is idempotent on it", async () => {
    const { client } = fresh();
    const first: string[] = [];
    expect(await runCli(parseCliArgs(["normalize", fixturePath]), client, (l) => first.push(l))).toBe(0);
    const spec = JSON.parse(first.join("\n"));
    expect(spec.builtInVariable).toEqual(["formId", "pagePath"]);
    expect(Object.keys(spec.tag[0]).slice(0, 2)).toEqual(["name", "type"]);

    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const again = join(dir, "spec.json");
    await writeFile(again, first.join("\n") + "\n");
    const second: string[] = [];
    expect(await runCli(parseCliArgs(["normalize", again]), client, (l) => second.push(l))).toBe(0);
    expect(second.join("\n")).toBe(first.join("\n"));
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/cli.test.ts`
Expected: FAIL on `expect(spec.builtInVariable).toEqual(["formId", "pagePath"])` (received `["pagePath", "formId"]`).

- [ ] **Step 3: Print canonical text**

In `packages/gtm-apply/src/cli.ts` add the imports:

```ts
import { stringifySpec } from "./spec/canonical.js";
import { stringifySnapshot } from "./snapshot/canonical.js";
```

Replace the three print statements:

```ts
    case "normalize": {
      if (!args.file) throw new Error(`normalize needs a file argument.\n${USAGE}`);
      out(stringifySpec(normalizeExport(await loadSpecFile(args.file))).trimEnd());
      return 0;
    }
```

In `export`, replace `out(JSON.stringify(normalizeExport(source), null, 2));` with:

```ts
      out(stringifySpec(normalizeExport(source)).trimEnd());
```

In `snapshot`, replace `out(JSON.stringify(snapshot, null, 2));` with:

```ts
      out(stringifySnapshot(snapshot).trimEnd());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/cli.test.ts`
Expected: PASS. If the existing "normalize prints a normalized spec" test fails on `firingTriggerName` order, its expected value `["Custom Event - lead", "Form Submit - contact"]` is already sorted; check the fixture rather than the sort.

- [ ] **Step 5: Commit**

```bash
git add packages/gtm-apply/src/cli.ts packages/gtm-apply/test/cli.test.ts
git commit -m "feat(cli): normalize, export and snapshot print canonical output (TASK-34)"
```

---

### Task 5: `listContainers` in gtm-client

**Files:**
- Modify: `packages/gtm-client/src/containers.ts` (after `resolveContainer`)
- Modify: `packages/gtm-client/src/index.ts:8`
- Test: `packages/gtm-client/test/containers.test.ts`

**Interfaces:**
- Consumes: `toRef(c, publicId)` already in the file.
- Produces: `listContainers(client: GtmClient, accountId: string): Promise<ContainerRef[]>` in the API's listing order; containers without a public id are skipped.

- [ ] **Step 1: Write the failing test**

Add to `packages/gtm-client/test/containers.test.ts` (and add `listContainers` to the import from `../src/containers.js`):

```ts
describe("listContainers", () => {
  it("returns every container of one account as refs, in listing order", async () => {
    const { service, state } = createFakeService({
      accounts: [
        { accountId: "1", name: "A" },
        { accountId: "2", name: "B" },
      ],
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a" },
        { accountId: "2", containerId: "20", publicId: "GTM-BBB", name: "b" },
        { accountId: "1", containerId: "11", publicId: "GTM-CCC", name: "c", usageContext: ["server"] },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const refs = await listContainers(client, "1");
    expect(refs.map((r) => r.publicId)).toEqual(["GTM-AAA", "GTM-CCC"]);
    expect(refs[1]).toEqual({
      accountId: "1",
      containerId: "11",
      path: "accounts/1/containers/11",
      name: "c",
      publicId: "GTM-CCC",
      usageContext: ["server"],
    });
    expect(state.calls).toEqual(["containers.list"]);
  });

  it("returns an empty list for an account with no containers", async () => {
    const { service } = createFakeService({ accounts: [{ accountId: "7", name: "Empty" }] });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    expect(await listContainers(client, "7")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @anthnyalxndr/gtm-client exec vitest run test/containers.test.ts`
Expected: FAIL, `listContainers` is not exported.

- [ ] **Step 3: Implement**

Add to `packages/gtm-client/src/containers.ts` after `resolveContainer`:

```ts
/** Every container in one account, in the API's listing order. */
export async function listContainers(client: GtmClient, accountId: string): Promise<ContainerRef[]> {
  const res = await client.call(() =>
    client.service.accounts.containers.list({ parent: `accounts/${accountId}` })
  );
  const refs: ContainerRef[] = [];
  for (const c of res.data.container ?? []) {
    if (!c.publicId) continue;
    const ref = toRef(c, c.publicId);
    if (ref) refs.push(ref);
  }
  return refs;
}
```

Change line 8 of `packages/gtm-client/src/index.ts` to:

```ts
export { resolveContainer, createContainer, listContainers } from "./containers.js";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-client exec vitest run`
Expected: PASS.

- [ ] **Step 5: Document and commit**

In `packages/gtm-client/README.md` line 14, change the helpers sentence to:

```
- **Typed helpers.** `listAccounts`, `listContainers` (every container of one account), `resolveContainer` (find a container by its `GTM-XXXXXXX` public id across every account you can see), `createContainer`.
```

```bash
git add packages/gtm-client/src/containers.ts packages/gtm-client/src/index.ts packages/gtm-client/test/containers.test.ts packages/gtm-client/README.md
git commit -m "feat(client): list the containers of an account as refs (TASK-19)"
```

---

### Task 6: Multi-container and account snapshots

**Files:**
- Create: `packages/gtm-apply/src/snapshot/account.ts`
- Modify: `packages/gtm-apply/src/gtm.ts`
- Modify: `packages/gtm-apply/src/index.ts`
- Test: `packages/gtm-apply/test/account.test.ts`, `packages/gtm-apply/test/gtm.test.ts`

**Interfaces:**
- Consumes: `listContainers` (Task 5), `pullSnapshot`.
- Produces:
  - `pullSnapshots(client, sources: readonly SnapshotSource[]): Promise<ApiSnapshotData[]>` in `sources` order.
  - `snapshotAccount(client, accountId): Promise<ApiSnapshotData[]>` (latest version of every container, listing order).
  - `Gtm.snapshotAccount(accountId, options?): Promise<GtmSnapshot[]>`, memoized per container through `Gtm.snapshot`.

- [ ] **Step 1: Write the failing tests**

Create `packages/gtm-apply/test/account.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, type FakeState } from "@anthnyalxndr/gtm-client/testing";
import { pullSnapshots, snapshotAccount } from "../src/snapshot/account.js";

function fake() {
  const { service, state } = createFakeService({
    accounts: [
      { accountId: "1", name: "Acme" },
      { accountId: "2", name: "Other" },
    ],
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
      { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
      { accountId: "2", containerId: "20", publicId: "GTM-ZZZ", name: "z.com" },
    ],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

/** Create a workspace holding one tag named after the container and version it. */
export async function seedVersion(
  client: GtmClient,
  state: FakeState,
  containerPath: string,
  tagName: string
): Promise<string> {
  const ws = client.service.accounts.containers.workspaces;
  const created = await ws.create({ parent: containerPath, requestBody: { name: "seed" } });
  const parent = created.data.path!;
  await ws.tags.create({ parent, requestBody: { name: tagName, type: "html" } });
  await ws.create_version({ path: parent, requestBody: { name: "v1" } });
  return state.versions[state.versions.length - 1].versionId;
}

describe("pullSnapshots", () => {
  it("returns one snapshot per source, in source order", async () => {
    const { client, state } = fake();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await seedVersion(client, state, "accounts/1/containers/11", "Tag B");
    const snaps = await pullSnapshots(client, [{ container: "GTM-BBB" }, { container: "GTM-AAA" }]);
    expect(snaps.map((s) => s.container.publicId)).toEqual(["GTM-BBB", "GTM-AAA"]);
    expect(snaps.map((s) => s.tag[0]?.name)).toEqual(["Tag B", "Tag A"]);
  });
});

describe("snapshotAccount", () => {
  it("snapshots every container of the account and none of another", async () => {
    const { client, state } = fake();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await seedVersion(client, state, "accounts/1/containers/11", "Tag B");
    await seedVersion(client, state, "accounts/2/containers/20", "Tag Z");
    const snaps = await snapshotAccount(client, "1");
    expect(snaps.map((s) => s.container.publicId)).toEqual(["GTM-AAA", "GTM-BBB"]);
    expect(state.calls.filter((c) => c === "containers.list")).toHaveLength(1);
  });

  it("rejects when any container has no versions, naming it", async () => {
    const { client, state } = fake();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await expect(snapshotAccount(client, "1")).rejects.toThrow(/GTM-BBB/);
  });
});
```

Add to `packages/gtm-apply/test/gtm.test.ts`, inside `describe("Gtm", …)`:

```ts
  it("snapshotAccount memoizes per container", async () => {
    const { gtm, state } = fake();
    await gtm.init();
    await gtm.apply({ container: "GTM-TPL", workspace: "seed", spec: template });
    await gtm.apply({ container: "GTM-CUST", workspace: "seed", spec: template });
    const all = await gtm.snapshotAccount("1");
    expect(all.map((s) => s.data.container.publicId)).toEqual(["GTM-TPL", "GTM-CUST"]);
    const reads = state.calls.filter((c) => c === "versions.get").length;
    const again = await gtm.snapshot({ container: "GTM-CUST" });
    expect(again).toBe(all[1]);
    expect(state.calls.filter((c) => c === "versions.get")).toHaveLength(reads);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/account.test.ts test/gtm.test.ts`
Expected: FAIL, module `../src/snapshot/account.js` not found; `gtm.snapshotAccount is not a function`.

- [ ] **Step 3: Implement**

Create `packages/gtm-apply/src/snapshot/account.ts`:

```ts
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { listContainers } from "@anthnyalxndr/gtm-client";
import { pullSnapshot } from "./pull.js";
import type { ApiSnapshotData, SnapshotSource } from "./types.js";

/**
 * Pull several containers. Results are in `sources` order. Every call goes
 * through the client's limiter, so running the pulls concurrently costs
 * nothing extra and lets the limiter interleave them.
 */
export function pullSnapshots(
  client: GtmClient,
  sources: readonly SnapshotSource[]
): Promise<ApiSnapshotData[]> {
  return Promise.all(sources.map((source) => pullSnapshot(client, source)));
}

/** The latest version of every container in an account, in the API's listing order. */
export async function snapshotAccount(
  client: GtmClient,
  accountId: string
): Promise<ApiSnapshotData[]> {
  const refs = await listContainers(client, accountId);
  return pullSnapshots(
    client,
    refs.map((ref) => ({ container: ref.publicId }))
  );
}
```

In `packages/gtm-apply/src/gtm.ts`, add `listContainers` to the import from `@anthnyalxndr/gtm-client`:

```ts
import { GtmClient, listContainers, type GtmClientOptions } from "@anthnyalxndr/gtm-client";
```

and add after the `snapshot` method:

```ts
  /** Pull every container of an account. Each one is memoized like a single snapshot() call. */
  async snapshotAccount(
    accountId: string,
    options: SnapshotCallOptions = {}
  ): Promise<GtmSnapshot[]> {
    const refs = await listContainers(this.client, accountId);
    return Promise.all(refs.map((ref) => this.snapshot({ container: ref.publicId }, options)));
  }
```

Add to `packages/gtm-apply/src/index.ts`, after the `canonicalSnapshot` export:

```ts
export { pullSnapshots, snapshotAccount } from "./snapshot/account.js";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/account.test.ts test/gtm.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gtm-apply/src/snapshot/account.ts packages/gtm-apply/src/gtm.ts packages/gtm-apply/src/index.ts packages/gtm-apply/test/account.test.ts packages/gtm-apply/test/gtm.test.ts
git commit -m "feat(snapshot): pull several containers or a whole account in one call (TASK-19)"
```

---

### Task 7: `snapshot` accepts `--account`, repeated `--container`, and `--out`

**Files:**
- Modify: `packages/gtm-apply/src/cli.ts`
- Test: `packages/gtm-apply/test/cli.test.ts`

**Interfaces:**
- Consumes: `snapshotAccount`, `pullSnapshots`, `stringifySnapshot`.
- Produces: `CliArgs` gains `containers: string[]`, `account?: string`, `out?: string`; `container` stays the first `--container` value. A shared `sourceFromArgs(args, container)` helper. With several containers or `--account`, `snapshot` writes `<out>/<publicId>.json` per container and refuses without `--out`.

- [ ] **Step 1: Write the failing tests**

In `packages/gtm-apply/test/cli.test.ts`, update the first `parseCliArgs` expectation by adding three fields to the `toEqual` object:

```ts
      containers: ["GTM-ABC123"],
      account: undefined,
      out: undefined,
```

Add to the `describe("parseCliArgs", …)` block:

```ts
  it("collects repeated --container and reads --account and --out", () => {
    const args = parseCliArgs([
      "snapshot",
      "--container",
      "GTM-A",
      "--container",
      "GTM-B",
      "--out",
      "dir",
    ]);
    expect(args.container).toBe("GTM-A");
    expect(args.containers).toEqual(["GTM-A", "GTM-B"]);
    expect(args.out).toBe("dir");
    expect(parseCliArgs(["snapshot", "--account", "1", "--out", "d"]).account).toBe("1");
  });
```

Add to `describe("runCli", …)` (import `seedVersion` from `./account.test.js`, and `readdir`, `readFile` from `fs/promises`):

```ts
  it("snapshot --account writes one canonical file per container into --out", async () => {
    const { service, state } = createFakeService({
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
        { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await seedVersion(client, state, "accounts/1/containers/11", "Tag B");
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["snapshot", "--account", "1", "--out", dir]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect((await readdir(dir)).sort()).toEqual(["GTM-AAA.json", "GTM-BBB.json"]);
    const b = JSON.parse(await readFile(join(dir, "GTM-BBB.json"), "utf-8"));
    expect(b.tag[0].name).toBe("Tag B");
    expect(lines).toEqual([`Wrote ${join(dir, "GTM-AAA.json")}`, `Wrote ${join(dir, "GTM-BBB.json")}`]);
  });

  it("snapshot of several containers refuses without --out", async () => {
    const { client } = fresh();
    await expect(
      runCli(parseCliArgs(["snapshot", "--container", "GTM-A", "--container", "GTM-B"]), client)
    ).rejects.toThrow(/--out/);
    await expect(runCli(parseCliArgs(["snapshot", "--account", "1"]), client)).rejects.toThrow(
      /--out/
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/cli.test.ts`
Expected: FAIL on the `toEqual` (missing `containers`), then on `args.containers`.

- [ ] **Step 3: Implement**

In `packages/gtm-apply/src/cli.ts`:

Imports to add:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pullSnapshots, snapshotAccount } from "./snapshot/account.js";
import type { SnapshotSource } from "./snapshot/types.js";
```

`CliArgs` gains three fields after `container?: string;`:

```ts
  /** Every --container given, in order; `container` is the first. */
  containers: string[];
  account?: string;
  out?: string;
```

In `parseCliArgs`, change the `container` option and add two:

```ts
      container: { type: "string", multiple: true },
      account: { type: "string" },
      out: { type: "string" },
```

and in the returned object:

```ts
    container: values.container?.[0],
    containers: values.container ?? [],
    account: values.account,
    out: values.out,
```

Add a module-level helper below `parseCliArgs`:

```ts
/** The SnapshotSource the flags describe for one container. */
function sourceFromArgs(args: CliArgs, container: string): SnapshotSource {
  return {
    container,
    ...(args.workspace ? { workspace: args.workspace } : {}),
    ...(args.live ? { version: "live" } : args.version ? { version: args.version } : {}),
  };
}
```

Replace the `snapshot` case:

```ts
    case "snapshot": {
      const many = Boolean(args.account) || args.containers.length > 1;
      if (many) {
        if (!args.out) {
          throw new Error(`snapshot of several containers needs --out <dir>.\n${USAGE}`);
        }
        await client.init();
        const snapshots = args.account
          ? await snapshotAccount(client, args.account)
          : await pullSnapshots(
              client,
              args.containers.map((c) => sourceFromArgs(args, c))
            );
        await mkdir(args.out, { recursive: true });
        for (const snapshot of snapshots) {
          const file = join(args.out, `${snapshot.container.publicId ?? snapshot.source.container}.json`);
          await writeFile(file, stringifySnapshot(snapshot));
          out(`Wrote ${file}`);
        }
        return 0;
      }
      if (!args.container) throw new Error(`snapshot needs --container.\n${USAGE}`);
      await client.init();
      const snapshot = await pullSnapshot(client, sourceFromArgs(args, args.container));
      out(stringifySnapshot(snapshot).trimEnd());
      return 0;
    }
```

Update `USAGE`:

```
  gtm-apply snapshot --container GTM-XXXXXXX [--live | --version <id> | --workspace <name>]
      (everything the API exposes for the container, as returned by the API)
  gtm-apply snapshot (--container GTM-A --container GTM-B | --account <id>) --out <dir>
      (one <publicId>.json per container)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gtm-apply/src/cli.ts packages/gtm-apply/test/cli.test.ts
git commit -m "feat(cli): snapshot several containers or an account into a directory (TASK-19)"
```

---

### Task 8: `writeContainerDir` and `pullContainer`

**Files:**
- Create: `packages/gtm-apply/src/snapshot/dir.ts`
- Test: `packages/gtm-apply/test/pull-dir.test.ts`

**Interfaces:**
- Consumes: `stringifySpec`, `stringifySnapshot`, `pullSnapshot`, `snapshotToSpec`.
- Produces:
  - `SPEC_FILE = "spec.json"`, `SNAPSHOT_FILE = "snapshot.json"`, `RECORD_FILE = "container.json"`.
  - `containerSlug(name: string, publicId: string): string`: the default directory name for a container.
  - `interface ContainerRecord { publicId; name; containerType; accountId; containerId; source: SnapshotSource; version: { id: string; name: string | null } | null; workspace: string | null; environment: string | null }`.
  - `containerRecord(snapshot: ApiSnapshotData): ContainerRecord`.
  - `interface PullOutcome { dir: string; record: ContainerRecord; specError?: string }`.
  - `writeContainerDir(snapshot, dir): Promise<PullOutcome>`.
  - `pullContainer(client, source, dir): Promise<PullOutcome>`.

- [ ] **Step 1: Write the failing tests**

Create `packages/gtm-apply/test/pull-dir.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GtmClient, type tagmanager_v2 } from "@anthnyalxndr/gtm-client";
import { createFakeService, type FakeState } from "@anthnyalxndr/gtm-client/testing";
import {
  containerSlug,
  pullContainer,
  RECORD_FILE,
  SNAPSHOT_FILE,
  SPEC_FILE,
} from "../src/snapshot/dir.js";

const containerPath = "accounts/1/containers/10";

describe("containerSlug", () => {
  it("lowercases the name and collapses runs of other characters to one dash", () => {
    expect(containerSlug("acme.com", "GTM-AAA")).toBe("acme-com");
    expect(containerSlug("Acme Web (prod)", "GTM-AAA")).toBe("acme-web-prod");
    expect(containerSlug("sst.acme.com", "GTM-AAA")).toBe("sst-acme-com");
    expect(containerSlug("  --Acme--  ", "GTM-AAA")).toBe("acme");
  });

  it("falls back to the lowercased public id when the name yields nothing", () => {
    expect(containerSlug("", "GTM-AAA")).toBe("gtm-aaa");
    expect(containerSlug("()", "GTM-AAA")).toBe("gtm-aaa");
  });
});

function fake() {
  const { service, state } = createFakeService({
    accounts: [{ accountId: "1", name: "Acme" }],
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
      { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
    ],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

/** A workspace with a constant, a trigger and a tag that fires on it, versioned. Returns the version id. */
async function seedLeadVersion(
  client: GtmClient,
  state: FakeState,
  path = containerPath,
  extraTagParameter: tagmanager_v2.Schema$Parameter[] = []
): Promise<string> {
  const ws = client.service.accounts.containers.workspaces;
  const created = await ws.create({ parent: path, requestBody: { name: "seed" } });
  const parent = created.data.path!;
  await ws.variables.create({
    parent,
    requestBody: {
      name: "Const - Ads ID",
      type: "c",
      parameter: [{ type: "template", key: "value", value: "AW-1" }],
    },
  });
  const trigger = await ws.triggers.create({
    parent,
    requestBody: { name: "Custom Event - lead", type: "customEvent" },
  });
  await ws.tags.create({
    parent,
    requestBody: {
      name: "Ads - Lead",
      type: "awct",
      firingTriggerId: [trigger.data.triggerId!],
      parameter: [
        { type: "template", key: "conversionLabel", value: "xyz" },
        { type: "template", key: "conversionId", value: "{{Const - Ads ID}}" },
        ...extraTagParameter,
      ],
    },
  });
  await ws.create_version({ path: parent, requestBody: { name: "lead v1" } });
  return state.versions[state.versions.length - 1].versionId;
}

const tmp = () => mkdtemp(join(tmpdir(), "gtm-pull-"));

describe("pullContainer", () => {
  it("writes spec.json, snapshot.json and container.json", async () => {
    const { client, state } = fake();
    const versionId = await seedLeadVersion(client, state);
    const dir = await tmp();
    const outcome = await pullContainer(client, { container: "GTM-AAA" }, dir);
    expect(outcome.specError).toBeUndefined();
    expect((await readdir(dir)).sort()).toEqual([RECORD_FILE, SNAPSHOT_FILE, SPEC_FILE]);

    const spec = JSON.parse(await readFile(join(dir, SPEC_FILE), "utf-8"));
    expect(spec.tag[0].firingTriggerName).toEqual(["Custom Event - lead"]);
    expect(spec.tag[0].parameter.map((p: { key: string }) => p.key)).toEqual([
      "conversionId",
      "conversionLabel",
    ]);
    expect(spec.tag[0]).not.toHaveProperty("tagId");

    const record = JSON.parse(await readFile(join(dir, RECORD_FILE), "utf-8"));
    expect(record).toEqual({
      publicId: "GTM-AAA",
      name: "a.com",
      containerType: "web",
      accountId: "1",
      containerId: "10",
      source: { container: "GTM-AAA" },
      version: { id: versionId, name: "lead v1" },
      workspace: null,
      environment: null,
    });
    expect(outcome.record).toEqual(record);

    const snapshot = JSON.parse(await readFile(join(dir, SNAPSHOT_FILE), "utf-8"));
    expect(snapshot.tag[0].tagId).toBeDefined();
    expect(Object.keys(snapshot)[0]).toBe("pulledAt");
  });

  it("rewrites spec.json and container.json byte-identical on an unchanged container", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state);
    const a = await tmp();
    const b = await tmp();
    await pullContainer(client, { container: "GTM-AAA" }, a);
    await new Promise((r) => setTimeout(r, 2));
    await pullContainer(client, { container: "GTM-AAA" }, b);
    for (const file of [SPEC_FILE, RECORD_FILE]) {
      expect(await readFile(join(b, file), "utf-8")).toBe(await readFile(join(a, file), "utf-8"));
    }
    const snapA = JSON.parse(await readFile(join(a, SNAPSHOT_FILE), "utf-8"));
    const snapB = JSON.parse(await readFile(join(b, SNAPSHOT_FILE), "utf-8"));
    expect(snapB.pulledAt).not.toBe(snapA.pulledAt);
    delete snapA.pulledAt;
    delete snapB.pulledAt;
    expect(snapB).toEqual(snapA);
  });

  it("records the workspace read and the version it branched from", async () => {
    const { client, state } = fake();
    const versionId = await seedLeadVersion(client, state);
    await client.service.accounts.containers.workspaces.create({
      parent: containerPath,
      requestBody: { name: "wip" },
    });
    const dir = await tmp();
    const { record } = await pullContainer(client, { container: "GTM-AAA", workspace: "wip" }, dir);
    expect(record.source).toEqual({ container: "GTM-AAA", workspace: "wip" });
    expect(record.workspace).toBe("wip");
    expect(record.version?.id).toBe(versionId);
  });

  it("keeps an earlier spec.json when the spec cannot be normalized", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state);
    const dir = await tmp();
    await pullContainer(client, { container: "GTM-AAA" }, dir);
    const good = await readFile(join(dir, SPEC_FILE), "utf-8");

    // A trigger group parameter makes normalizeExport throw.
    await seedLeadVersion(client, state, containerPath, [
      { type: "TRIGGER_REFERENCE", key: "triggerGroup", value: "1" },
    ]);
    const outcome = await pullContainer(client, { container: "GTM-AAA" }, dir);
    expect(outcome.specError).toMatch(/trigger group/i);
    expect(await readFile(join(dir, SPEC_FILE), "utf-8")).toBe(good);
    const snapshot = JSON.parse(await readFile(join(dir, SNAPSHOT_FILE), "utf-8"));
    expect(snapshot.tag).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/pull-dir.test.ts`
Expected: FAIL with "Cannot find module '../src/snapshot/dir.js'".

- [ ] **Step 3: Implement**

Create `packages/gtm-apply/src/snapshot/dir.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { stringifySpec } from "../spec/canonical.js";
import { stringifySnapshot } from "./canonical.js";
import { pullSnapshot, snapshotToSpec } from "./pull.js";
import type { ApiSnapshotData, ContainerType, SnapshotSource } from "./types.js";

/**
 * A container directory, as an account repo commits it (decision-11):
 * spec.json is the apply-able part in canonical form and the authority for
 * what it declares; snapshot.json is everything the API exposes, an audit
 * record; container.json is identity plus what was read, with no timestamp,
 * so an unchanged container rewrites it byte for byte.
 */
export const SPEC_FILE = "spec.json";
export const SNAPSHOT_FILE = "snapshot.json";
export const RECORD_FILE = "container.json";

/**
 * The default directory name for a container: its name lowercased, every run
 * of characters outside a-z0-9 replaced by one dash, dashes trimmed, and the
 * lowercased public id when nothing is left. Directories are named for people,
 * so "acme.com" becomes "acme-com" and never "GTM-ABC1234".
 */
export function containerSlug(name: string, publicId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : publicId.toLowerCase();
}

export interface ContainerRecord {
  publicId: string;
  name: string;
  containerType: ContainerType;
  accountId: string;
  containerId: string;
  /** What was read. */
  source: SnapshotSource;
  /** The version read, or the one a workspace branched from. */
  version: { id: string; name: string | null } | null;
  /** The workspace read, when the source names one. */
  workspace: string | null;
  /** Name of the environment serving the version read, when known. */
  environment: string | null;
}

export interface PullOutcome {
  dir: string;
  record: ContainerRecord;
  /** Set when snapshot.json and container.json were written but the spec could not be normalized. */
  specError?: string;
}

export function containerRecord(snapshot: ApiSnapshotData): ContainerRecord {
  const header = snapshot.containerVersionHeader;
  return {
    publicId: snapshot.container.publicId ?? snapshot.source.container,
    name: snapshot.container.name ?? "",
    containerType: snapshot.containerType,
    accountId: snapshot.container.accountId ?? "",
    containerId: snapshot.container.containerId ?? "",
    source: snapshot.source,
    version: header?.containerVersionId
      ? { id: header.containerVersionId, name: header.name ?? null }
      : null,
    workspace: snapshot.workspace?.name ?? null,
    environment: snapshot.environment?.name ?? null,
  };
}

/**
 * Write the three files. snapshot.json and container.json are always
 * written; spec.json only when the snapshot normalizes, so an earlier spec
 * survives a container that gained something the normalizer rejects.
 */
export async function writeContainerDir(
  snapshot: ApiSnapshotData,
  dir: string
): Promise<PullOutcome> {
  await mkdir(dir, { recursive: true });
  const record = containerRecord(snapshot);
  await writeFile(join(dir, SNAPSHOT_FILE), stringifySnapshot(snapshot));
  await writeFile(join(dir, RECORD_FILE), JSON.stringify(record, null, 2) + "\n");
  let specText: string;
  try {
    specText = stringifySpec(snapshotToSpec(snapshot));
  } catch (err) {
    return { dir, record, specError: err instanceof Error ? err.message : String(err) };
  }
  await writeFile(join(dir, SPEC_FILE), specText);
  return { dir, record };
}

/** Pull one container and write its directory. */
export async function pullContainer(
  client: GtmClient,
  source: SnapshotSource,
  dir: string
): Promise<PullOutcome> {
  return writeContainerDir(await pullSnapshot(client, source), dir);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/pull-dir.test.ts`
Expected: PASS. If the `environment` expectation fails because the fake links no environment, keep `null`: TASK-18 changes how it is resolved and will update this test.

- [ ] **Step 5: Export and commit**

Add to `packages/gtm-apply/src/index.ts` after the `pullSnapshots, snapshotAccount` export:

```ts
export {
  SPEC_FILE,
  SNAPSHOT_FILE,
  RECORD_FILE,
  containerSlug,
  containerRecord,
  writeContainerDir,
  pullContainer,
} from "./snapshot/dir.js";
export type { ContainerRecord, PullOutcome } from "./snapshot/dir.js";
```

```bash
git add packages/gtm-apply/src/snapshot/dir.ts packages/gtm-apply/src/index.ts packages/gtm-apply/test/pull-dir.test.ts
git commit -m "feat(snapshot): write a container directory with a canonical spec, snapshot and record (TASK-35)"
```

---

### Task 9: `pullAccount` with partial failures

**Files:**
- Modify: `packages/gtm-apply/src/snapshot/dir.ts`
- Test: `packages/gtm-apply/test/pull-dir.test.ts` (append)

**Interfaces:**
- Consumes: `listContainers`, `pullContainer`, `containerSlug`.
- Produces:
  - `interface PullAccountOptions { filter?: (ref: ContainerRef) => boolean; dirFor?: (ref: ContainerRef) => string }`.
  - `interface PullAccountResult { outcomes: PullOutcome[]; failures: { publicId: string; error: string }[] }`.
  - `pullAccount(client, accountId, outDir, options?): Promise<PullAccountResult>`; one subdirectory per container named by `dirFor(ref)` when given, else `containerSlug(ref.name, ref.publicId)` with the lowercased public id appended when two containers in the same pull would share a slug; a container whose pull throws lands in `failures` and blocks nothing else.

- [ ] **Step 1: Write the failing tests**

Append to `packages/gtm-apply/test/pull-dir.test.ts` (add `pullAccount` to the import):

```ts
describe("pullAccount", () => {
  it("writes one directory per container, named by the container's slug", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    await seedLeadVersion(client, state, "accounts/1/containers/11");
    const root = await tmp();
    const result = await pullAccount(client, "1", root);
    expect(result.failures).toEqual([]);
    expect(result.outcomes.map((o) => o.record.publicId)).toEqual(["GTM-AAA", "GTM-BBB"]);
    expect(result.outcomes.map((o) => o.dir)).toEqual([join(root, "a-com"), join(root, "b-com")]);
    expect((await readdir(root)).sort()).toEqual(["a-com", "b-com"]);
    expect((await readdir(join(root, "b-com"))).sort()).toEqual([RECORD_FILE, SNAPSHOT_FILE, SPEC_FILE]);
  });

  it("reports a container that cannot be pulled and still writes the others", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    // GTM-BBB has no versions, so pullSnapshot throws for it.
    const root = await tmp();
    const result = await pullAccount(client, "1", root);
    expect(result.outcomes.map((o) => o.record.publicId)).toEqual(["GTM-AAA"]);
    expect(result.failures).toEqual([{ publicId: "GTM-BBB", error: expect.stringMatching(/no versions/) }]);
    expect(await readdir(root)).toEqual(["a-com"]);
  });

  it("honours a filter and a custom directory mapping", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    await seedLeadVersion(client, state, "accounts/1/containers/11");
    const root = await tmp();
    const result = await pullAccount(client, "1", root, {
      filter: (r) => r.publicId === "GTM-BBB",
      dirFor: (r) => `prod-${r.containerId}`,
    });
    expect(result.outcomes.map((o) => o.record.publicId)).toEqual(["GTM-BBB"]);
    expect(await readdir(root)).toEqual(["prod-11"]);
  });

  it("appends the public id when two containers share a slug", async () => {
    const { service, state } = createFakeService({
      accounts: [{ accountId: "1", name: "Acme" }],
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "Acme" },
        { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "acme" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    await seedLeadVersion(client, state, "accounts/1/containers/11");
    const root = await tmp();
    await pullAccount(client, "1", root);
    expect((await readdir(root)).sort()).toEqual(["acme-gtm-aaa", "acme-gtm-bbb"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/pull-dir.test.ts`
Expected: FAIL, `pullAccount` is not exported.

- [ ] **Step 3: Implement**

Append to `packages/gtm-apply/src/snapshot/dir.ts` (add `import { listContainers, type ContainerRef } from "@anthnyalxndr/gtm-client";` at the top):

```ts
export interface PullAccountOptions {
  /** Keep only the containers this returns true for; default every container in the account. */
  filter?: (ref: ContainerRef) => boolean;
  /** Directory name under outDir for a container; default containerSlug, de-duplicated. */
  dirFor?: (ref: ContainerRef) => string;
}

export interface PullAccountResult {
  /** Containers whose directory was written, in the account's listing order. */
  outcomes: PullOutcome[];
  /** Containers whose pull threw before anything was written. */
  failures: { publicId: string; error: string }[];
}

/** Default directory names: the slug, with the public id appended wherever two refs would share one. */
function defaultDirs(refs: readonly ContainerRef[]): string[] {
  const slugs = refs.map((ref) => containerSlug(ref.name, ref.publicId));
  const counts = new Map<string, number>();
  for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  return slugs.map((slug, i) =>
    (counts.get(slug) ?? 0) > 1 ? `${slug}-${refs[i].publicId.toLowerCase()}` : slug
  );
}

/**
 * Pull every container of an account into `<outDir>/<slug>/`. A container
 * that cannot be pulled (no versions yet, a permission error) is reported and
 * does not stop the others.
 */
export async function pullAccount(
  client: GtmClient,
  accountId: string,
  outDir: string,
  options: PullAccountOptions = {}
): Promise<PullAccountResult> {
  const refs = (await listContainers(client, accountId)).filter(options.filter ?? (() => true));
  const dirs = options.dirFor ? refs.map(options.dirFor) : defaultDirs(refs);
  const settled = await Promise.allSettled(
    refs.map((ref, i) => pullContainer(client, { container: ref.publicId }, join(outDir, dirs[i])))
  );
  const result: PullAccountResult = { outcomes: [], failures: [] };
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      result.outcomes.push(s.value);
      return;
    }
    const error = s.reason instanceof Error ? s.reason.message : String(s.reason);
    result.failures.push({ publicId: refs[i].publicId, error });
  });
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/pull-dir.test.ts`
Expected: PASS.

- [ ] **Step 5: Export and commit**

Add `pullAccount` to the value export from `./snapshot/dir.js` in `packages/gtm-apply/src/index.ts`, and `PullAccountOptions, PullAccountResult` to the type export.

```bash
git add packages/gtm-apply/src/snapshot/dir.ts packages/gtm-apply/src/index.ts packages/gtm-apply/test/pull-dir.test.ts
git commit -m "feat(snapshot): pull every container of an account into directories, reporting failures (TASK-35)"
```

---

### Task 10: The `pull` CLI command

**Files:**
- Modify: `packages/gtm-apply/src/cli.ts`
- Test: `packages/gtm-apply/test/cli.test.ts`

**Interfaces:**
- Consumes: `pullContainer`, `pullAccount`, `sourceFromArgs`.
- Produces: `gtm-apply pull --container GTM-X --out <dir> [--live | --version <id> | --workspace <name>]` and `gtm-apply pull --account <id> --out <dir>`. Exit 0 when every container wrote all three files; 1 when any pull failed or any spec could not be normalized, after every container was attempted.

- [ ] **Step 1: Write the failing tests**

Add to `describe("parseCliArgs", …)` in `packages/gtm-apply/test/cli.test.ts`:

```ts
  it("accepts pull", () => {
    expect(parseCliArgs(["pull", "--account", "1", "--out", "gtm/containers"])).toMatchObject({
      command: "pull",
      account: "1",
      out: "gtm/containers",
    });
  });
```

Add to `describe("runCli", …)`:

```ts
  it("pull --container writes the directory and exits 0", async () => {
    const { client, state } = fresh();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["pull", "--container", "GTM-ABC123", "--out", dir]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect((await readdir(dir)).sort()).toEqual(["container.json", "snapshot.json", "spec.json"]);
    expect(lines).toEqual([`GTM-ABC123: wrote ${dir}`]);
  });

  it("pull --account writes every container and exits 1 when one fails", async () => {
    const { service, state } = createFakeService({
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
        { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    const root = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["pull", "--account", "1", "--out", root]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(1);
    expect(await readdir(root)).toEqual(["a-com"]);
    expect(lines[0]).toBe(`GTM-AAA: wrote ${join(root, "a-com")}`);
    expect(lines[1]).toMatch(/^GTM-BBB: pull failed: .*no versions/);
  });

  it("pull refuses without --out or without a target", async () => {
    const { client } = fresh();
    await expect(runCli(parseCliArgs(["pull", "--container", "GTM-ABC123"]), client)).rejects.toThrow(
      /--out/
    );
    await expect(runCli(parseCliArgs(["pull", "--out", "x"]), client)).rejects.toThrow(
      /--container or --account/
    );
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/cli.test.ts`
Expected: FAIL, `parseCliArgs(["pull", …])` throws the usage error.

- [ ] **Step 3: Implement**

In `packages/gtm-apply/src/cli.ts`:

```ts
import { pullAccount, pullContainer } from "./snapshot/dir.js";
```

Change `CliCommand` and the command check:

```ts
export type CliCommand = "apply" | "normalize" | "export" | "snapshot" | "pull";
```

```ts
  if (!["apply", "normalize", "export", "snapshot", "pull"].includes(command)) {
```

Add to `USAGE` after the snapshot lines:

```
  gtm-apply pull --container GTM-XXXXXXX --out <dir> [--live | --version <id> | --workspace <name>]
      (writes <dir>/spec.json, snapshot.json and container.json)
  gtm-apply pull --account <id> --out <dir>
      (one <dir>/<slug>/ per container, slug from the container name; exits 1 if any container failed, after trying them all)
```

Add the case before `apply`:

```ts
    case "pull": {
      if (!args.out) throw new Error(`pull needs --out <dir>.\n${USAGE}`);
      if (!args.account && !args.container) {
        throw new Error(`pull needs --container or --account.\n${USAGE}`);
      }
      await client.init();
      if (args.account) {
        const result = await pullAccount(client, args.account, args.out);
        let failed = result.failures.length;
        for (const o of result.outcomes) {
          out(`${o.record.publicId}: wrote ${o.dir}${o.specError ? ` (no spec: ${o.specError})` : ""}`);
          if (o.specError) failed++;
        }
        for (const f of result.failures) out(`${f.publicId}: pull failed: ${f.error}`);
        return failed > 0 ? 1 : 0;
      }
      const outcome = await pullContainer(client, sourceFromArgs(args, args.container!), args.out);
      out(`${outcome.record.publicId}: wrote ${outcome.dir}`);
      if (outcome.specError) {
        out(`[!] no spec written: ${outcome.specError}`);
        return 1;
      }
      return 0;
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec vitest run test/cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/gtm-apply/src/cli.ts packages/gtm-apply/test/cli.test.ts
git commit -m "feat(cli): pull a container or an account into committed directories (TASK-35)"
```

---

### Task 11: Documentation, the live probe, and task finalization

**Files:**
- Modify: `packages/gtm-apply/README.md` (after the "Snapshots" section, before "Container types")
- Backlog: TASK-34, TASK-19, TASK-35 via the CLI

- [ ] **Step 1: Document canonical form and pull**

Insert after the `### Snapshots` section's last paragraph in `packages/gtm-apply/README.md`:

````markdown
### Canonical form

`normalize`, `export`, `snapshot` and `pull` write canonical text: sections in a fixed order, entities sorted by name, `firingTriggerName`, `blockingTriggerName` and `builtInVariable` sorted, `parameter` and `map` arrays sorted by key, object keys written `name`, `type`, `parentFolderName`, `notes` first and the rest alphabetically, two-space JSON with a trailing newline. A `list` parameter keeps its item order, because there order is meaning. The same content always produces the same bytes, so a committed spec diffs only when the container changed. From code, `stringifySpec(spec)` and `stringifySnapshot(snapshot)` do the same; `normalizeExport` and `GtmSnapshot` keep the order the API returned, so `select()` still returns entities in library order.

The planner compares an array of uniquely keyed items (parameters, map entries) by key, so a canonical spec reconciles against a container whose parameters are stored in another order without planning an update.

### Pull: a container as a directory

```bash
gtm-apply pull --container GTM-XXXXXXX --out gtm/containers/acme-com
gtm-apply pull --account 6012345678 --out gtm/containers        # one <slug>/ per container
gtm-apply snapshot --account 6012345678 --out snapshots         # one <publicId>.json per container
```

With `--account`, each container's directory is named by a slug of its name (`acme.com` becomes `acme-com`; the lowercased public id is appended when two containers share a slug, or used alone when the name is empty), because directories are for people and a public id tells a reviewer nothing. `containerSlug(name, publicId)` computes it, and `pullAccount` takes a `dirFor` option for a repo that keeps its own mapping.

`pull` writes three files: `spec.json`, the apply-able part in canonical form; `snapshot.json`, everything the API exposes; and `container.json`, the container's identity and what was read (the version id and name, the workspace, the serving environment) with no timestamp, so an unchanged container rewrites it byte for byte. A container whose spec cannot be normalized (a trigger group, a custom template tag until templates are supported) still gets the other two files, an existing `spec.json` is left alone, and the command exits 1 after every container was attempted. From code: `pullContainer(client, source, dir)`, `pullAccount(client, accountId, outDir, { filter })`, `pullSnapshots(client, sources)`, `snapshotAccount(client, accountId)` and `gtm.snapshotAccount(accountId)`.
````

- [ ] **Step 2: Run the whole verify gate**

Run: `pnpm verify`
Expected: build, typecheck and tests pass for all three packages. Fix any prettier complaint with `pnpm format`.

- [ ] **Step 3: Probe parameter order against a live container**

With a token in `~/.config/gtm-apply`, write `packages/gtm-apply/scripts/probe-parameter-order.ts` (throwaway; the scratchpad path is denied for Bash):

```ts
import { GtmClient, resolveContainer } from "@anthnyalxndr/gtm-client";

const client = new GtmClient();
await client.init();
const ref = await resolveContainer(client, process.env.GTM_PROBE ?? "GTM-WNX8FFXW");
const ws = client.service.accounts.containers.workspaces;
const list = await client.call(() => ws.list({ parent: ref.path }));
let parent = (list.data.workspace ?? []).find((w) => w.name === "probe-order")?.path;
if (!parent) {
  const created = await client.call(() => ws.create({ parent: ref.path, requestBody: { name: "probe-order" } }));
  parent = created.data.path!;
}
const sent = [
  { type: "template", key: "zeta", value: "1" },
  { type: "template", key: "alpha", value: "2" },
];
const tag = await client.call(() =>
  ws.tags.create({ parent, requestBody: { name: "Probe - parameter order", type: "html", parameter: [{ type: "template", key: "html", value: "<span></span>" }, ...sent] } })
);
const back = await client.call(() => ws.tags.get({ path: tag.data.path! }));
console.log("sent   ", sent.map((p) => p.key).join(","));
console.log("stored ", (back.data.parameter ?? []).map((p) => p.key).join(","));
await client.call(() => ws.tags.delete({ path: tag.data.path! }));
```

Run: `pnpm --filter @anthnyalxndr/gtm-apply exec tsx scripts/probe-parameter-order.ts`
Record the two printed lines in TASK-34's notes. Delete the script afterwards; do not commit it.

- [ ] **Step 4: Finalize the backlog tasks**

```bash
backlog task edit TASK-34 -s "Review" --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 --check-ac 5 \
  --append-notes "Live probe (<date>, <container>): sent <keys>, stored <keys>." \
  --final-summary "canonicalSpec/stringifySpec and canonicalSnapshot/stringifySnapshot; normalize, export, snapshot and pull print canonical text; matches compares keyed arrays by key."
backlog task edit TASK-19 -s "Review" --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 --check-ac 5 --check-ac 6 --check-ac 7 \
  --final-summary "listContainers in gtm-client; pullSnapshots, snapshotAccount and Gtm.snapshotAccount; snapshot --account / repeated --container with --out."
backlog task edit TASK-35 -s "Review" --check-ac 1 --check-ac 2 --check-ac 3 --check-ac 4 --check-ac 5 \
  --final-summary "pullContainer, pullAccount and the pull command write spec.json, snapshot.json and container.json per container with partial-failure reporting."
```

- [ ] **Step 5: Commit and open the pull requests**

```bash
git add packages/gtm-apply/README.md backlog/tasks
git commit -m "docs(gtm-apply): canonical form and pull directories (TASK-34, TASK-19, TASK-35)"
```

Open three draft PRs, one per branch, each based on `main`, and hand the user the merge order: TASK-34 first, then TASK-19, then TASK-35. Never merge.
