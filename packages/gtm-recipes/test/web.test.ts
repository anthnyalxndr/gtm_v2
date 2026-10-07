import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import {
  applyPlan,
  compilePlan,
  defineTrackingPlan,
  GtmSnapshot,
  type RequiredConstantNameOf,
} from "@anthnyalxndr/gtm-apply";
import { data, library } from "../src/web/index.js";
import plan from "../examples/web.plan.js";

const CONVERSIONS = ["contact_form_submit", "call_click", "email_click", "maps_click"] as const;
const RECIPES = ["google_tag", "google_tag_server", ...CONVERSIONS] as const;

describe("gtm-recipes web library", () => {
  it("ships the lead-gen recipe set with typed constants and a clean lint", () => {
    expect([...library.recipeNames].sort()).toEqual([...RECIPES].sort());
    expect([...library.constantNames].sort()).toEqual(
      [
        "Const - GA4 Measurement ID",
        "Const - Server Container URL",
        "Const - Google Ads Conversion ID",
        "Const - Google Ads - contact_form_submit Conversion Label",
        "Const - Google Ads - call_click Conversion Label",
        "Const - Google Ads - email_click Conversion Label",
        "Const - Google Ads - maps_click Conversion Label",
      ].sort()
    );
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
    for (const name of CONVERSIONS) {
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

  it("offers google_tag_server, which sends to a tagging server and excludes google_tag", () => {
    const tag = library.tags.get("Google Tag - Server")!;
    expect(tag.type).toBe("googtag");
    expect(tag.firingTriggerName).toEqual(["Initialization - All Pages"]);
    expect(tag.parameter).toContainEqual({
      type: "list",
      key: "configSettingsTable",
      list: [
        {
          type: "map",
          map: [
            { type: "template", key: "parameter", value: "server_container_url" },
            {
              type: "template",
              key: "parameterValue",
              value: "{{Const - Server Container URL}}",
            },
          ],
        },
      ],
    });
    expect(library.recipe("google_tag_server")?.conflicts).toEqual(["google_tag"]);
    expect(
      library.metadataOf({ kind: "variable", name: "Const - Server Container URL" })?.placeholder
    ).toEqual({
      kind: "serverContainerUrl",
      example: "https://sgtm.example.com",
      pattern: "^https://[^/]+$",
    });
    // Straight to compilePlan: defineTrackingPlan would also demand the placeholder constants.
    const both = compilePlan(library, { recipes: ["google_tag", "google_tag_server"] });
    expect(both.issues.some((i) => i.message.includes("conflicts with"))).toBe(true);
  });

  it("type-checks plans against the library, placeholder constants included", () => {
    defineTrackingPlan(library, { recipes: ["email_click"], destinations: ["ga4"] });
    defineTrackingPlan(library, {
      recipes: ["email_click"],
      constants: {
        "Const - GA4 Measurement ID": "G-1",
        "Const - Google Ads Conversion ID": "1",
        "Const - Google Ads - email_click Conversion Label": "AbCdEf",
      },
    });
    // @ts-expect-error email_click reaches three placeholder constants that must be supplied
    defineTrackingPlan(library, { recipes: ["email_click"] });
    // @ts-expect-error the Ads label for email_click is missing
    defineTrackingPlan(library, {
      recipes: ["email_click"],
      constants: { "Const - GA4 Measurement ID": "G-1", "Const - Google Ads Conversion ID": "1" },
    });
    // @ts-expect-error not a recipe of this library
    defineTrackingPlan(library, { recipes: ["purchase"] });
    defineTrackingPlan(library, {
      recipes: ["email_click"],
      destinations: ["ga4"],
      // @ts-expect-error not a constant of this library
      constants: { "Const - Nope": "x" },
    });
    const required: RequiredConstantNameOf<typeof data, ["call_click"]>[] = [
      "Const - GA4 Measurement ID",
      "Const - Google Ads Conversion ID",
      "Const - Google Ads - call_click Conversion Label",
    ];
    expect(required).toHaveLength(3);
    // @ts-expect-error contact_form_submit's label is not reached by call_click
    const notRequired: RequiredConstantNameOf<typeof data, ["call_click"]> =
      "Const - Google Ads - contact_form_submit Conversion Label";
    void notRequired;
    expect(compilePlan(library, plan).issues).toEqual([]);
    // A constant left at its placeholder is reported before any API call.
    const unfilled = compilePlan(library, { recipes: ["call_click"] });
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
      version: true,
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
