import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { GtmSnapshot } from "../src/library/gtm-snapshot.js";
import { manifestVariable } from "../src/library/manifest.js";
import {
  applyPlan,
  compilePlan,
  defineTrackingPlan,
  libraryModuleSource,
  TrackingPlanError,
} from "../src/plan/tracking-plan.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";
import { formatIssue } from "../src/spec/validate.js";
import { parseCliArgs, runCli } from "../src/cli.js";

const meta = (recipes: string) => ({
  type: "map" as const,
  map: [{ type: "template" as const, key: "recipes", value: recipes }],
});
const constant = (name: string, value: string) => ({
  name,
  type: "c",
  parameter: [{ type: "template" as const, key: "value", value }],
});
const conversion = (recipe: string, trigger: string) => [
  {
    name: `GA4 - ${recipe}`,
    type: "gaawe",
    firingTriggerName: [trigger],
    monitoringMetadata: meta(recipe),
    parameter: [
      { type: "template" as const, key: "eventName", value: recipe },
      {
        type: "template" as const,
        key: "measurementIdOverride",
        value: "{{Const - GA4 Measurement ID}}",
      },
    ],
  },
  {
    name: `Ads - ${recipe}`,
    type: "awct",
    firingTriggerName: [trigger],
    monitoringMetadata: meta(recipe),
    setupTag: [{ tagName: "Conversion Linker" }],
    parameter: [
      { type: "template" as const, key: "conversionId", value: "{{Const - Ads Conversion ID}}" },
      {
        type: "template" as const,
        key: "conversionLabel",
        value: `{{Const - Ads Label - ${recipe}}}`,
      },
    ],
  },
];

export const template = defineContainer({
  variable: [
    manifestVariable({
      encoding: { name: "metadata" },
      conventions: {},
      recipes: {
        form_submit: {
          description: "Lead form submitted",
          dependencies: [
            {
              constant: "Const - Ads Label - form_submit",
              platform: "googleAds",
              resource: "conversionAction",
              pattern: "^[A-Za-z0-9_-]{5,}$",
            },
          ],
        },
        email_click: { description: "Email link clicked" },
        call_click: { description: "Phone link clicked" },
      },
    }),
    constant("Const - GA4 Measurement ID", "<G-XXXXXXX>"),
    constant("Const - Ads Conversion ID", "<AW-XXXXXXXXX>"),
    constant("Const - Ads Label - form_submit", "<label>"),
    constant("Const - Ads Label - email_click", "<label>"),
    constant("Const - Ads Label - call_click", "<label>"),
    constant("Const - Currency", "USD"),
  ],
  trigger: [
    {
      name: "Custom Event - form_submit",
      type: "customEvent",
      customEventFilter: [
        {
          type: "equals",
          parameter: [
            { type: "template", key: "arg0", value: "{{_event}}" },
            { type: "template", key: "arg1", value: "form_submit" },
          ],
        },
      ],
    },
    {
      name: "Click - email",
      type: "linkClick",
      filter: [
        {
          type: "startsWith",
          parameter: [
            { type: "template", key: "arg0", value: "{{Click URL}}" },
            { type: "template", key: "arg1", value: "mailto:" },
          ],
        },
      ],
    },
    {
      name: "Click - call",
      type: "linkClick",
      filter: [
        {
          type: "startsWith",
          parameter: [
            { type: "template", key: "arg0", value: "{{Click URL}}" },
            { type: "template", key: "arg1", value: "tel:" },
          ],
        },
      ],
    },
  ],
  tag: [
    ...conversion("form_submit", "Custom Event - form_submit"),
    ...conversion("email_click", "Click - email"),
    ...conversion("call_click", "Click - call"),
    {
      name: "Conversion Linker",
      type: "gclidw",
      monitoringMetadata: meta("form_submit, email_click, call_click"),
    },
  ],
});

async function fake() {
  const { service, state } = createFakeService({
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-TPL", name: "Web Template" },
      { accountId: "1", containerId: "11", publicId: "GTM-CUST", name: "customer.com" },
    ],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, { container: "GTM-TPL", workspace: "seed", spec: template });
  const library = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
  return { client, state, library };
}

