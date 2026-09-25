import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { Gtm } from "../src/gtm.js";
import { GtmSnapshot } from "../src/library/gtm-snapshot.js";
import { template } from "./tracking-plan.test.js";

function fake() {
  const { service, state } = createFakeService({
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-TPL", name: "Web Template" },
      { accountId: "1", containerId: "11", publicId: "GTM-CUST", name: "customer.com" },
    ],
  });
  return { gtm: new Gtm(new GtmClient({ service, minIntervalMs: 0 })), state };
}

describe("Gtm", () => {
  it("delegates apply, plan, export, snapshot and applyPlan to the engine", async () => {
    const { gtm, state } = fake();
    await gtm.init();
    const seeded = await gtm.apply({ container: "GTM-TPL", workspace: "seed", spec: template });
    expect(seeded.result?.versionPath).toBeDefined();

    const exported = await gtm.export({ container: "GTM-TPL" });
    expect(exported.tag?.map((t) => t.name)).toContain("GA4 - form_submit");

    const dry = await gtm.plan({ container: "GTM-CUST", workspace: "w" }, exported);
    expect(dry.errors).toEqual([]);

    const library = await gtm.snapshot({ container: "GTM-TPL" });
    expect(library).toBeInstanceOf(GtmSnapshot);
    expect(library.recipeNames).toEqual(["form_submit", "email_click", "call_click"]);

    const outcome = await gtm.applyPlan({
      library,
      plan: {
        recipes: ["email_click"],
        constants: {
          "Const - GA4 Measurement ID": "G-1",
          "Const - Ads Conversion ID": "AW-1",
          "Const - Ads Label - email_click": "AbCdEf",
        },
      },
      container: "GTM-CUST",
      workspace: "onboarding",
    });
    expect(outcome.plan.errors).toEqual([]);
    expect(
      latestSnapshot(state)
        .tag.map((t) => t.name)
        .sort()
    ).toEqual(["Ads - email_click", "Conversion Linker", "GA4 - email_click"]);
  });

  it("memoizes snapshots per source until refresh is requested", async () => {
    const { gtm, state } = fake();
    await gtm.apply({ container: "GTM-TPL", workspace: "seed", spec: template });
    const a = await gtm.snapshot({ container: "GTM-TPL" });
    const calls = state.calls.length;
    const b = await gtm.snapshot({ container: "GTM-TPL" });
    expect(b).toBe(a);
    expect(state.calls.length).toBe(calls);
    const c = await gtm.snapshot({ container: "GTM-TPL" }, { refresh: true });
    expect(c).not.toBe(a);
    expect(state.calls.length).toBeGreaterThan(calls);
    const live = await gtm
      .snapshot({ container: "GTM-TPL", version: "live" })
      .catch((e: Error) => e);
    expect(live).not.toBe(a);
    expect(gtm.snapshotFrom(a.toJSON()).recipeNames).toEqual(a.recipeNames);
  });

  it("snapshotAccount memoizes per container", async () => {
    const { gtm, state } = fake();
    await gtm.init();
    await gtm.apply({ container: "GTM-TPL", workspace: "seed", spec: template });
    await gtm.apply({ container: "GTM-CUST", workspace: "seed", spec: template });
    const all = await gtm.snapshotAccount("1");
    expect(all.map((s) => s.data.container.publicId)).toEqual(["GTM-TPL", "GTM-CUST"]);
    const reads = state.calls.filter((c) => c === "versions.get").length;
    const again = await gtm.snapshot({ container: "GTM-CUST" });
    expect(again).toBe(all[1]);
    expect(state.calls.filter((c) => c === "versions.get")).toHaveLength(reads);
  });

  it("builds a client from config", () => {
    const gtm = Gtm.fromConfig({ clientSecretsPath: "/nonexistent/secrets.json" });
    expect(gtm.client).toBeInstanceOf(GtmClient);
  });
});
