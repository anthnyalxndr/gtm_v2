import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { GtmSnapshot, type GtmSnapshotData } from "../src/library/gtm-snapshot.js";
import { formatNotes } from "../src/library/metadata.js";
import { manifestVariable, MANIFEST_VARIABLE_NAME } from "../src/library/manifest.js";
import { closure } from "../src/library/closure.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";
import { validateSpec } from "../src/spec/validate.js";
import { formatIssue } from "../src/spec/validate.js";

const meta = (recipes: string, text = "") => formatNotes(text, { recipes: recipes.split(", ") });

/** A template container as a library: two recipes sharing a conversion linker and a constant. */
const template = defineContainer({
  folder: [{ name: "Shared" }],
  variable: [
    manifestVariable({
      recipes: {
        form_submit: {
          description: "Lead form submitted",
          dependencies: [
            {
              constant: "Const - Ads Label - lead",
              platform: "googleAds",
              resource: "conversionAction",
              nameTemplate: "GTM - ${recipe}",
            },
          ],
        },
        call_click: { description: "Phone number clicked" },
      },
    }),
    {
      name: "Const - Ads ID",
      type: "c",
      parentFolderName: "Shared",
      parameter: [{ type: "template", key: "value", value: "AW-1" }],
    },
    {
      name: "Const - Ads Label - lead",
      type: "c",
      parameter: [{ type: "template", key: "value", value: "abc" }],
    },
    {
      name: "DLV - phone",
      type: "v",
      parameter: [{ type: "template", key: "name", value: "phone" }],
    },
  ],
  trigger: [
    {
      name: "Custom Event - lead",
      type: "customEvent",
      customEventFilter: [
        {
          type: "equals",
          parameter: [
            { type: "template", key: "arg0", value: "{{_event}}" },
            { type: "template", key: "arg1", value: "lead" },
          ],
        },
      ],
    },
    {
      name: "Click - call",
      type: "linkClick",
      filter: [
        {
          type: "contains",
          parameter: [
            { type: "template", key: "arg0", value: "{{Click URL}}" },
            { type: "template", key: "arg1", value: "tel:{{DLV - phone}}" },
          ],
        },
      ],
    },
  ],
  tag: [
    {
      name: "GA4 - lead",
      type: "gaawe",
      firingTriggerName: ["Custom Event - lead"],
      notes: meta("form_submit", "Sends generate_lead to GA4."),
      parameter: [{ type: "template", key: "eventName", value: "generate_lead" }],
    },
    {
      name: "Ads - lead",
      type: "awct",
      firingTriggerName: ["Custom Event - lead"],
      notes: meta("form_submit"),
      setupTag: [{ tagName: "Conversion Linker" }],
      parameter: [
        { type: "template", key: "conversionId", value: "{{Const - Ads ID}}" },
        { type: "template", key: "conversionLabel", value: "{{Const - Ads Label - lead}}" },
      ],
    },
    {
      name: "Ads - call",
      type: "awct",
      firingTriggerName: ["Click - call"],
      notes: meta("call_click"),
      parameter: [{ type: "template", key: "conversionId", value: "{{Const - Ads ID}}" }],
    },
    {
      name: "Conversion Linker",
      type: "gclidw",
      parentFolderName: "Shared",
      notes: meta("form_submit, call_click"),
    },
    { name: "Unrelated", type: "html", notes: "Plain note" },
  ],
});

async function libraryFake() {
  const { service, state } = createFakeService({
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-TPL", name: "Web Template" },
      { accountId: "1", containerId: "11", publicId: "GTM-CUST", name: "customer.com" },
    ],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, { container: "GTM-TPL", workspace: "seed", spec: template });
  return { client, state };
}

describe("closure", () => {
  it("follows triggers, setup tags, variables, folders and built-ins with a visited set", () => {
    const refs = closure(template, [{ kind: "tag", name: "Ads - call" }]).map(
      (r) => `${r.kind}:${r.name}`
    );
    expect(refs).toEqual([
      "tag:Ads - call",
      "trigger:Click - call",
      "variable:Const - Ads ID",
      "builtInVariable:clickUrl",
      "variable:DLV - phone",
      "folder:Shared",
    ]);
  });
});