const values = {
  "Const - GA4 Measurement ID": "G-1",
  "Const - Ads Conversion ID": "AW-1",
  "Const - Ads Label - form_submit": "AbCdEf",
  "Const - Ads Label - email_click": "AbCdEf",
  "Const - Ads Label - call_click": "AbCdEf",
};

describe("compilePlan", () => {
  it("selects across recipes once, fills constants, and shares entities", async () => {
    const { library } = await fake();
    const { spec, issues, warnings } = compilePlan(library, {
      recipes: ["form_submit", "call_click"],
      constants: values,
    });
    expect(issues).toEqual([]);
    expect(warnings).toEqual([
      'constant "Const - Ads Label - email_click" is not used by the selected recipes',
    ]);
    expect(spec.tag?.map((t) => t.name)).toEqual([
      "GA4 - form_submit",
      "Ads - form_submit",
      "GA4 - call_click",
      "Ads - call_click",
      "Conversion Linker",
    ]);
    expect(spec.trigger?.map((t) => t.name)).toEqual([
      "Custom Event - form_submit",
      "Click - call",
    ]);
    const ga4 = spec.variable?.find((v) => v.name === "Const - GA4 Measurement ID");
    expect(ga4?.parameter).toEqual([{ type: "template", key: "value", value: "G-1" }]);
    expect(spec.variable?.some((v) => v.name === "Library - Manifest")).toBe(false);
    expect(spec.variable?.some((v) => v.name === "Const - Ads Label - email_click")).toBe(false);
  });

  it("filters destination families and drops constants only the dropped tags used", async () => {
    const { library } = await fake();
    const { spec, issues } = compilePlan(library, {
      recipes: ["email_click"],
      destinations: ["ga4"],
      constants: { "Const - GA4 Measurement ID": "G-1" },
    });
    expect(issues).toEqual([]);
    expect(spec.tag?.map((t) => t.name)).toEqual(["GA4 - email_click"]);
    expect(spec.variable?.map((v) => v.name)).toEqual(["Const - GA4 Measurement ID"]);
  });

  it("reports missing placeholders, bad dependency values, unknown constants, and warns on unused or placeholder values", async () => {
    const { library } = await fake();
    const { issues, warnings } = compilePlan(library, {
      recipes: ["form_submit"],
      constants: {
        "Const - Ads Conversion ID": "<AW-XXXXXXXXX>",
        "Const - Ads Label - form_submit": "no",
        "Const - Ads Label - call_click": "AbCdEf",
        "Const - Nope": "x",
      } as Record<string, string>,
    });
    expect(issues.map(formatIssue)).toEqual([
      'variable "Const - GA4 Measurement ID": value needs a value in the plan\'s constants (library holds "<G-XXXXXXX>")',
      "plan: constants.Const - Nope is not a constant in the library",
      'recipe "form_submit": dependencies[0] googleAds conversionAction in "Const - Ads Label - form_submit" must match /^[A-Za-z0-9_-]{5,}$/ (got "no")',
    ]);
    expect(warnings).toEqual([
      'constant "Const - Ads Conversion ID" still holds the placeholder value "<AW-XXXXXXXXX>"',
      'constant "Const - Ads Label - call_click" is not used by the selected recipes',
    ]);
  });

  it("checks names when the library declares conventions", async () => {
    const { client, library } = await fake();
    void client;
    const strict = GtmSnapshot.fromData(library.toJSON(), {
      conventions: { tagPrefixes: { gclidw: "Linker - " } },
    });
    const { issues } = compilePlan(strict, { recipes: ["call_click"], constants: values });
    expect(issues.map(formatIssue)).toEqual([
      'tag "Conversion Linker": name must start with "Linker - " (gclidw tags)',
    ]);
  });
});

