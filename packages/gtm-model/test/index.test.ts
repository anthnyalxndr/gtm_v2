import { describe, it, expect } from "vitest";
import {
  ALL_SECTIONS,
  BUILT_IN_TRIGGERS,
  BUILT_IN_VARIABLE_TYPES,
  BUILT_IN_VARIABLES,
  builtInTriggerIdForName,
  builtInTypeForName,
  defineContainer,
  DISCOVERY_REVISION,
  SCHEMAS,
  sectionsFor,
  type ContainerSpec,
  type ContainerType,
  type TagSpec,
} from "../src/index.js";

describe("gtm-model", () => {
  it("exports the spec types and defineContainer", () => {
    const tag: TagSpec = { name: "T", type: "html", firingTriggerName: ["All Pages"] };
    const spec: ContainerSpec = defineContainer({ containerType: "web", tag: [tag] });
    expect(spec.tag?.[0].name).toBe("T");
  });

  it("exports the container types and the sections each can hold", () => {
    const types: ContainerType[] = ["web", "server", "amp", "android", "ios"];
    for (const t of types) expect(sectionsFor(t).length).toBeGreaterThan(0);
    expect(sectionsFor("server")).toContain("client");
    expect(sectionsFor("web")).not.toContain("client");
    expect(sectionsFor(undefined)).toEqual(ALL_SECTIONS);
  });

  it("exports the built-in catalog", () => {
    expect(builtInTypeForName("Page URL")).toBe("pageUrl");
    expect(BUILT_IN_VARIABLES["Client Name"]).toBe("clientName");
    expect(builtInTriggerIdForName("All Pages")).toBe(BUILT_IN_TRIGGERS["All Pages"]);
  });

  it("exports the generated Discovery types and schema table", () => {
    expect(DISCOVERY_REVISION).toMatch(/^\d{8}$/);
    expect(BUILT_IN_VARIABLE_TYPES).toContain("pageUrl");
    expect(Object.keys(SCHEMAS)).toContain("Tag");
  });
});
