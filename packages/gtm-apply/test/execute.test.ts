import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { normalizeExport } from "../src/spec/normalize.js";
import { applySpec, executePlan } from "../src/spec/execute.js";
import { planContainerSpec } from "../src/spec/plan.js";
import type { ContainerSpec } from "../src/spec/types.js";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";

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
  it("writes to the workspace and creates no version by default", async () => {
    const { client, state } = fresh();
    const { plan, result } = await applySpec(client, { ...base, spec: fixtureSpec() });
    expect(plan.errors).toEqual([]);
    expect(plan.ops.some((o) => o.kind === "version")).toBe(false);
    expect(result?.published).toBe(false);
    expect(result?.versionPath).toBeUndefined();
    expect(state.calls).not.toContain("workspaces.create_version");
    expect(state.versions).toEqual([]);

    // The workspace stays, holding the applied entities, and the result points at it.
    const [ws] = state.workspaces;
    expect(ws?.name).toBe(base.workspace);
    expect(result?.workspacePath).toBe(ws.path);
    expect(result?.workspaceUrl).toBe(`https://tagmanager.google.com/#/container/${ws.path}`);
    expect(state.tags.map((t) => t.name)).toEqual(["Ads - Lead"]);
  });

  it("a second apply to the same workspace with the same spec is a no-op", async () => {
    const { client, state } = fresh();
    const first = await applySpec(client, { ...base, spec: fixtureSpec() });
    const callsBefore = state.calls.length;
    const second = await applySpec(client, { ...base, spec: fixtureSpec() });
    expect(second.result?.workspacePath).toBe(first.result?.workspacePath);
    expect(writes(state.calls.slice(callsBefore))).toEqual([]);
    expect(second.result?.ops.every((o) => o.action === "unchanged")).toBe(true);
    expect(second.result?.versionPath).toBeUndefined();
    expect(state.workspaces).toHaveLength(1);
  });

  it("creates everything in dependency order and a version when asked, without publishing", async () => {
    const { client, state } = fresh();
    const { plan, result } = await applySpec(client, {
      ...base,
      spec: fixtureSpec(),
      version: true,
    });
    expect(plan.errors).toEqual([]);
    expect(result?.published).toBe(false);
    expect(result?.versionPath).toBe(state.versions[0].path);
    expect(state.versions[0].name).toBe(base.workspace);

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

  it("after a version, a second apply recreates the workspace and creates no new version", async () => {
    const { client, state } = fresh();
    await applySpec(client, { ...base, spec: fixtureSpec(), version: true });
    const callsBefore = state.calls.length;
    // The first apply's version deleted the workspace, so the second apply recreates it
    // (branching from the latest version) and finds nothing to change: no new version.
    const { result } = await applySpec(client, { ...base, spec: fixtureSpec(), version: true });
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

  it("versions a workspace that an earlier apply left changes in", async () => {
    const { client, state } = fresh();
    // Apply, review in the UI, then cut the version: the second run changes nothing
    // itself, but the workspace holds changes against the latest version.
    await applySpec(client, { ...base, spec: fixtureSpec() });
    const { plan, result } = await applySpec(client, {
      ...base,
      spec: fixtureSpec(),
      version: true,
    });
    expect(plan.ops.find((o) => o.kind === "version")).toMatchObject({ action: "create" });
    expect(result?.versionPath).toBe(state.versions[0].path);
    expect(latestSnapshot(state).tag).toHaveLength(1);
  });

  it("names and describes the version from the version option", async () => {
    const { client, state } = fresh();
    await applySpec(client, {
      ...base,
      spec: fixtureSpec(),
      version: { name: "v1", notes: "Adds the lead tag." },
    });
    expect(state.versions.at(-1)).toMatchObject({ name: "v1", description: "Adds the lead tag." });
  });

  it("creates a version when publish is requested even with no changes", async () => {
    const { client, state } = fresh();
    await applySpec(client, { ...base, spec: fixtureSpec(), version: true });
    const { result } = await applySpec(client, { ...base, spec: fixtureSpec(), publish: true });
    expect(result?.published).toBe(true);
    expect(state.versions).toHaveLength(2);
  });

  it("updates a changed tag with the fingerprint", async () => {
    const { client, state } = fresh();
    await applySpec(client, { ...base, spec: fixtureSpec(), version: true });
    const spec = fixtureSpec();
    spec.tag![0].parameter![1].value = "changed";
    const { result } = await applySpec(client, { ...base, spec, version: true });
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
    const plan = await planContainerSpec(client, base, fixtureSpec(), { version: true });
    await expect(executePlan(client, plan, { version: true })).rejects.toThrow(/merge conflict/i);
    expect(state.versions).toHaveLength(0);
  });
});

describe("built-in triggers", () => {
  it("fires a tag on Initialization - All Pages without a trigger in the spec or the container", async () => {
    const { client, state } = fresh();
    const spec: ContainerSpec = {
      tag: [
        {
          name: "Google Tag",
          type: "googtag",
          firingTriggerName: ["Initialization - All Pages"],
          blockingTriggerName: ["All Pages"],
          parameter: [{ type: "template", key: "tagId", value: "G-1" }],
        },
      ],
    };
    const { plan, result } = await applySpec(client, { ...base, spec, version: true });
    expect(plan.errors).toEqual([]);
    expect(result?.published).toBe(false);
    const snap = latestSnapshot(state);
    expect(snap.trigger).toEqual([]);
    expect(snap.tag[0].firingTriggerId).toEqual(["2147479573"]);
    expect(snap.tag[0].blockingTriggerId).toEqual(["2147479553"]);
    // Round trip: the pulled version names the built-in again.
    const again = await planContainerSpec(client, base, spec);
    expect(again.errors).toEqual([]);
    expect(again.ops.find((o) => o.kind === "tag")?.action).toBe("unchanged");
  });
});