describe("GtmSnapshot", () => {
  it("pulls a library and indexes recipes from notes trailers", async () => {
    const { client } = await libraryFake();
    const lib = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    expect(lib.encoding.name).toBe("notes");
    expect(lib.toJSON().encoding).toEqual({ name: "notes" });
    expect(Object.keys(lib.metadata).sort()).toEqual([
      "tag:Ads - call",
      "tag:Ads - lead",
      "tag:Conversion Linker",
      "tag:GA4 - lead",
    ]);
    expect(lib.metadataOf({ kind: "tag", name: "Conversion Linker" })?.recipes).toEqual([
      "form_submit",
      "call_click",
    ]);
    expect(lib.metadataOf({ kind: "tag", name: "Unrelated" })).toBeUndefined();
    expect(lib.toJSON().metadata).toEqual(lib.metadata);
    expect(lib.containerType).toBe("web");
    expect(lib.recipeNames).toEqual(["form_submit", "call_click"]);
    const form = lib.recipe("form_submit")!;
    expect(form.description).toBe("Lead form submitted");
    expect(form.roots.map((r) => r.name)).toEqual([
      "GA4 - lead",
      "Ads - lead",
      "Conversion Linker",
    ]);
    expect(form.entities.map((r) => r.name)).toEqual([
      "GA4 - lead",
      "Ads - lead",
      "Conversion Linker",
      "Custom Event - lead",
      "Const - Ads ID",
      "Const - Ads Label - lead",
      "Shared",
    ]);
    expect(form.dependencies[0].constant).toBe("Const - Ads Label - lead");
    expect(lib.tags.get("Unrelated")?.type).toBe("html");
    expect(lib.variables.has(MANIFEST_VARIABLE_NAME)).toBe(true);
    expect(lib.folders.get("Shared")).toEqual({ name: "Shared" });
    expect(lib.builtIns.has("clickUrl")).toBe(true);
    expect(lib.recipes.map((r) => r.name)).toEqual(["form_submit", "call_click"]);
    expect(lib.data.destinations).toEqual([]);
    expect(lib.data.environment).toBeNull();
    expect(lib.data.containerVersionHeader?.containerVersionId).toBeDefined();
    expect(lib.data.tag.map((t) => t.name)).toContain("Ads - lead");
    expect(lib.isDirty).toBe(false);
  });

  it("fromSnapshot yields the same library without a client", async () => {
    const { client } = await libraryFake();
    const pulled = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    const json = JSON.parse(JSON.stringify(pulled)) as GtmSnapshotData;
    expect(Object.keys(json).sort()).toEqual([
      "data",
      "encoding",
      "manifest",
      "metadata",
      "recipes",
    ]);
    const loaded = GtmSnapshot.fromData(json);
    expect(loaded.recipes).toEqual(pulled.recipes);
    expect(loaded.metadata).toEqual(pulled.metadata);
    expect(loaded.spec).toEqual(pulled.spec);
    expect(loaded.encoding.name).toBe("notes");
    expect(loaded.toJSON()).toEqual(json);
    expect(() => new GtmSnapshot(client, { container: "" })).toThrow(/container id/);
    expect(() => new GtmSnapshot(client, { container: "GTM-TPL" }).spec).toThrow(/init/);
  });

  it("selects recipes, hands entities to the customer without trailers, leaves the manifest out, and applies cleanly", async () => {
    const { client, state } = await libraryFake();
    const lib = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    const spec = lib.select(["form_submit"]);
    expect(validateSpec(spec)).toEqual([]);
    expect(spec.tag?.map((t) => t.name)).toEqual(["GA4 - lead", "Ads - lead", "Conversion Linker"]);
    expect(spec.tag?.map((t) => t.notes)).toEqual([
      "Sends generate_lead to GA4.",
      undefined,
      undefined,
    ]);
    expect(lib.tags.get("GA4 - lead")?.notes).toContain("---");
    expect(spec.variable?.map((v) => v.name)).toEqual([
      "Const - Ads ID",
      "Const - Ads Label - lead",
    ]);
    expect(spec.trigger?.map((t) => t.name)).toEqual(["Custom Event - lead"]);
    expect(spec.folder).toEqual([{ name: "Shared" }]);
    expect(spec.builtInVariable).toBeUndefined();
    expect(spec.containerType).toBe("web");

    const { plan, result } = await applySpec(client, {
      container: "GTM-CUST",
      workspace: "onboarding",
      spec,
    });
    expect(plan.errors).toEqual([]);
    expect(result?.versionPath).toBeDefined();
    const snap = latestSnapshot(state);
    expect(snap.tag.map((t) => t.name).sort()).toEqual([
      "Ads - lead",
      "Conversion Linker",
      "GA4 - lead",
    ]);
    expect(snap.variable.some((v) => v.name === MANIFEST_VARIABLE_NAME)).toBe(false);
    expect(() => lib.select(["nope" as "form_submit"])).toThrow(/Unknown recipe "nope"/);
  });

  it("filters destination families but keeps tags of no family and everything reached", async () => {
    const { client } = await libraryFake();
    const lib = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    const ga4Only = lib.select(["form_submit", "call_click"], { destinations: ["ga4"] });
    expect(ga4Only.tag?.map((t) => t.name)).toEqual(["GA4 - lead"]);
    expect(ga4Only.variable).toBeUndefined();
    const ads = lib.select(["form_submit"], { destinations: ["googleAds"] });
    expect(ads.tag?.map((t) => t.name)).toEqual(["Ads - lead", "Conversion Linker"]);
    expect(lib.familyOf("html")).toBeUndefined();
  });

  it("lints unreadable trailers, recipes on non-roots, and placeholders that disagree with their value", async () => {
    const spec = defineContainer({
      variable: [
        manifestVariable({ recipes: { a: {} } }),
        {
          name: "Const - Path",
          type: "c",
          notes: formatNotes("Path of the contact page.", { placeholder: { kind: "path" } }),
          parameter: [{ type: "template", key: "value", value: "/contact" }],
        },
        {
          name: "Const - ID",
          type: "c",
          parameter: [{ type: "template", key: "value", value: "<id>" }],
        },
        {
          name: "DLV - x",
          type: "v",
          notes: formatNotes("", { placeholder: { kind: "path" } }),
          parameter: [{ type: "template", key: "name", value: "x" }],
        },
      ],
      trigger: [{ name: "PV", type: "pageview", notes: meta("a") }],
      tag: [
        { name: "T", type: "html", notes: meta("a"), firingTriggerName: ["PV"] },
        { name: "Broken", type: "html", notes: "Text\n---\n{nope" },
      ],
    });
    const { service } = createFakeService({
      containers: [{ accountId: "1", containerId: "10", publicId: "GTM-LINT", name: "lint" }],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await applySpec(client, { container: "GTM-LINT", workspace: "seed", spec });
    const lib = await new GtmSnapshot(client, { container: "GTM-LINT" }).init();
    const [first, ...rest] = lib.lint().map(formatIssue);
    expect(first).toMatch(/^tag "Broken": notes metadata trailer is not valid JSON/);
    expect(rest).toEqual([
      'trigger "PV": notes declares recipes, but only tags, clients and transformations can',
      'variable "Const - Path": value declares a placeholder but holds "/contact", which would reach customers as is',
      'variable "Const - ID": notes holds the placeholder value "<id>" but declares no placeholder entry',
      'variable "DLV - x": notes declares a placeholder, but only constants hold customer values',
    ]);
    expect(lib.metadataOf({ kind: "tag", name: "Broken" })).toBeUndefined();
    expect(lib.select(["a"]).tag?.map((t) => t.notes)).toEqual([undefined]);
    expect(lib.select(["a"]).variable).toBeUndefined();
  });

  it("lints unknown recipe names, missing triggers, and dependencies outside the closure", async () => {
    const bad = defineContainer({
      variable: [
        manifestVariable({
          encoding: { name: "notes" },
          recipes: {
            a: {
              dependencies: [
                { constant: "Const - Missing", platform: "ga4", resource: "keyEvent" },
              ],
            },
            empty: {},
          },
        }),
      ],
      tag: [
        { name: "T1", type: "html", notes: meta("a") },
        { name: "T2", type: "html", notes: meta("typo") },
      ],
    });
    const { service } = createFakeService({
      containers: [{ accountId: "1", containerId: "10", publicId: "GTM-BAD", name: "bad" }],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await applySpec(client, { container: "GTM-BAD", workspace: "seed", spec: bad });
    const lib = await new GtmSnapshot(client, { container: "GTM-BAD" }).init();
    expect(lib.encoding.name).toBe("notes");
    expect(lib.lint().map(formatIssue)).toEqual([
      'tag "T2" declares recipe "typo", which is not in the manifest',
      'recipe "a" reaches no trigger, so its tags never fire',
      'recipe "a": dependencies[0].constant names "Const - Missing", which is not a variable in the recipe',
      'recipe "empty" has no entities declaring it',
      'recipe "typo" reaches no trigger, so its tags never fire',
    ]);
  });

  it("lints names only when the manifest or the options declare conventions", async () => {
    const { client } = await libraryFake();
    const quiet = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    expect(quiet.conventions).toBeNull();
    expect(quiet.lint()).toEqual([]);
    const strict = await new GtmSnapshot(
      client,
      { container: "GTM-TPL" },
      {
        conventions: { tagPrefixes: { html: "HTML - " } },
      }
    ).init();
    expect(strict.conventions?.tagPrefixes.html).toBe("HTML - ");
    expect(strict.lint().map(formatIssue)).toEqual([
      'tag "Unrelated": name must start with "HTML - " (html tags)',
    ]);
    const form = strict.recipe("form_submit")!;
    expect(strict.externalNameOf("form_submit", form.dependencies[0])).toBe("GTM - form_submit");
  });

  it("falls back to the notes encoding without a manifest", async () => {
    const { service } = createFakeService({
      containers: [{ accountId: "1", containerId: "10", publicId: "GTM-NM", name: "nm" }],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await applySpec(client, {
      container: "GTM-NM",
      workspace: "seed",
      spec: {
        trigger: [{ name: "PV", type: "pageview" }],
        tag: [{ name: "T", type: "html", notes: meta("x"), firingTriggerName: ["PV"] }],
      },
    });
    const lib = await new GtmSnapshot(client, { container: "GTM-NM" }).init();
    expect(lib.manifest).toBeNull();
    expect(lib.encoding.name).toBe("notes");
    expect(lib.recipe("x")?.description).toBeUndefined();
    expect(lib.select(["x"]).tag?.[0]?.notes).toBeUndefined();
    expect(lib.lint()).toEqual([]);
  });

  it("pushes the whole library back unchanged, declarations intact", async () => {
    const { client } = await libraryFake();
    const lib = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    const { plan } = await lib.push(client, { workspace: "roundtrip" }, { dryRun: true });
    expect(plan.errors).toEqual([]);
    expect(
      plan.ops.filter((o) => o.kind !== "workspace").every((o) => o.action === "unchanged")
    ).toBe(true);
    expect(lib.spec.tag?.find((t) => t.name === "GA4 - lead")?.notes).toContain("---");
  });

  it("stages entity edits without touching the pull, and reset() discards them", async () => {
    const { client } = await libraryFake();
    const lib = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    const before = JSON.stringify(lib.toJSON());
    const tags = new Map(lib.tags);
    tags.set("GA4 - call", {
      name: "GA4 - call",
      type: "gaawe",
      firingTriggerName: ["Click - call"],
      notes: meta("call_click"),
      parameter: [{ type: "template", key: "eventName", value: "call" }],
    });
    tags.delete("Unrelated");
    lib.tags = tags;
    expect(lib.isDirty).toBe(true);
    expect(lib.tags.has("Unrelated")).toBe(false);
    expect(lib.recipe("call_click")?.roots.map((r) => r.name)).toContain("GA4 - call");
    expect(lib.select(["call_click"]).tag?.map((t) => t.name)).toEqual([
      "Ads - call",
      "Conversion Linker",
      "GA4 - call",
    ]);
    expect(lib.spec.tag?.some((t) => t.name === "GA4 - call")).toBe(true);
    expect(lib.data.tag.some((t) => t.name === "GA4 - call")).toBe(false);
    expect(JSON.stringify(lib.toJSON())).toBe(before);
    lib.variables = [...lib.variables.values()].filter((v) => v.name !== "DLV - phone");
    expect(lib.variables.has("DLV - phone")).toBe(false);
    lib.reset();
    expect(lib.isDirty).toBe(false);
    expect(lib.tags.has("Unrelated")).toBe(true);
    expect(lib.variables.has("DLV - phone")).toBe(true);
    expect(lib.recipe("call_click")?.roots.map((r) => r.name)).not.toContain("GA4 - call");
  });

  it("gives literal recipe names for a const snapshot", async () => {
    const { client } = await libraryFake();
    const pulled = await new GtmSnapshot(client, { container: "GTM-TPL" }).init();
    const snapshot = {
      ...pulled.toJSON(),
      recipes: [
        { ...pulled.recipe("form_submit")!, name: "form_submit" },
        { ...pulled.recipe("call_click")!, name: "call_click" },
      ],
    } as const;
    const lib = GtmSnapshot.fromData(snapshot);
    lib.select(["form_submit"]);
    // @ts-expect-error "nope" is not a recipe of this library
    expect(() => lib.select(["nope"])).toThrow();
  });
});

describe("GtmSnapshot on a server container", () => {
  it("reaches clients through {{Client Name}} conditions and transformations by declaration", async () => {
    const { service } = createFakeService({
      containers: [
        {
          accountId: "1",
          containerId: "10",
          publicId: "GTM-SRV",
          name: "srv",
          usageContext: ["server"],
        },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await applySpec(client, {
      container: "GTM-SRV",
      workspace: "seed",
      spec: {
        containerType: "server",
        client: [{ name: "GA4 Client", type: "gaaw_client" }],
        transformation: [{ name: "Drop PII", type: "exclude_parameters", notes: meta("ga4") }],
        trigger: [
          {
            name: "GA4 events",
            type: "always",
            filter: [
              {
                type: "equals",
                parameter: [
                  { type: "template", key: "arg0", value: "{{Client Name}}" },
                  { type: "template", key: "arg1", value: "GA4 Client" },
                ],
              },
            ],
          },
        ],
        tag: [
          {
            name: "GA4",
            type: "sgtmgaaw",
            firingTriggerName: ["GA4 events"],
            notes: meta("ga4"),
          },
        ],
      },
    });
    const lib = await new GtmSnapshot(client, { container: "GTM-SRV" }).init();
    expect(lib.containerType).toBe("server");
    const spec = lib.select(["ga4"]);
    expect(spec.client?.map((c) => c.name)).toEqual(["GA4 Client"]);
    expect(spec.transformation?.map((t) => t.name)).toEqual(["Drop PII"]);
    expect(spec.tag?.map((t) => t.name)).toEqual(["GA4"]);
    expect(spec.builtInVariable).toEqual(["clientName"]);
    expect(validateSpec(spec)).toEqual([]);
  });
});

describe("built-in triggers in a library", () => {
  it("counts a built-in trigger as reached, so a Google tag recipe lints clean and pulls back by name", async () => {
    const { service } = createFakeService({
      containers: [{ accountId: "1", containerId: "10", publicId: "GTM-INIT", name: "init" }],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const spec = defineContainer({
      variable: [manifestVariable({ recipes: { google_tag: {} } })],
      tag: [
        {
          name: "Google Tag",
          type: "googtag",
          firingTriggerName: ["Initialization - All Pages"],
          notes: meta("google_tag"),
          parameter: [{ type: "template", key: "tagId", value: "G-1" }],
        },
      ],
    });
    await applySpec(client, { container: "GTM-INIT", workspace: "w", spec });
    const lib = await new GtmSnapshot(client, { container: "GTM-INIT" }).init();
    expect(lib.tags.get("Google Tag")?.firingTriggerName).toEqual(["Initialization - All Pages"]);
    expect(lib.lint()).toEqual([]);
    expect(lib.recipe("google_tag")?.entities.map((r) => `${r.kind}:${r.name}`)).toEqual([
      "tag:Google Tag",
      "trigger:Initialization - All Pages",
    ]);
    expect(lib.select(["google_tag"]).trigger).toBeUndefined();
  });
});
