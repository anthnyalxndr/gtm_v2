import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, type FakeState } from "@anthnyalxndr/gtm-client/testing";
import { containerTypeOf, pullSnapshot, snapshotToSpec } from "../src/snapshot/pull.js";

const containerPath = "accounts/1/containers/10";

function serverFake() {
  const { service, state } = createFakeService({
    containers: [
      {
        accountId: "1",
        containerId: "10",
        publicId: "GTM-SRV123",
        name: "sst.acme.com",
        usageContext: ["server"],
      },
    ],
    environments: [
      {
        path: `${containerPath}/environments/1`,
        name: "Live",
        type: "live",
        containerVersionId: "0",
      },
      {
        path: `${containerPath}/environments/2`,
        name: "Latest",
        type: "latest",
        containerVersionId: "0",
      },
    ],
    destinations: [
      { path: `${containerPath}/destinations/AW-1`, destinationId: "AW-1", name: "Ads" },
    ],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

/** Create a workspace holding one of every entity kind and version it. */
async function seedVersion(client: GtmClient, state: FakeState): Promise<string> {
  const ws = client.service.accounts.containers.workspaces;
  const created = await ws.create({ parent: containerPath, requestBody: { name: "seed" } });
  const parent = created.data.path!;
  await ws.folders.create({ parent, requestBody: { name: "Server" } });
  await ws.variables.create({ parent, requestBody: { name: "Const - Ads", type: "c" } });
  await ws.triggers.create({ parent, requestBody: { name: "All Pages", type: "always" } });
  await ws.tags.create({ parent, requestBody: { name: "GA4", type: "sgtmgaaw" } });
  await ws.clients.create({ parent, requestBody: { name: "GA4 Client", type: "gaaw_client" } });
  await ws.transformations.create({
    parent,
    requestBody: { name: "Drop PII", type: "exclude_parameters" },
  });
  await ws.templates.create({ parent, requestBody: { name: "Tpl", templateData: "___INFO___" } });
  await ws.zones.create({ parent, requestBody: { name: "Zone" } });
  await ws.gtag_config.create({ parent, requestBody: { type: "googtag" } });
  await ws.built_in_variables.create({ parent, type: ["requestPath"] });
  await ws.create_version({ path: parent, requestBody: { name: "v1" } });
  const versionId = state.versions[state.versions.length - 1].versionId;
  // Point the environments at the new version, as Tag Manager does for Latest and Live.
  for (const e of state.environments) e.containerVersionId = versionId;
  return versionId;
}

describe("containerTypeOf", () => {
  it("maps usage contexts to one container type", () => {
    expect(containerTypeOf(["web"])).toBe("web");
    expect(containerTypeOf(["server"])).toBe("server");
    expect(containerTypeOf(["android", "androidSdk5"])).toBe("android");
    expect(containerTypeOf(["iosSdk5"])).toBe("ios");
    expect(containerTypeOf(["amp"])).toBe("amp");
    expect(() => containerTypeOf([])).toThrow(/usageContext/);
  });
});

describe("pullSnapshot", () => {
  it("reads a server container's latest version with every collection", async () => {
    const { client, state } = serverFake();
    const versionId = await seedVersion(client, state);
    const snap = await pullSnapshot(client, { container: "GTM-SRV123" });
    expect(snap.containerType).toBe("server");
    expect(snap.container.publicId).toBe("GTM-SRV123");
    expect(snap.workspace).toBeNull();
    expect(snap.versionHeader?.containerVersionId).toBe(versionId);
    expect(snap.environments.map((e) => e.name)).toEqual(["Live", "Latest"]);
    expect(snap.environment?.name).toBe("Live");
    expect(snap.destinations.map((d) => d.destinationId)).toEqual(["AW-1"]);
    expect(snap.folder.map((f) => f.name)).toEqual(["Server"]);
    expect(snap.variable.map((v) => v.name)).toEqual(["Const - Ads"]);
    expect(snap.trigger.map((t) => t.name)).toEqual(["All Pages"]);
    expect(snap.tag.map((t) => t.name)).toEqual(["GA4"]);
    expect(snap.client.map((c) => c.name)).toEqual(["GA4 Client"]);
    expect(snap.transformation.map((t) => t.name)).toEqual(["Drop PII"]);
    expect(snap.template.map((t) => t.name)).toEqual(["Tpl"]);
    expect(snap.zone.map((z) => z.name)).toEqual(["Zone"]);
    expect(snap.gtagConfig.map((g) => g.type)).toEqual(["googtag"]);
    expect(snap.builtInVariable.map((b) => b.type)).toEqual(["requestPath"]);
    expect(snap.source).toEqual({ container: "GTM-SRV123" });
    expect(snap.pulledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("reads a workspace and agrees with the version it branched from", async () => {
    const { client, state } = serverFake();
    await seedVersion(client, state);
    await client.service.accounts.containers.workspaces.create({
      parent: containerPath,
      requestBody: { name: "wip" },
    });
    const fromVersion = await pullSnapshot(client, { container: "GTM-SRV123" });
    const fromWorkspace = await pullSnapshot(client, { container: "GTM-SRV123", workspace: "wip" });
    expect(fromWorkspace.workspace?.name).toBe("wip");
    expect(fromWorkspace.environment).toBeNull();
    expect(fromWorkspace.versionHeader).toEqual(fromVersion.versionHeader);
    const names = (s: typeof fromVersion) => ({
      folder: s.folder.map((e) => e.name),
      variable: s.variable.map((e) => e.name),
      trigger: s.trigger.map((e) => e.name),
      tag: s.tag.map((e) => e.name),
      client: s.client.map((e) => e.name),
      transformation: s.transformation.map((e) => e.name),
      template: s.template.map((e) => e.name),
      zone: s.zone.map((e) => e.name),
      gtagConfig: s.gtagConfig.map((e) => e.type),
      builtIns: s.builtInVariable.map((e) => e.type),
    });
    expect(names(fromWorkspace)).toEqual(names(fromVersion));
  });

  it("reads the live version and a version by id", async () => {
    const { client, state } = serverFake();
    const v1 = await seedVersion(client, state);
    await client.service.accounts.containers.versions.publish({
      path: `${containerPath}/versions/${v1}`,
    });
    const live = await pullSnapshot(client, { container: "GTM-SRV123", version: "live" });
    expect(live.versionHeader?.containerVersionId).toBe(v1);
    const byId = await pullSnapshot(client, { container: "GTM-SRV123", version: v1 });
    expect(byId.tag.map((t) => t.name)).toEqual(["GA4"]);
  });

  it("rejects a source naming both a workspace and a version, and a missing workspace", async () => {
    const { client, state } = serverFake();
    await seedVersion(client, state);
    await expect(
      pullSnapshot(client, { container: "GTM-SRV123", workspace: "x", version: "live" })
    ).rejects.toThrow(/not both/);
    await expect(
      pullSnapshot(client, { container: "GTM-SRV123", workspace: "nope" })
    ).rejects.toThrow(/Workspace "nope" not found/);
  });

  it("defaults to a web container and converts the apply-able part to a spec", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ws = client.service.accounts.containers.workspaces;
    const created = await ws.create({ parent: containerPath, requestBody: { name: "seed" } });
    const parent = created.data.path!;
    const folder = await ws.folders.create({ parent, requestBody: { name: "Core" } });
    await ws.triggers.create({
      parent,
      requestBody: { name: "PV", type: "pageview", parentFolderId: folder.data.folderId },
    });
    await ws.create_version({ path: parent, requestBody: {} });
    const snap = await pullSnapshot(client, { container: "GTM-ABC123" });
    expect(snap.containerType).toBe("web");
    expect(snap.environment).toBeNull();
    expect(state.calls).toContain("containers.get");
    expect(snapshotToSpec(snap)).toEqual({
      containerType: "web",
      folder: [{ name: "Core" }],
      trigger: [{ name: "PV", type: "pageview", parentFolderName: "Core" }],
    });
  });
});
