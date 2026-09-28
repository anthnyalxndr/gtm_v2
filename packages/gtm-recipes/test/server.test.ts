import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { applyPlan, compilePlan, defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "../src/server/index.js";
import { recipes } from "../src/index.js";
import plan from "../examples/server.plan.js";

const CONVERSIONS = ["contact_form_submit", "call_click", "email_click", "maps_click"] as const;
const RECIPES = ["ga4_client", ...CONVERSIONS, "web_container_client"] as const;

describe("gtm-recipes server library", () => {
  it("is a server library keyed under recipes.server, with a clean lint", () => {
    expect(recipes.server).toBe(library);
    expect(library.containerType).toBe("server");
    expect([...library.recipeNames].sort()).toEqual([...RECIPES].sort());
    for (const name of RECIPES) expect(library.recipe(name)?.description).toBeTruthy();
    expect(library.lint()).toEqual([]);
  });

  it("claims GA4 hits with one client, forwards them with one tag, and links conversions", () => {
    const base = library.recipe("ga4_client")!;
    expect(base.roots.map((r) => `${r.kind}:${r.name}`).sort()).toEqual([
      "client:GA4",
      "tag:Conversion Linker",
      "tag:GA4 - All Events",
    ]);
    const ga4 = library.tags.get("GA4 - All Events")!;
    expect(ga4.type).toBe("sgtmgaaw");
    expect(ga4.firingTriggerName).toEqual(["Client - GA4"]);
    // Left empty, the tag inherits the measurement id from the event the client claimed.
    expect(ga4.parameter?.some((p) => p.key === "measurementId")).toBe(false);
    expect([...library.tags.values()].filter((t) => t.type === "sgtmgaaw")).toHaveLength(1);
    const linker = library.tags.get("Conversion Linker")!;
    expect(linker.type).toBe("sgtmadscl");
    expect(linker.firingTriggerName).toEqual(["All Pages"]);
  });

  it("gives each conversion recipe one event trigger and one server Google Ads tag", () => {
    for (const name of CONVERSIONS) {
      const recipe = library.recipe(name)!;
      expect(recipe.roots.map((r) => r.name)).toEqual([`Ads - ${name}`]);
      const tag = library.tags.get(`Ads - ${name}`)!;
      expect(tag.type).toBe("sgtmadsct");
      expect(tag.firingTriggerName).toEqual([`Custom Event - ${name}`]);
      expect(recipe.dependencies[0].constant).toBe(`Const - Google Ads - ${name} Conversion Label`);
      expect(library.externalNameOf(name, recipe.dependencies[0])).toBe(`GTM - ${name}`);
    }
  });

  it("reports an unfilled web container id for web_container_client", () => {
    const unfilled = compilePlan(
      library,
      defineTrackingPlan(library, { recipes: ["web_container_client"] })
    );
    expect(unfilled.issues.map((i) => i.entity)).toContain('variable "Const - Web Container ID"');
    expect(compilePlan(library, plan).issues).toEqual([]);
  });

  it("applies the example plan to a customer's server container", async () => {
    const { service, state } = createFakeService({
      containers: [
        {
          accountId: "1",
          containerId: "12",
          publicId: "GTM-SRV",
          name: "customer.com - Server",
          usageContext: ["server"],
        },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const outcome = await applyPlan(client, {
      library,
      plan,
      container: "GTM-SRV",
      workspace: "onboarding",
    });
    expect(outcome.plan.errors).toEqual([]);
    const snap = latestSnapshot(state);
    expect(snap.client.map((c) => c.name)).toEqual(["GA4"]);
    expect(snap.tag.map((t) => t.name).sort()).toEqual([
      "Ads - call_click",
      "Ads - contact_form_submit",
      "Conversion Linker",
      "GA4 - All Events",
    ]);
    expect(snap.tag.find((t) => t.name === "Conversion Linker")?.firingTriggerId).toEqual([
      "2147479574",
    ]);
    expect([...snap.builtIns].sort()).toEqual(["clientName"]);
    expect(snap.variable.map((v) => v.name)).not.toContain("Library - Manifest");
  });
});
