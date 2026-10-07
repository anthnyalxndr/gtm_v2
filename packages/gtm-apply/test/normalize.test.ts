import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { normalizeExport, NormalizeError } from "../src/spec/normalize.js";

const fixture = () =>
  JSON.parse(readFileSync(new URL("./fixtures/ui-export.json", import.meta.url), "utf-8"));

describe("normalizeExport", () => {
  it("normalizes a UI export into a ContainerSpec", () => {
    const spec = normalizeExport(fixture());
    expect(spec.folder).toEqual([{ name: "Conversions" }]);
    expect(spec.builtInVariable).toEqual(["pagePath", "formId"]);

    const adsId = spec.variable?.[0];
    expect(adsId).toEqual({
      name: "Const - Google Ads Conversion ID",
      type: "c",
      parameter: [{ type: "template", key: "value", value: "AW-123" }],
      parentFolderName: "Conversions",
    });

    const trigger = spec.trigger?.[0];
    expect(trigger?.type).toBe("customEvent");
    expect(trigger?.customEventFilter?.[0]?.type).toBe("equals");
    expect(trigger?.customEventFilter?.[0]?.parameter?.[0]?.type).toBe("template");
    expect(spec.trigger?.[1]?.type).toBe("formSubmission");
    expect(spec.trigger?.[1]?.waitForTags).toEqual({ type: "boolean", value: "false" });

    const tag = spec.tag?.[0];
    expect(tag).toMatchObject({
      name: "Ads - Lead",
      type: "awct",
      firingTriggerName: ["Custom Event - lead", "Form Submit - contact"],
      parentFolderName: "Conversions",
      tagFiringOption: "oncePerEvent",
      monitoringMetadata: { type: "map" },
      consentSettings: { consentStatus: "notSet" },
    });
    expect(tag).not.toHaveProperty("firingTriggerId");
    expect(tag).not.toHaveProperty("tagId");
    expect(tag).not.toHaveProperty("fingerprint");
    expect(tag).not.toHaveProperty("accountId");
  });

  it("never re-cases parameter values", () => {
    const spec = normalizeExport(fixture());
    expect(spec.variable?.[1]?.parameter?.[0]?.value).toBe("KEEP_UPPER_CASE");
  });

  it("accepts a bare container version and is idempotent", () => {
    const bare = fixture().containerVersion;
    const once = normalizeExport(bare);
    const twice = normalizeExport(once);
    expect(twice).toEqual(once);
  });

  it("rejects custom template tags", () => {
    const data = fixture();
    data.containerVersion.tag[0].type = "cvt_10_42";
    expect(() => normalizeExport(data)).toThrow(NormalizeError);
    expect(() => normalizeExport(data)).toThrow(/custom template/);
  });

  it("rejects unknown trigger ids", () => {
    const data = fixture();
    data.containerVersion.tag[0].firingTriggerId = ["999"];
    expect(() => normalizeExport(data)).toThrow(/Unknown trigger id 999/);
  });

  it("rejects trigger group references", () => {
    const data = fixture();
    data.containerVersion.tag[0].parameter.push({
      type: "TRIGGER_REFERENCE",
      key: "x",
      value: "12",
    });
    expect(() => normalizeExport(data)).toThrow(/trigger group/);
  });

  it("rejects non-objects", () => {
    expect(() => normalizeExport("nope")).toThrow(NormalizeError);
  });
});

describe("built-in triggers", () => {
  it("names the built-in trigger ids Tag Manager never lists as trigger resources", () => {
    const data = fixture();
    data.containerVersion.tag[0].firingTriggerId = ["2147479573", "12"];
    data.containerVersion.tag[0].blockingTriggerId = ["2147479553", "2147479572"];
    const spec = normalizeExport(data);
    expect(spec.tag?.[0]?.firingTriggerName).toEqual([
      "Initialization - All Pages",
      "Custom Event - lead",
    ]);
    expect(spec.tag?.[0]?.blockingTriggerName).toEqual([
      "All Pages",
      "Consent Initialization - All Pages",
    ]);
  });
});
