import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { GtmClient } from "../src/gtm_v2.js";
import { normalizeExport } from "../src/spec/normalize.js";
import { applySpec, executePlan } from "../src/spec/execute.js";
import { planContainerSpec } from "../src/spec/plan.js";
import type { ContainerSpec } from "../src/spec/types.js";
import { createFakeService, latestSnapshot } from "./helpers/fakeService.js";

const base = { container: "GTM-ABC123", workspace: "conv-2026-09" };
const fixtureSpec = (): ContainerSpec =>
  normalizeExport(
    JSON.parse(readFileSync(new URL("./fixtures/ui-export.json", import.meta.url), "utf-8"))
  );

function fresh() {
  const { service, state } = createFakeService();
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

const writes = (calls: string[]) =>
  calls.filter((c) => /\.(create|update|publish|create_version)$/.test(c));

describe("applySpec", () => {
  it("creates everything in dependency order and a version, without publishing", async () => {
    const { client, state } = fresh();
    const { plan, result } = await applySpec(client, { ...base, spec: fixtureSpec() });
    expect(plan.errors).toEqual([]);
    expect(result?.published).toBe(false);
    expect(result?.versionPath).toBe(state.versions[0].path);

    // The version captured the workspace and Tag Manager then deleted the workspace.
    expect(state.calls).toContain("workspace.create");
    expect(state.workspaces).toEqual([]);
    const snap = latestSnapshot(state);
    expect([...snap.builtIns].sort()).toEqual(["formId", "pagePath"]);
    expect(snap.folder.map((f) => f.name)).toEqual(["Conversions"]);
    expect(snap.variable.map((v) => v.name)).toEqual([
      "Const - Google Ads Conversion ID",
      "Const - Upper Value",
    ]);
    expect(snap.trigger.map((t) => t.name)).toEqual([
      "Custom Event - lead",
      "Form Submit - contact",
    ]);
    expect(snap.tag).toHaveLength(1);

    const tag = snap.tag[0];
    expect(tag.firingTriggerId).toEqual(snap.trigger.map((t) => t.triggerId));
    expect(tag.parentFolderId).toBe(snap.folder[0].folderId);
    expect(tag).not.toHaveProperty("firingTriggerName");
    expect(tag).not.toHaveProperty("parentFolderName");
    expect(snap.variable[0].parentFolderId).toBe(snap.folder[0].folderId);

    const order = writes(state.calls);
    expect(order.indexOf("folder.create")).toBeLessThan(order.indexOf("variable.create"));
    expect(order.lastIndexOf("variable.create")).toBeLessThan(order.indexOf("trigger.create"));
    expect(order.lastIndexOf("trigger.create")).toBeLessThan(order.indexOf("tag.create"));
    expect(order[order.length - 1]).toBe("workspaces.create_version");
    expect(state.published).toEqual([]);
  });

  it("is idempotent on a second apply", async () => {
    const { client, state } = fresh();
    await applySpec(client, { ...base, spec: fixtureSpec() });
    const callsBefore = state.calls.length;
    // The first apply's version deleted the workspace, so the second apply recreates it
    // (branching from the latest version) and finds nothing to change: no new version.
    const { result } = await applySpec(client, { ...base, spec: fixtureSpec() });
    const newWrites = writes(state.calls.slice(callsBefore));
    expect(newWrites).toEqual(["workspace.create"]);
    expect(
      result?.ops
        .filter((o) => o.kind === "tag" || o.kind === "trigger")
        .every((o) => o.action === "unchanged")
    ).toBe(true);
    expect(result?.versionPath).toBeUndefined();
    expect(latestSnapshot(state).tag).toHaveLength(1);
    expect(state.versions).toHaveLength(1);
  });

  it("creates a version when publish is requested even with no changes", async () => {
    const { client, state } = fresh();
    await applySpec(client, { ...base, spec: fixtureSpec() });
    const { result } = await applySpec(client, { ...base, spec: fixtureSpec(), publish: true });
    expect(result?.published).toBe(true);
    expect(state.versions).toHaveLength(2);
  });

  it("updates a changed tag with the fingerprint", async () => {
    const { client, state } = fresh();
    await applySpec(client, { ...base, spec: fixtureSpec() });
    const spec = fixtureSpec();
    spec.tag![0].parameter![1].value = "changed";
    const { result } = await applySpec(client, { ...base, spec });
    expect(result?.ops.find((o) => o.kind === "tag")).toMatchObject({ action: "update" });
    expect(state.calls).toContain("tag.update");
    expect(latestSnapshot(state).tag[0].parameter?.[1]?.value).toBe("changed");
    expect(state.versions).toHaveLength(2);
  });

  it("publishes when asked", async () => {
    const { client, state } = fresh();
    const { result } = await applySpec(client, { ...base, spec: fixtureSpec(), publish: true });
    expect(result?.published).toBe(true);
    expect(state.published).toEqual([result?.versionPath]);
  });

  it("dry run makes no write calls", async () => {
    const { client, state } = fresh();
    const { plan, result } = await applySpec(client, {
      ...base,
      spec: fixtureSpec(),
      dryRun: true,
    });
    expect(result).toBeUndefined();
    expect(plan.ops.length).toBeGreaterThan(0);
    expect(writes(state.calls)).toEqual([]);
  });

  it("refuses to execute a plan with errors", async () => {
    const { client, state } = fresh();
    const spec = fixtureSpec();
    spec.tag![0].firingTriggerName = ["Missing"];
    await expect(applySpec(client, { ...base, spec })).rejects.toThrow(/Plan has 1 error/);
    expect(writes(state.calls)).toEqual([]);
  });

  it("aborts on merge conflicts before creating a version", async () => {
    const { client, state } = fresh();
    state.mergeConflicts = 1;
    const plan = await planContainerSpec(client, base, fixtureSpec());
    await expect(executePlan(client, plan)).rejects.toThrow(/merge conflict/i);
    expect(state.versions).toHaveLength(0);
  });
});
