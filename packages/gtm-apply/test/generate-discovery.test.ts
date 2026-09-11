import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  enumConstName,
  enumTypeName,
  generate,
  OUTPUT_PATH,
  ROOTS,
  SCHEMAS_PATH,
  trimDiscovery,
  type TrimmedDiscovery,
} from "../scripts/generate-discovery.js";
import {
  BUILT_IN_VARIABLE_TYPES,
  CONDITION_TYPES,
  DISCOVERY_REVISION,
  PARAMETER_TYPES,
  SCHEMAS,
  TAG_FIRING_OPTIONS,
  TRIGGER_TYPES,
} from "../src/spec/generated/tagmanager-v2.js";

describe("generate-discovery", () => {
  it("names enums after their schema and property", () => {
    expect(enumTypeName("Trigger", "type")).toBe("TriggerType");
    expect(enumTypeName("Tag", "tagFiringOption")).toBe("TagFiringOption");
    expect(enumConstName("TriggerType")).toBe("TRIGGER_TYPES");
    expect(enumConstName("ConsentStatus")).toBe("CONSENT_STATUSES");
  });

  it("keeps only the schemas reachable from the entity roots", () => {
    const doc = {
      revision: "1",
      version: "v2",
      schemas: {
        ...Object.fromEntries(ROOTS.map((n) => [n, { id: n, properties: {} }])),
        Tag: {
          id: "Tag",
          properties: { setupTag: { type: "array", items: { $ref: "SetupTag" } } },
        },
        SetupTag: { id: "SetupTag", properties: {} },
        Account: { id: "Account", properties: {} },
      },
    };
    expect(Object.keys(trimDiscovery(doc).schemas)).toEqual([...ROOTS, "SetupTag"].sort());
  });

  it("checked-in output matches the committed Discovery schemas", async () => {
    const input = JSON.parse(await readFile(SCHEMAS_PATH, "utf-8")) as TrimmedDiscovery;
    const current = await readFile(OUTPUT_PATH, "utf-8");
    expect(current).toBe(await generate(input));
    expect(DISCOVERY_REVISION).toBe(input.revision);
  });

  it("emits enum unions without the Unspecified sentinels", () => {
    expect(TRIGGER_TYPES).toContain("customEvent");
    expect(TRIGGER_TYPES).not.toContain("eventTypeUnspecified");
    expect(CONDITION_TYPES).toContain("equals");
    expect(PARAMETER_TYPES).toEqual([
      "template",
      "integer",
      "boolean",
      "list",
      "map",
      "triggerReference",
      "tagReference",
    ]);
    expect(TAG_FIRING_OPTIONS).toEqual(["unlimited", "oncePerEvent", "oncePerLoad"]);
    expect(BUILT_IN_VARIABLE_TYPES).toContain("pagePath");
  });

  it("emits a schema table the validator can walk", () => {
    expect(SCHEMAS.Tag.parameter).toEqual({ kind: "ref[]", ref: "Parameter" });
    expect(SCHEMAS.Tag.firingTriggerId).toEqual({ kind: "string[]" });
    expect(SCHEMAS.Trigger.type).toEqual({ kind: "string", enum: TRIGGER_TYPES });
    expect(SCHEMAS.Parameter.list).toEqual({ kind: "ref[]", ref: "Parameter" });
    expect(SCHEMAS.Tag.paused).toEqual({ kind: "boolean" });
  });
});
