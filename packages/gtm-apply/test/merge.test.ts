import { describe, it, expect } from "vitest";
import { mergeSpecs } from "../src/spec/merge.js";
import type { ContainerSpec } from "../src/spec/types.js";

describe("mergeSpecs", () => {
  it("dedupes identical entities and unions built-ins", () => {
    const a: ContainerSpec = {
      trigger: [{ name: "T", type: "pageview" }],
      builtInVariable: ["pagePath"],
    };
    const b: ContainerSpec = {
      trigger: [{ name: "T", type: "pageview" }],
      builtInVariable: ["formId"],
    };
    const merged = mergeSpecs(a, b);
    expect(merged.trigger).toHaveLength(1);
    expect(merged.builtInVariable).toEqual(["pagePath", "formId"]);
  });

  it("throws on conflicting definitions and container types", () => {
    expect(() =>
      mergeSpecs(
        { trigger: [{ name: "T", type: "pageview" }] },
        { trigger: [{ name: "T", type: "click" }] }
      )
    ).toThrow(/Conflicting definitions for trigger "T"/);
    expect(() => mergeSpecs({ containerType: "web" }, { containerType: "server" })).toThrow(
      /Cannot merge a server spec into a web spec/
    );
    expect(
      mergeSpecs({ containerType: "server", client: [{ name: "C", type: "x" }] }).client
    ).toEqual([{ name: "C", type: "x" }]);
  });
});
