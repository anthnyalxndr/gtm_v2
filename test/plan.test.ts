import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { GtmClient } from "../src/gtm_v2.js";
import { normalizeExport } from "../src/spec/normalize.js";
import { planContainerSpec, sortVariablesByReference, formatPlan } from "../src/spec/plan.js";
import { executePlan } from "../src/spec/execute.js";
import type { ContainerSpec } from "../src/spec/types.js";
import { createFakeService } from "./helpers/fakeService.js";

const target = { container: "GTM-ABC123", workspace: "conv-2026-09" };
const fixtureSpec = (): ContainerSpec =>
  normalizeExport(
    JSON.parse(readFileSync(new URL("./fixtures/ui-export.json", import.meta.url), "utf-8"))
  );

function fresh() {
  const { service, state } = createFakeService();
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

describe("planContainerSpec", () => {
  it("plans all creates against an empty container, with implicit workspace", async () => {
    const { client } = fresh();
    const plan = await planContainerSpec(client, target, fixtureSpec());
    expect(plan.errors).toEqual([]);
    expect(plan.workspacePath).toBeNull();
    const byKind = (k: string) => plan.ops.filter((o) => o.kind === k);
    expect(byKind("workspace")[0]).toMatchObject({ action: "create", implicit: true });
    expect(byKind("folder").map((o) => o.name)).toEqual(["Conversions"]);
    expect(
      byKind("builtIn")
        .map((o) => o.name)
        .sort()
    ).toEqual(["formId", "pagePath"]);
    expect(byKind("variable")).toHaveLength(2);
    expect(byKind("trigger")).toHaveLength(2);
    expect(byKind("tag")).toHaveLength(1);
    expect(byKind("version")).toHaveLength(1);
    expect(byKind("publish")).toHaveLength(0);
    expect(plan.ops.filter((o) => o.kind !== "workspace").every((o) => o.action === "create")).toBe(
      true
    );
  });

  it("is all unchanged after an execute", async () => {
    const { client } = fresh();
    const first = await planContainerSpec(client, target, fixtureSpec());
    await executePlan(client, first);
    const second = await planContainerSpec(client, target, fixtureSpec());
    expect(second.errors).toEqual([]);
    expect(second.workspacePath).not.toBeNull();
    const entityOps = second.ops.filter((o) => o.kind !== "version");
    expect(entityOps.every((o) => o.action === "unchanged")).toBe(true);
  });

  it("plans an update when a parameter changes", async () => {
    const { client } = fresh();
    await executePlan(client, await planContainerSpec(client, target, fixtureSpec()));
    const spec = fixtureSpec();
    spec.tag![0].parameter![1].value = "changed";
    const plan = await planContainerSpec(client, target, spec);
    expect(plan.ops.find((o) => o.kind === "tag")).toMatchObject({ action: "update" });
    expect(plan.ops.find((o) => o.kind === "variable")).toMatchObject({ action: "unchanged" });
  });

  it("errors on a trigger reference that exists nowhere", async () => {
    const { client } = fresh();
    const spec = fixtureSpec();
    spec.tag![0].firingTriggerName = ["Missing Trigger"];
    const plan = await planContainerSpec(client, target, spec);
    expect(plan.errors).toEqual([
      'tag "Ads - Lead" fires on trigger "Missing Trigger", which is not in the spec or the container',
    ]);
  });

  it("errors on an unknown variable reference but infers built-ins", async () => {
    const { client } = fresh();
    const spec: ContainerSpec = {
      tag: [
        {
          name: "T",
          type: "html",
          parameter: [{ type: "template", key: "html", value: "{{Click URL}} {{Nope}}" }],
        },
      ],
    };
    const plan = await planContainerSpec(client, target, spec);
    expect(plan.errors).toEqual([
      "{{Nope}} is referenced but is not in the spec, the container, or the built-in catalog",
    ]);
    expect(plan.ops.find((o) => o.kind === "builtIn")).toMatchObject({
      name: "clickUrl",
      action: "create",
      implicit: true,
    });
  });

  it("adds a referenced folder implicitly", async () => {
    const { client } = fresh();
    const spec: ContainerSpec = {
      trigger: [{ name: "PV", type: "pageview", parentFolderName: "Core" }],
    };
    const plan = await planContainerSpec(client, target, spec);
    expect(plan.errors).toEqual([]);
    expect(plan.ops.find((o) => o.kind === "folder")).toMatchObject({
      name: "Core",
      action: "create",
      implicit: true,
    });
    expect(plan.spec.folder).toEqual([{ name: "Core" }]);
  });

  it("rejects duplicate names and missing names", async () => {
    const { client } = fresh();
    const spec: ContainerSpec = {
      trigger: [
        { name: "PV", type: "pageview" },
        { name: "PV", type: "pageview" },
        { type: "pageview" },
      ],
    };
    const plan = await planContainerSpec(client, target, spec);
    expect(plan.errors).toEqual([
      'duplicate trigger name "PV" in spec',
      "trigger entry without a name",
    ]);
  });

  it("includes a publish op when requested", async () => {
    const { client } = fresh();
    const plan = await planContainerSpec(client, target, {}, { publish: true });
    expect(plan.ops.map((o) => o.kind)).toEqual(["workspace", "version", "publish"]);
  });

  it("formats the plan with labels", async () => {
    const { client } = fresh();
    const spec = fixtureSpec();
    spec.tag![0].firingTriggerName = ["Missing Trigger"];
    const text = formatPlan(await planContainerSpec(client, target, spec));
    expect(text).toContain('[+] workspace "conv-2026-09" (implicit)');
    expect(text).toContain('[+] tag "Ads - Lead"');
    expect(text).toContain('[!] tag "Ads - Lead" fires on trigger');
  });
});

describe("sortVariablesByReference", () => {
  it("orders referenced variables first and keeps stable order otherwise", () => {
    const sorted = sortVariablesByReference([
      {
        name: "C",
        type: "c",
        parameter: [{ type: "template", key: "value", value: "{{A}}{{B}}" }],
      },
      { name: "A", type: "c" },
      { name: "B", type: "c", parameter: [{ type: "template", key: "value", value: "{{A}}" }] },
    ]);
    expect(sorted.map((v) => v.name)).toEqual(["A", "B", "C"]);
  });

  it("throws on a cycle", () => {
    expect(() =>
      sortVariablesByReference([
        { name: "A", type: "c", parameter: [{ type: "template", key: "value", value: "{{B}}" }] },
        { name: "B", type: "c", parameter: [{ type: "template", key: "value", value: "{{A}}" }] },
      ])
    ).toThrow(/cycle/);
  });
});
