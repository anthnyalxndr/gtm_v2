import { describe, it, expect } from "vitest";
import { GtmClient } from "../src/gtm_v2.js";
import { triggerName, triggerRecipeToSpec } from "../src/recipes/triggers.js";
import { ga4Event } from "../src/recipes/ga4.js";
import { googleAdsConversion, ADS_CONVERSION_ID_VARIABLE } from "../src/recipes/googleAds.js";
import { mergeSpecs, compileConversions } from "../src/recipes/compile.js";
import { applyConversions } from "../src/recipes/apply.js";
import type { ConversionRecipe } from "../src/recipes/types.js";
import { createFakeService } from "./helpers/fakeService.js";

describe("trigger recipes", () => {
  it("names are deterministic", () => {
    expect(triggerName({ type: "pageview", pathEquals: "/thanks" })).toBe("Pageview - /thanks");
    expect(triggerName({ type: "formSubmit", formId: "contact" })).toBe("Form Submit - contact");
    expect(triggerName({ type: "customEvent", eventName: "lead" })).toBe("Custom Event - lead");
  });

  it("compiles a pageview trigger filtered on Page Path", () => {
    expect(triggerRecipeToSpec({ type: "pageview", pathEquals: "/thanks" })).toEqual({
      name: "Pageview - /thanks",
      type: "pageview",
      filter: [
        {
          type: "equals",
          parameter: [
            { type: "template", key: "arg0", value: "{{Page Path}}" },
            { type: "template", key: "arg1", value: "/thanks" },
          ],
        },
      ],
    });
  });

  it("compiles form submission and custom event triggers", () => {
    const form = triggerRecipeToSpec({ type: "formSubmit", formId: "contact" });
    expect(form.type).toBe("formSubmission");
    expect(form.filter?.[0]?.parameter?.[0]?.value).toBe("{{Form ID}}");
    const ce = triggerRecipeToSpec({ type: "customEvent", eventName: "lead" });
    expect(ce.type).toBe("customEvent");
    expect(ce.customEventFilter?.[0]?.parameter?.[1]?.value).toBe("lead");
  });
});

describe("conversion recipes", () => {
  it("ga4Event emits a gaawe tag bound by trigger name", () => {
    const spec = ga4Event({
      kind: "ga4-event",
      name: "GA4 - lead",
      event: "generate_lead",
      measurementId: "G-1",
      trigger: { type: "customEvent", eventName: "lead" },
    });
    expect(spec.trigger?.[0]?.name).toBe("Custom Event - lead");
    expect(spec.tag?.[0]).toEqual({
      name: "GA4 - lead",
      type: "gaawe",
      firingTriggerName: ["Custom Event - lead"],
      parameter: [
        { type: "template", key: "eventName", value: "generate_lead" },
        { type: "template", key: "measurementIdOverride", value: "G-1" },
      ],
    });
  });

  it("googleAdsConversion emits a constant and an awct tag referencing it", () => {
    const spec = googleAdsConversion({
      kind: "google-ads",
      name: "Ads - lead",
      conversionId: "AW-1",
      label: "L",
      trigger: { type: "pageview", pathEquals: "/thanks" },
    });
    expect(spec.variable?.[0]).toMatchObject({ name: ADS_CONVERSION_ID_VARIABLE, type: "c" });
    expect(spec.tag?.[0]?.parameter?.[0]?.value).toBe(`{{${ADS_CONVERSION_ID_VARIABLE}}}`);
    expect(spec.tag?.[0]?.firingTriggerName).toEqual(["Pageview - /thanks"]);
  });
});

describe("mergeSpecs", () => {
  it("dedupes identical entities and unions built-ins", () => {
    const a = { trigger: [{ name: "T", type: "pageview" }], builtInVariable: ["pagePath"] };
    const b = { trigger: [{ name: "T", type: "pageview" }], builtInVariable: ["formId"] };
    const merged = mergeSpecs(a, b);
    expect(merged.trigger).toHaveLength(1);
    expect(merged.builtInVariable).toEqual(["pagePath", "formId"]);
  });

  it("throws on conflicting definitions", () => {
    expect(() =>
      mergeSpecs(
        { trigger: [{ name: "T", type: "pageview" }] },
        { trigger: [{ name: "T", type: "click" }] }
      )
    ).toThrow(/Conflicting definitions for trigger "T"/);
  });
});

const conversions: ConversionRecipe[] = [
  {
    kind: "ga4-event",
    name: "GA4 - lead",
    event: "generate_lead",
    measurementId: "G-1",
    trigger: { type: "formSubmit", formId: "contact" },
  },
  {
    kind: "google-ads",
    name: "Ads - lead",
    conversionId: "AW-1",
    label: "L",
    trigger: { type: "formSubmit", formId: "contact" },
  },
];

describe("compileConversions and applyConversions", () => {
  it("shares one trigger between two conversions", () => {
    const spec = compileConversions(conversions);
    expect(spec.trigger).toHaveLength(1);
    expect(spec.tag).toHaveLength(2);
    expect(spec.variable).toHaveLength(1);
  });

  it("applies end to end, idempotently, with inferred built-ins", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const base = { container: "GTM-ABC123", workspace: "conv", conversions };

    const first = await applyConversions(client, base);
    expect(first.plan.errors).toEqual([]);
    expect(state.builtIns.map((b) => b.type)).toEqual(["formId"]);
    expect(state.triggers.map((t) => t.name)).toEqual(["Form Submit - contact"]);
    expect(state.tags.map((t) => t.name)).toEqual(["GA4 - lead", "Ads - lead"]);
    expect(state.tags[1].firingTriggerId).toEqual([state.triggers[0].triggerId]);

    const second = await applyConversions(client, base);
    expect(
      second.result?.ops.filter((o) => o.kind === "tag").every((o) => o.action === "unchanged")
    ).toBe(true);
    expect(state.tags).toHaveLength(2);

    const dry = await applyConversions(client, { ...base, dryRun: true });
    expect(dry.result).toBeUndefined();
  });
});
