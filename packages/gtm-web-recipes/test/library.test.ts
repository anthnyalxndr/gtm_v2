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
import { data, library } from "../src/index.js";
import plan from "../plan.example.js";

describe("gtm-web-recipes", () => {
  it("ships a library with three event recipes and typed constants", () => {
    expect(library.recipeNames).toEqual(["form_submit", "email_click", "call_click"]);
    expect(library.constantNames).toEqual([
      "Const - GA4 Measurement ID",
      "Const - Ads Conversion ID",
      "Const - Ads Label - form_submit",
      "Const - Ads Label - email_click",
      "Const - Ads Label - call_click",
    ]);
    expect(library.recipe("form_submit")?.description).toMatch(/lead form/i);
    expect(library.encoding.name).toBe("notes");
    expect(
      library.metadataOf({ kind: "variable", name: "Const - GA4 Measurement ID" })?.placeholder
    ).toEqual({ kind: "ga4MeasurementId", example: "G-ABC123DEF4", pattern: "^G-[A-Z0-9]+$" });
    expect(library.metadataOf({ kind: "tag", name: "Conversion Linker" })?.recipes).toEqual([
      "form_submit",
      "email_click",
      "call_click",
    ]);
    expect(library.lint()).toEqual([]);
    expect(GtmSnapshot.fromData(data).recipes).toEqual(library.recipes);
  });

  it("type-checks plans against the library, placeholder constants included", () => {
    defineTrackingPlan(library, { recipes: ["email_click"], destinations: ["ga4"] });
    defineTrackingPlan(library, {
      recipes: ["email_click"],
      constants: {
        "Const - GA4 Measurement ID": "G-1",
        "Const - Ads Conversion ID": "AW-1",
        "Const - Ads Label - email_click": "AbCdEf",
      },
    });
    // @ts-expect-error email_click reaches three placeholder constants that must be supplied
    defineTrackingPlan(library, { recipes: ["email_click"] });
    // @ts-expect-error the Ads label for email_click is missing
    defineTrackingPlan(library, {
      recipes: ["email_click"],
      constants: { "Const - GA4 Measurement ID": "G-1", "Const - Ads Conversion ID": "AW-1" },
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
      "Const - Ads Conversion ID",
      "Const - Ads Label - call_click",
    ];
    expect(required).toHaveLength(3);
    // @ts-expect-error form_submit's label is not reached by call_click
    const notRequired: RequiredConstantNameOf<typeof data, ["call_click"]> =
      "Const - Ads Label - form_submit";
    void notRequired;
    expect(compilePlan(library, plan).issues).toEqual([]);
  });

  it("applies the example plan to a customer container", async () => {
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
      "Ads - form_submit",
      "Conversion Linker",
      "GA4 - call_click",
      "GA4 - form_submit",
    ]);
    expect(snap.variable.find((v) => v.name === "Const - GA4 Measurement ID")?.parameter).toEqual([
      { type: "template", key: "value", value: "G-XXXXXXX" },
    ]);
    expect(snap.tag.find((t) => t.name === "GA4 - form_submit")?.notes).toBe(
      "Sends the form_submit event to GA4."
    );
    expect(snap.variable.find((v) => v.name === "Const - GA4 Measurement ID")?.notes).toMatch(
      /^Measurement ID of the site's GA4 web data stream/
    );
    expect(
      [...snap.tag, ...snap.trigger, ...snap.variable].every((e) => !e.notes?.includes("---"))
    ).toBe(true);
  });
});
