import { describe, it, expect } from "vitest";
import { canonicalSpec, canonicalValue, stringifySpec } from "../src/spec/canonical.js";
import { stringifySnapshot } from "../src/snapshot/canonical.js";
import type { ApiSnapshotData } from "../src/snapshot/types.js";
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
      {
        type: "map",
        map: [
          { key: "value", value: "2" },
          { key: "name", value: "b" },
        ],
      },
      {
        type: "map",
        map: [
          { key: "value", value: "1" },
          { key: "name", value: "a" },
        ],
      },
    ];
    const out = canonicalValue({ type: "list", key: "eventSettingsTable", list }) as {
      list: { map: { key: string }[] }[];
    };
    expect(out.list.map((m) => m.map[0].key)).toEqual(["name", "name"]);
    expect(out.list.map((m) => m.map[1].key)).toEqual(["value", "value"]);
    expect(out.list[0].map[1]).toEqual({ key: "value", value: "2" });
  });

  it("keeps parameter order when keys repeat or are missing", () => {
    const dup = [
      { key: "a", value: "2" },
      { key: "a", value: "1" },
    ];
    expect((canonicalValue({ parameter: dup }) as { parameter: unknown[] }).parameter).toEqual(dup);
    const missing = [
      { type: "template", value: "b" },
      { key: "a", value: "1" },
    ];
    expect((canonicalValue({ parameter: missing }) as { parameter: unknown[] }).parameter).toEqual(
      missing
    );
  });

  it("does not sort arrays that are not name lists or keyed parameters", () => {
    const filters = [{ type: "equals" }, { type: "contains" }];
    const out = canonicalValue({ customEventFilter: filters }) as { customEventFilter: unknown[] };
    expect(out.customEventFilter).toEqual(filters);
  });
});

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
    gtagConfig: [
      { gtagConfigId: "9", type: "googtag" },
      { gtagConfigId: "8", type: "googtag" },
    ],
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
