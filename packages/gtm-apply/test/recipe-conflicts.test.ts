import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { GtmSnapshot } from "../src/library/gtm-snapshot.js";
import { formatNotes } from "../src/library/metadata.js";
import { manifestVariable } from "../src/library/manifest.js";
import { compilePlan, defineTrackingPlan } from "../src/plan/tracking-plan.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";
import { formatIssue } from "../src/spec/validate.js";

const meta = (recipe: string) => formatNotes("", { recipes: [recipe] });
const html = (name: string, recipe: string) => ({
  name,
  type: "html",
  notes: meta(recipe),
  firingTriggerName: ["All Pages"],
  parameter: [{ type: "template" as const, key: "html", value: "<script></script>" }],
});

async function library(conflicts: Record<string, string[]>) {
  const spec = defineContainer({
    variable: [
      manifestVariable({
        recipes: {
          tag: {},
          tag_server: { conflicts: conflicts.tag_server ?? [] },
          other: {},
        },
      }),
    ],
    tag: [html("Tag", "tag"), html("Tag - Server", "tag_server"), html("Other", "other")],
  });
  const { service } = createFakeService({
    containers: [{ accountId: "1", containerId: "10", publicId: "GTM-LIB", name: "lib" }],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, { container: "GTM-LIB", workspace: "seed", spec, version: true });
  return new GtmSnapshot(client, { container: "GTM-LIB" }).init();
}

describe("recipe conflicts", () => {
  it("reads a recipe's conflicts from the manifest", async () => {
    const lib = await library({ tag_server: ["tag"] });
    expect(lib.recipe("tag_server")?.conflicts).toEqual(["tag"]);
    expect(lib.recipe("tag")?.conflicts).toEqual([]);
    expect(lib.lint()).toEqual([]);
  });

  it("reports a plan that selects two conflicting recipes, once", async () => {
    const lib = await library({ tag_server: ["tag"] });
    const both = compilePlan(lib, defineTrackingPlan(lib, { recipes: ["tag", "tag_server"] }));
    expect(both.issues.map(formatIssue)).toEqual([
      'recipe "tag_server" conflicts with "tag"; a plan picks one of them',
    ]);
    const one = compilePlan(lib, defineTrackingPlan(lib, { recipes: ["tag_server", "other"] }));
    expect(one.issues).toEqual([]);
  });

  it("lints a conflict that names no recipe", async () => {
    const lib = await library({ tag_server: ["typo"] });
    expect(lib.lint().map(formatIssue)).toEqual([
      'recipe "tag_server": conflicts names "typo", which is not a recipe',
    ]);
  });
});
