import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import {
  attributeRecipes,
  computeChanges,
  renderHtmlReport,
  renderMarkdownReport,
  applyPlan,
  GtmSnapshot,
} from "../src/index.js";
import { emptyState } from "../src/spec/convert.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";
import { manifestVariable } from "../src/library/manifest.js";
import { formatNotes } from "../src/library/metadata.js";

function existingWith() {
  const state = emptyState();
  state.raw.tag = [
    {
      name: "GA4 Event",
      type: "gaawe",
      parameter: [{ type: "template", key: "eventName", value: "old" }],
      tagId: "1",
      fingerprint: "1",
    },
  ];
  state.raw.variable = [
    {
      name: "Const - ID",
      type: "c",
      parameter: [{ type: "template", key: "value", value: "AW-1" }],
      variableId: "2",
    },
  ];
  state.tags.set("GA4 Event", "1");
  state.variables.set("Const - ID", "2");
  state.builtIns.add("pageUrl");
  return state;
}

describe("computeChanges", () => {
  it("classifies added, changed and unchanged with a field-level diff that ignores server fields", () => {
    const spec = defineContainer({
      variable: [
        {
          name: "Const - ID",
          type: "c",
          parameter: [{ type: "template", key: "value", value: "AW-2" }],
        },
      ],
      tag: [
        {
          name: "GA4 Event",
          type: "gaawe",
          parameter: [{ type: "template", key: "eventName", value: "old" }],
        },
        { name: "New Tag", type: "html", parameter: [] },
      ],
      builtInVariable: ["pageUrl", "clickUrl"],
    });
    const report = computeChanges(existingWith(), spec, {
      container: "GTM-X",
      workspace: "w",
      source: "spec",
    });
    expect(report.counts).toEqual({ added: 2, removed: 0, changed: 1, unchanged: 2 });
    const byName = Object.fromEntries(report.changes.map((c) => [c.name, c]));
    expect(byName["New Tag"].change).toBe("added");
    expect(byName["clickUrl"].change).toBe("added");
    expect(byName["GA4 Event"]).toBeUndefined(); // unchanged, dropped by default
    const constChange = byName["Const - ID"];
    expect(constChange.change).toBe("changed");
    expect(constChange.value).toBe("AW-2");
    expect(constChange.diffs).toEqual([
      {
        path: "parameter",
        before: [{ type: "template", key: "value", value: "AW-1" }],
        after: [{ type: "template", key: "value", value: "AW-2" }],
      },
    ]);
  });

  it("reports removals only when asked, and can keep unchanged", () => {
    const report = computeChanges(existingWith(), defineContainer({ tag: [] }), {
      removals: true,
      includeUnchanged: true,
    });
    const removed = report.changes.filter((c) => c.change === "removed").map((c) => c.name);
    expect(removed).toContain("GA4 Event");
    expect(removed).toContain("Const - ID");
  });
});

describe("attributeRecipes", () => {
  it("tags each change with the recipes whose closure includes it", () => {
    const report = computeChanges(
      emptyState(),
      defineContainer({
        tag: [{ name: "T", type: "html", parameter: [] }],
        variable: [{ name: "V", type: "c", parameter: [] }],
      })
    );
    attributeRecipes(
      report,
      new Map([
        ["r1", new Set(["tag:T"])],
        ["r2", new Set(["tag:T", "variable:V"])],
      ])
    );
    const byName = Object.fromEntries(report.changes.map((c) => [c.name, c]));
    expect(byName["T"].recipes).toEqual(["r1", "r2"]);
    expect(byName["V"].recipes).toEqual(["r2"]);
  });
});

async function library() {
  const { service } = createFakeService({
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-TPL", name: "Web Template" },
      { accountId: "1", containerId: "11", publicId: "GTM-CUST", name: "customer.com" },
    ],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, {
    container: "GTM-TPL",
    workspace: "seed",
    spec: defineContainer({
      variable: [
        manifestVariable({ recipes: { lead: { description: "Lead" } } }),
        {
          name: "Const - ID",
          type: "c",
          parameter: [{ type: "template", key: "value", value: "<AW-XXXX>" }],
        },
      ],
      trigger: [{ name: "PV", type: "pageview" }],
      tag: [
        {
          name: "Ads - lead",
          type: "awct",
          firingTriggerName: ["PV"],
          parameter: [{ type: "template", key: "conversionId", value: "{{Const - ID}}" }],
          notes: formatNotes("Records the lead conversion.", { recipes: ["lead"] }),
        },
      ],
    }),
  });
  return { client, lib: await new GtmSnapshot(client, { container: "GTM-TPL" }).init() };
}

