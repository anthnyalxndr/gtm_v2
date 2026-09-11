import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { normalizeExport, NormalizeError } from "../src/spec/normalize.js";
import { closure } from "../src/library/closure.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";
import { GtmSnapshot } from "../src/library/gtm-snapshot.js";
import { manifestVariable } from "../src/library/manifest.js";
import { formatNotes } from "../src/library/metadata.js";
import { formatIssue } from "../src/spec/validate.js";

/** A UI/API export with one local and one gallery template, each used by a tag. */
const exportWithTemplates = {
  containerType: "web",
  customTemplate: [
    {
      name: "Consent Pro",
      templateData: "// local template code",
      containerId: "30631005",
      templateId: "218",
      accountId: "1",
      workspaceId: "2",
      fingerprint: "9",
      path: "accounts/1/containers/30631005/workspaces/2/templates/218",
    },
    {
      name: "LinkedIn Insight Tag 2.0",
      templateData: "// gallery template code",
      containerId: "30631005",
      templateId: "219",
      galleryReference: {
        host: "github.com",
        owner: "linkedin",
        repository: "insight-tag",
        version: "abc123sha",
        galleryTemplateId: "TB7ZX",
        signature: "sig-that-recomputes",
        templateDeveloperId: "dev-1",
      },
    },
  ],
  tag: [
    { name: "Consent Init", type: "cvt_30631005_218" },
    { name: "LinkedIn Insight", type: "cvt_TB7ZX" },
  ],
  variable: [{ name: "LI Var", type: "cvt_TB7ZX", parameter: [] }],
};

describe("normalizeExport with custom templates", () => {
  it("carries templates by name and rewrites cvt_ types to name references", () => {
    const spec = normalizeExport(exportWithTemplates);
    expect(spec.customTemplate).toEqual([
      { name: "Consent Pro", templateData: "// local template code" },
      {
        name: "LinkedIn Insight Tag 2.0",
        templateData: "// gallery template code",
        galleryReference: {
          host: "github.com",
          owner: "linkedin",
          repository: "insight-tag",
          version: "abc123sha",
          galleryTemplateId: "TB7ZX",
        },
      },
    ]);
    expect(spec.tag?.map((t) => t.type)).toEqual([
      "cvt:Consent Pro",
      "cvt:LinkedIn Insight Tag 2.0",
    ]);
    expect(spec.variable?.[0].type).toBe("cvt:LinkedIn Insight Tag 2.0");
  });

  it("is idempotent: a normalized spec normalizes to itself", () => {
    const once = normalizeExport(exportWithTemplates);
    expect(normalizeExport(once)).toEqual(once);
  });

  it("throws when a cvt_ type has no matching template in the export", () => {
    expect(() =>
      normalizeExport({ containerType: "web", tag: [{ name: "Orphan", type: "cvt_999_1" }] })
    ).toThrow(NormalizeError);
  });
});

describe("closure includes the template a tag or variable is built on", () => {
  it("reaches the customTemplate from a tag root and a variable root", () => {
    const spec = defineContainer({
      customTemplate: [{ name: "Consent Pro", templateData: "x" }],
      variable: [{ name: "LI Var", type: "cvt:Consent Pro", parameter: [] }],
      trigger: [{ name: "PV", type: "pageview" }],
      tag: [{ name: "Consent Init", type: "cvt:Consent Pro", firingTriggerName: ["PV"] }],
    });
    expect(
      closure(spec, [{ kind: "tag", name: "Consent Init" }]).map((r) => `${r.kind}:${r.name}`)
    ).toEqual(["tag:Consent Init", "customTemplate:Consent Pro", "trigger:PV"]);
    expect(
      closure(spec, [{ kind: "variable", name: "LI Var" }]).map((r) => `${r.kind}:${r.name}`)
    ).toEqual(["variable:LI Var", "customTemplate:Consent Pro"]);
  });
});

