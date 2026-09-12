import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { applyPlan, compilePlan, defineTrackingPlan, GtmSnapshot } from "@anthnyalxndr/gtm-apply";
import { data, library } from "../src/index.js";
import plan from "../plan.example.js";

const RECIPES = [
  "google_tag",
  "contact_form_submit",
  "call_click",
  "email_click",
  "maps_click",
] as const;

describe("gtm-web-recipes", () => {
  it("ships the lead-gen recipe set with typed constants and a clean lint", () => {
    expect(library.recipeNames).toEqual([...RECIPES]);
    expect(library.constantNames).toEqual([
      "Const - GA4 Measurement ID",
      "Const - Google Ads Conversion ID",
      "Const - Google Ads - contact_form_submit Conversion Label",
      "Const - Google Ads - call_click Conversion Label",
      "Const - Google Ads - email_click Conversion Label",
      "Const - Google Ads - maps_click Conversion Label",
    ]);
    expect(library.encoding.name).toBe("notes");
    expect(library.lint()).toEqual([]);
    expect(GtmSnapshot.fromData(data).recipes).toEqual(library.recipes);
    for (const name of RECIPES) expect(library.recipe(name)?.description).toBeTruthy();
  });

  it("declares recipes and placeholders in notes trailers, indexed on the snapshot", () => {
    expect(library.metadataOf({ kind: "tag", name: "Google Tag" })?.recipes).toEqual([
      "google_tag",
    ]);
    expect(library.metadataOf({ kind: "tag", name: "GA4 - call_click" })?.recipes).toEqual([
      "call_click",
    ]);
    expect(
      library.metadataOf({ kind: "variable", name: "Const - GA4 Measurement ID" })?.placeholder
    ).toEqual({ kind: "ga4MeasurementId", example: "G-ABC123DEF4", pattern: "^G-[A-Z0-9]+$" });
    // The bare-id gotcha is documented on the constant itself, pattern included.
    expect(
      library.metadataOf({ kind: "variable", name: "Const - Google Ads Conversion ID" })
        ?.placeholder
    ).toEqual({ kind: "adsConversionId", example: "123456789", pattern: "^[0-9]+$" });
  });

  it("gives every conversion recipe a GA4 tag, an Ads tag, one trigger and its dependency", () => {
    for (const name of RECIPES.slice(1)) {
      const recipe = library.recipe(name)!;
      expect(recipe.roots.map((r) => r.name)).toEqual([`GA4 - ${name}`, `Ads - ${name}`]);
      expect(recipe.entities.filter((r) => r.kind === "trigger")).toHaveLength(1);
      expect(recipe.dependencies.map((d) => `${d.platform}.${d.resource}`)).toEqual([
        "googleAds.conversionAction",
      ]);
      expect(recipe.dependencies[0].constant).toBe(`Const - Google Ads - ${name} Conversion Label`);
      expect(library.externalNameOf(name, recipe.dependencies[0])).toBe(`GTM - ${name}`);
    }
    expect(library.tags.get("Ads - call_click")?.parameter).toContainEqual({
      type: "boolean",
      key: "enableConversionLinker",
      value: "true",
    });
  });

  it("fires the Google tag on the built-in Initialization trigger and has no Conversion Linker", () => {
    const tag = library.tags.get("Google Tag")!;
    expect(tag.type).toBe("googtag");
    expect(tag.firingTriggerName).toEqual(["Initialization - All Pages"]);
    expect(tag.notes).toContain("support.google.com/tagmanager/answer/7549390");
    expect([...library.tags.values()].some((t) => t.type === "gclidw")).toBe(false);
    expect(library.recipe("google_tag")?.entities.map((r) => r.name)).toEqual([
      "Google Tag",
      "Initialization - All Pages",
      "Const - GA4 Measurement ID",
    ]);
  });

  it("type-checks plans against the library by recipe and constant name", () => {
    defineTrackingPlan(library, { recipes: ["email_click"] });
    // @ts-expect-error not a recipe of this library
    defineTrackingPlan(library, { recipes: ["purchase"] });
    // @ts-expect-error not a constant of this library
    defineTrackingPlan(library, { recipes: ["email_click"], constants: { "Const - Nope": "x" } });
    expect(compilePlan(library, plan).issues).toEqual([]);
    // A constant left at its placeholder is reported before any API call.
    const unfilled = compilePlan(library, defineTrackingPlan(library, { recipes: ["call_click"] }));
    expect(unfilled.issues.length).toBeGreaterThan(0);
  });

  it("applies the example plan to a customer container, stripping trailers from notes", async () => {
    const { service, state } = createFakeService({
      containers: [
        { accountId: "1", containerId: "11", publicId: "GTM-CUST", name: "customer.com" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const outcome = await applyPlan(client, {
      library,
      plan,
      container: "GTM-CUST",
      workspace: "onboarding",
    });
    expect(outcome.plan.errors).toEqual([]);
    expect(outcome.warnings).toEqual([]);
    const snap = latestSnapshot(state);
    expect(snap.tag.map((t) => t.name).sort()).toEqual([
      "Ads - call_click",
      "Ads - contact_form_submit",
      "GA4 - call_click",
      "GA4 - contact_form_submit",
      "Google Tag",
    ]);
    expect(snap.trigger.map((t) => t.name).sort()).toEqual([
      "Click - call",
      "Custom Event - contact_form_submit",
    ]);
    expect(snap.tag.find((t) => t.name === "Google Tag")?.firingTriggerId).toEqual(["2147479573"]);
    expect([...snap.builtIns].sort()).toEqual(["clickText", "clickUrl", "pageUrl"]);
    expect(snap.variable.find((v) => v.name === "Const - GA4 Measurement ID")?.parameter).toEqual([
      { type: "template", key: "value", value: "G-ABC1234567" },
    ]);
    expect(snap.variable.map((v) => v.name)).not.toContain("Library - Manifest");
    // The customer keeps the prose notes but never the library's JSON trailer.
    expect(snap.tag.find((t) => t.name === "GA4 - call_click")?.notes).toBe(
      "Sends the call_click event to GA4."
    );
    expect(
      [...snap.tag, ...snap.trigger, ...snap.variable].every((e) => !e.notes?.includes("---"))
    ).toBe(true);
  });
});