describe("applyPlan", () => {
  it("applies three recipes end to end, writes the compiled spec, and is unchanged on rerun", async () => {
    const { client, state, library } = await fake();
    const dir = await mkdtemp(join(tmpdir(), "gtm-plan-"));
    const plan = defineTrackingPlan(library, {
      recipes: ["form_submit", "email_click", "call_click"],
      constants: values,
    });
    const first = await applyPlan(client, {
      client: undefined,
      library,
      plan,
      container: "GTM-CUST",
      workspace: "onboarding",
      writeSpecTo: join(dir, "compiled.json"),
    } as Parameters<typeof applyPlan>[1]);
    expect(first.plan.errors).toEqual([]);
    expect(first.result?.versionPath).toBeDefined();
    const snap = latestSnapshot(state);
    expect(snap.tag).toHaveLength(7);
    expect(snap.tag.every((t) => !t.monitoringMetadata?.map)).toBe(true);
    expect(snap.variable.map((v) => v.name)).not.toContain("Library - Manifest");
    const written = JSON.parse(await readFile(join(dir, "compiled.json"), "utf-8"));
    expect(written.tag).toHaveLength(7);

    const second = await applyPlan(client, {
      library,
      plan,
      container: "GTM-CUST",
      workspace: "onboarding-2",
      dryRun: true,
    });
    expect(
      second.plan.ops.filter((o) => o.kind !== "workspace").every((o) => o.action === "unchanged")
    ).toBe(true);
  });

  it("throws before any API call when the plan has problems", async () => {
    const { client, state, library } = await fake();
    const before = state.calls.length;
    await expect(
      applyPlan(client, {
        library,
        plan: { recipes: ["form_submit"] },
        container: "GTM-CUST",
        workspace: "w",
      })
    ).rejects.toThrow(TrackingPlanError);
    expect(state.calls.length).toBe(before);
  });

  it("types recipe and constant names from a const library module", async () => {
    const { library } = await fake();
    const dir = await mkdtemp(join(tmpdir(), "gtm-plan-"));
    const source = libraryModuleSource(library.toJSON());
    expect(source).toMatch(/^\/\/ GENERATED/);
    expect(source).toContain("export const data = {");
    expect(source.trimEnd()).toMatch(/as const;$/);
    const typed = GtmSnapshot.fromData({
      ...library.toJSON(),
      recipes: [{ name: "form_submit", roots: [], entities: [], dependencies: [] }],
      data: {
        ...library.toJSON().data,
        variable: [{ name: "Const - GA4 Measurement ID", type: "c" }],
      },
    } as const);
    expect(typed.constantNames).toEqual(["Const - GA4 Measurement ID"]);
    defineTrackingPlan(typed, {
      recipes: ["form_submit"],
      constants: { "Const - GA4 Measurement ID": "G-1" },
    });
    // @ts-expect-error "call_click" is not a recipe of this library
    defineTrackingPlan(typed, { recipes: ["call_click"] });
    // @ts-expect-error "Const - Nope" is not a constant of this library
    defineTrackingPlan(typed, { recipes: ["form_submit"], constants: { "Const - Nope": "x" } });
    void dir;
  });
});

describe("gtm-apply apply --plan", () => {
  it("compiles a plan module against a library file and applies it", async () => {
    const { client, state, library } = await fake();
    const dir = await mkdtemp(join(tmpdir(), "gtm-plan-cli-"));
    const libPath = join(dir, "library.json");
    const planPath = join(dir, "plan.mjs");
    const { writeFile } = await import("fs/promises");
    await writeFile(libPath, JSON.stringify(library));
    await writeFile(
      planPath,
      `export default { recipes: ["call_click"], constants: ${JSON.stringify(values)} };\n`
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs([
        "apply",
        "--container",
        "GTM-CUST",
        "--workspace",
        "w",
        "--plan",
        planPath,
        "--library",
        libPath,
        "--write-spec",
        join(dir, "out.json"),
      ]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain('[+] tag "Ads - call_click"');
    expect(
      latestSnapshot(state)
        .tag.map((t) => t.name)
        .sort()
    ).toEqual(["Ads - call_click", "Conversion Linker", "GA4 - call_click"]);
    expect(JSON.parse(await readFile(join(dir, "out.json"), "utf-8")).tag).toHaveLength(3);

    const bad: string[] = [];
    const badPlan = join(dir, "bad-plan.mjs");
    await writeFile(badPlan, `export default { recipes: ["call_click"] };\n`);
    const badCode = await runCli(
      parseCliArgs([
        "apply",
        "--container",
        "GTM-CUST",
        "--workspace",
        "w",
        "--plan",
        badPlan,
        "--library",
        libPath,
      ]),
      client,
      (l) => bad.push(l)
    );
    expect(badCode).toBe(1);
    expect(bad.some((l) => l.startsWith('[!] variable "Const - GA4 Measurement ID"'))).toBe(true);
  });
});