async function targetFake() {
  const { service, state } = createFakeService({
    containers: [{ accountId: "1", containerId: "11", publicId: "GTM-CUST", name: "customer.com" }],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

describe("apply creates templates before the entities that use them", () => {
  it("creates a local template and rewrites the tag type to the target container's cvt_ id", async () => {
    const { client, state } = await targetFake();
    const spec = defineContainer({
      customTemplate: [{ name: "Consent Pro", templateData: "// code" }],
      trigger: [{ name: "PV", type: "pageview" }],
      tag: [{ name: "Consent Init", type: "cvt:Consent Pro", firingTriggerName: ["PV"] }],
    });
    const { plan, result } = await applySpec(client, {
      container: "GTM-CUST",
      workspace: "onboarding",
      spec,
    });
    expect(plan.errors).toEqual([]);
    expect(result?.ops.map((o) => `${o.kind}:${o.action}`)).toContain("customTemplate:create");
    const snap = latestSnapshot(state);
    expect(snap.template.map((t) => t.name)).toEqual(["Consent Pro"]);
    const tag = snap.tag.find((t) => t.name === "Consent Init")!;
    const templateId = snap.template[0].templateId;
    expect(tag.type).toBe(`cvt_11_${templateId}`);

    const rerun = await applySpec(client, {
      container: "GTM-CUST",
      workspace: "onboarding-2",
      spec,
      dryRun: true,
    });
    expect(
      rerun.plan.ops.filter((o) => o.kind !== "workspace").every((o) => o.action === "unchanged")
    ).toBe(true);
  });

  it("installs a gallery template through import_from_gallery and uses its gallery cvt_ id", async () => {
    const { client, state } = await targetFake();
    const spec = defineContainer({
      customTemplate: [
        {
          name: "LinkedIn Insight Tag 2.0",
          templateData: "// gallery code",
          galleryReference: {
            host: "github.com",
            owner: "linkedin",
            repository: "insight-tag",
            version: "abc123sha",
            galleryTemplateId: "TB7ZX",
          },
        },
      ],
      trigger: [{ name: "PV", type: "pageview" }],
      tag: [
        {
          name: "LinkedIn Insight",
          type: "cvt:LinkedIn Insight Tag 2.0",
          firingTriggerName: ["PV"],
        },
      ],
    });
    const { plan } = await applySpec(client, {
      container: "GTM-CUST",
      workspace: "onboarding",
      spec,
    });
    expect(plan.errors).toEqual([]);
    expect(state.calls).toContain("template.import_from_gallery");
    const snap = latestSnapshot(state);
    expect(snap.tag.find((t) => t.name === "LinkedIn Insight")?.type).toBe("cvt_TB7ZX");

    const rerun = await applySpec(client, {
      container: "GTM-CUST",
      workspace: "onboarding-2",
      spec,
      dryRun: true,
    });
    expect(
      rerun.plan.ops.filter((o) => o.kind !== "workspace").every((o) => o.action === "unchanged")
    ).toBe(true);
  });
});

describe("library round trip with a custom template tag", () => {
  async function seededLibrary() {
    const { service, state } = createFakeService({
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-TPL", name: "Web Template" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await applySpec(client, {
      container: "GTM-TPL",
      workspace: "seed",
      spec: defineContainer({
        variable: [manifestVariable({ recipes: { consent: { description: "Consent init" } } })],
        customTemplate: [{ name: "Consent Pro", templateData: "// code" }],
        trigger: [{ name: "PV", type: "pageview" }],
        tag: [
          {
            name: "Consent Init",
            type: "cvt:Consent Pro",
            firingTriggerName: ["PV"],
            notes: formatNotes("Loads consent defaults.", { recipes: ["consent"] }),
          },
        ],
      }),
    });
    void state;
    return new GtmSnapshot(client, { container: "GTM-TPL" }).init();
  }

  it("pulls the template back to a name reference and select() brings it along", async () => {
    const lib = await seededLibrary();
    expect(lib.spec.customTemplate?.map((t) => t.name)).toEqual(["Consent Pro"]);
    expect(lib.tags.get("Consent Init")?.type).toBe("cvt:Consent Pro");
    const selected = lib.select(["consent"]);
    expect(selected.customTemplate?.map((t) => t.name)).toEqual(["Consent Pro"]);
    expect(selected.tag?.map((t) => t.name)).toEqual(["Consent Init"]);
    expect(lib.lint()).toEqual([]);
  });

  it("lints a cvt_ type whose template is not in the library", async () => {
    // A committed library whose template was removed but whose tag still names
    // it: the tag type is the cvt:<name> sentinel with no matching template.
    const lib = await seededLibrary();
    const json = JSON.parse(JSON.stringify(lib.toJSON()));
    json.data.customTemplate = [];
    json.data.tag = json.data.tag.map((t: { type?: string }) =>
      t.type?.startsWith("cvt_") ? { ...t, type: "cvt:Ghost Template" } : t
    );
    const broken = GtmSnapshot.fromData(json);
    expect(broken.lint().map(formatIssue)).toContain(
      'tag "Consent Init": type is built on custom template "Ghost Template", which is not in the library'
    );
  });
});