describe("GtmSnapshot.changes", () => {
  it("reports the staged state against the pull, attributed to recipes", async () => {
    const { lib } = await library();
    expect(lib.changes().changes).toEqual([]); // nothing staged
    const tags = new Map(lib.tags);
    tags.set("Ads - lead", {
      ...lib.tags.get("Ads - lead")!,
      notes: formatNotes("Updated note.", { recipes: ["lead"] }),
    });
    tags.set("New - tag", { name: "New - tag", type: "html", firingTriggerName: ["PV"] });
    lib.tags = tags;
    const report = lib.changes();
    expect(report.source).toBe("snapshot");
    expect(report.counts.added).toBe(1);
    expect(report.counts.changed).toBe(1);
    const adsChange = report.changes.find((c) => c.name === "Ads - lead")!;
    expect(adsChange.change).toBe("changed");
    expect(adsChange.recipes).toEqual(["lead"]);
  });
});

describe("renderers", () => {
  const report = attributeRecipes(
    computeChanges(
      existingWith(),
      defineContainer({
        variable: [
          {
            name: "Const - ID",
            type: "c",
            parameter: [{ type: "template", key: "value", value: "AW-2" }],
          },
        ],
        tag: [{ name: "New Tag", type: "html", parameter: [] }],
      }),
      { container: "GTM-X", workspace: "onboarding", source: "plan" }
    ),
    new Map([["lead", new Set(["tag:New Tag", "variable:Const - ID"])]])
  );

  it("renders Markdown with counts, recipe grouping and diffs", () => {
    const md = renderMarkdownReport(report);
    expect(md).toMatchInlineSnapshot(`
      "# Change report: GTM-X / onboarding

      **1 added, 1 changed, 0 unchanged**

      ## lead


      ### Variables

      - \`~\` **Const - ID** (changed) = \`AW-2\`
        - \`parameter\`: [{"type":"template","key":"value","value":"AW-1"}] → [{"type":"template","key":"value","value":"AW-2"}]

      ### Tags

      - \`+\` **New Tag** (added)
      "
    `);
  });

  it("renders a self-contained HTML page with no external resources", () => {
    const html = renderHtmlReport(report);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("Change report: GTM-X / onboarding");
    expect(html).toContain("1 added, 1 changed");
    expect(html).toContain("New Tag");
    // No external stylesheets, scripts, or network resources.
    expect(/https?:\/\//.test(html)).toBe(false);
    expect(/<script|<link|src=|@import/.test(html)).toBe(false);
  });
});

describe("apply hooks", () => {
  it("writes the same report for a dry run and a real run, attributed to recipes", async () => {
    const { client, lib } = await library();
    const dir = await mkdtemp(join(tmpdir(), "gtm-report-"));
    const plan = { recipes: ["lead"] as const, constants: { "Const - ID": "AW-999" } };
    const dryPath = join(dir, "dry.md");
    const realPath = join(dir, "real.md");
    await applyPlan(client, {
      library: lib,
      plan,
      container: "GTM-CUST",
      workspace: "onboarding",
      dryRun: true,
      reportTo: dryPath,
    });
    await applyPlan(client, {
      library: lib,
      plan,
      container: "GTM-CUST",
      workspace: "onboarding",
      reportTo: realPath,
    });
    const dry = await readFile(dryPath, "utf-8");
    const real = await readFile(realPath, "utf-8");
    expect(dry).toBe(real);
    expect(dry).toContain("## lead");
    expect(dry).toContain("Ads - lead");
    expect(dry).toContain("Const - ID");

    const htmlPath = join(dir, "report.html");
    await applyPlan(client, {
      library: lib,
      plan,
      container: "GTM-CUST",
      workspace: "onboarding-2",
      dryRun: true,
      reportTo: htmlPath,
    });
    expect((await readFile(htmlPath, "utf-8")).startsWith("<!doctype html>")).toBe(true);
  });
});
