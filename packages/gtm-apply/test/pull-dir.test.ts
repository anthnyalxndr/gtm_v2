import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GtmClient, type tagmanager_v2 } from "@anthnyalxndr/gtm-client";
import { createFakeService, type FakeState } from "@anthnyalxndr/gtm-client/testing";
import {
  containerSlug,
  pullAccount,
  pullContainer,
  RECORD_FILE,
  SNAPSHOT_FILE,
  SPEC_FILE,
} from "../src/snapshot/dir.js";

const containerPath = "accounts/1/containers/10";

describe("containerSlug", () => {
  it("lowercases the name and collapses runs of other characters to one dash", () => {
    expect(containerSlug("acme.com", "GTM-AAA")).toBe("acme-com");
    expect(containerSlug("Acme Web (prod)", "GTM-AAA")).toBe("acme-web-prod");
    expect(containerSlug("sst.acme.com", "GTM-AAA")).toBe("sst-acme-com");
    expect(containerSlug("  --Acme--  ", "GTM-AAA")).toBe("acme");
  });

  it("falls back to the lowercased public id when the name yields nothing", () => {
    expect(containerSlug("", "GTM-AAA")).toBe("gtm-aaa");
    expect(containerSlug("()", "GTM-AAA")).toBe("gtm-aaa");
  });
});

function fake() {
  const { service, state } = createFakeService({
    accounts: [{ accountId: "1", name: "Acme" }],
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
      { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
    ],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

/** A workspace with a constant, a trigger and a tag that fires on it, versioned. Returns the version id. */
async function seedLeadVersion(
  client: GtmClient,
  state: FakeState,
  path = containerPath,
  extraTagParameter: tagmanager_v2.Schema$Parameter[] = []
): Promise<string> {
  const ws = client.service.accounts.containers.workspaces;
  const created = await ws.create({ parent: path, requestBody: { name: "seed" } });
  const parent = created.data.path!;
  await ws.variables.create({
    parent,
    requestBody: {
      name: "Const - Ads ID",
      type: "c",
      parameter: [{ type: "template", key: "value", value: "AW-1" }],
    },
  });
  const trigger = await ws.triggers.create({
    parent,
    requestBody: { name: "Custom Event - lead", type: "customEvent" },
  });
  await ws.tags.create({
    parent,
    requestBody: {
      name: "Ads - Lead",
      type: "awct",
      firingTriggerId: [trigger.data.triggerId!],
      parameter: [
        { type: "template", key: "conversionLabel", value: "xyz" },
        { type: "template", key: "conversionId", value: "{{Const - Ads ID}}" },
        ...extraTagParameter,
      ],
    },
  });
  await ws.create_version({ path: parent, requestBody: { name: "lead v1" } });
  return state.versions[state.versions.length - 1].versionId;
}

const tmp = () => mkdtemp(join(tmpdir(), "gtm-pull-"));

describe("pullContainer", () => {
  it("writes spec.json, snapshot.json and container.json", async () => {
    const { client, state } = fake();
    const versionId = await seedLeadVersion(client, state);
    const dir = await tmp();
    const outcome = await pullContainer(client, { container: "GTM-AAA" }, dir);
    expect(outcome.specError).toBeUndefined();
    expect((await readdir(dir)).sort()).toEqual([RECORD_FILE, SNAPSHOT_FILE, SPEC_FILE]);

    const spec = JSON.parse(await readFile(join(dir, SPEC_FILE), "utf-8"));
    expect(spec.tag[0].firingTriggerName).toEqual(["Custom Event - lead"]);
    expect(spec.tag[0].parameter.map((p: { key: string }) => p.key)).toEqual([
      "conversionId",
      "conversionLabel",
    ]);
    expect(spec.tag[0]).not.toHaveProperty("tagId");

    const record = JSON.parse(await readFile(join(dir, RECORD_FILE), "utf-8"));
    expect(record).toEqual({
      publicId: "GTM-AAA",
      name: "a.com",
      containerType: "web",
      accountId: "1",
      containerId: "10",
      source: { container: "GTM-AAA" },
      version: { id: versionId, name: "lead v1" },
      workspace: null,
      environment: null,
    });
    expect(outcome.record).toEqual(record);

    const snapshot = JSON.parse(await readFile(join(dir, SNAPSHOT_FILE), "utf-8"));
    expect(snapshot.tag[0].tagId).toBeDefined();
    expect(Object.keys(snapshot)[0]).toBe("pulledAt");
  });

  it("rewrites spec.json and container.json byte-identical on an unchanged container", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state);
    const a = await tmp();
    const b = await tmp();
    await pullContainer(client, { container: "GTM-AAA" }, a);
    await new Promise((r) => setTimeout(r, 2));
    await pullContainer(client, { container: "GTM-AAA" }, b);
    for (const file of [SPEC_FILE, RECORD_FILE]) {
      expect(await readFile(join(b, file), "utf-8")).toBe(await readFile(join(a, file), "utf-8"));
    }
    const snapA = JSON.parse(await readFile(join(a, SNAPSHOT_FILE), "utf-8"));
    const snapB = JSON.parse(await readFile(join(b, SNAPSHOT_FILE), "utf-8"));
    expect(snapB.pulledAt).not.toBe(snapA.pulledAt);
    delete snapA.pulledAt;
    delete snapB.pulledAt;
    expect(snapB).toEqual(snapA);
  });

  it("records the workspace read and the version it branched from", async () => {
    const { client, state } = fake();
    const versionId = await seedLeadVersion(client, state);
    await client.service.accounts.containers.workspaces.create({
      parent: containerPath,
      requestBody: { name: "wip" },
    });
    const dir = await tmp();
    const { record } = await pullContainer(client, { container: "GTM-AAA", workspace: "wip" }, dir);
    expect(record.source).toEqual({ container: "GTM-AAA", workspace: "wip" });
    expect(record.workspace).toBe("wip");
    expect(record.version?.id).toBe(versionId);
  });

  it("keeps an earlier spec.json when the spec cannot be normalized", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state);
    const dir = await tmp();
    await pullContainer(client, { container: "GTM-AAA" }, dir);
    const good = await readFile(join(dir, SPEC_FILE), "utf-8");

    // A trigger group parameter makes normalizeExport throw.
    await seedLeadVersion(client, state, containerPath, [
      { type: "TRIGGER_REFERENCE", key: "triggerGroup", value: "1" },
    ]);
    const outcome = await pullContainer(client, { container: "GTM-AAA" }, dir);
    expect(outcome.specError).toMatch(/trigger group/i);
    expect(await readFile(join(dir, SPEC_FILE), "utf-8")).toBe(good);
    const snapshot = JSON.parse(await readFile(join(dir, SNAPSHOT_FILE), "utf-8"));
    expect(snapshot.tag).toHaveLength(2);
  });
});

describe("pullAccount", () => {
  it("writes one directory per container, named by the container's slug", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    await seedLeadVersion(client, state, "accounts/1/containers/11");
    const root = await tmp();
    const result = await pullAccount(client, "1", root);
    expect(result.failures).toEqual([]);
    expect(result.outcomes.map((o) => o.record.publicId)).toEqual(["GTM-AAA", "GTM-BBB"]);
    expect(result.outcomes.map((o) => o.dir)).toEqual([join(root, "a-com"), join(root, "b-com")]);
    expect((await readdir(root)).sort()).toEqual(["a-com", "b-com"]);
    expect((await readdir(join(root, "b-com"))).sort()).toEqual([
      RECORD_FILE,
      SNAPSHOT_FILE,
      SPEC_FILE,
    ]);
  });

  it("reports a container that cannot be pulled and still writes the others", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    // GTM-BBB has no versions, so pullSnapshot throws for it.
    const root = await tmp();
    const result = await pullAccount(client, "1", root);
    expect(result.outcomes.map((o) => o.record.publicId)).toEqual(["GTM-AAA"]);
    expect(result.failures).toEqual([
      { publicId: "GTM-BBB", error: expect.stringMatching(/no versions/) },
    ]);
    expect(await readdir(root)).toEqual(["a-com"]);
  });

  it("honours a filter and a custom directory mapping", async () => {
    const { client, state } = fake();
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    await seedLeadVersion(client, state, "accounts/1/containers/11");
    const root = await tmp();
    const result = await pullAccount(client, "1", root, {
      filter: (r) => r.publicId === "GTM-BBB",
      dirFor: (r) => `prod-${r.containerId}`,
    });
    expect(result.outcomes.map((o) => o.record.publicId)).toEqual(["GTM-BBB"]);
    expect(await readdir(root)).toEqual(["prod-11"]);
  });

  it("appends the public id when two containers share a slug", async () => {
    const { service, state } = createFakeService({
      accounts: [{ accountId: "1", name: "Acme" }],
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "Acme" },
        { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "acme" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await seedLeadVersion(client, state, "accounts/1/containers/10");
    await seedLeadVersion(client, state, "accounts/1/containers/11");
    const root = await tmp();
    await pullAccount(client, "1", root);
    expect((await readdir(root)).sort()).toEqual(["acme-gtm-aaa", "acme-gtm-bbb"]);
  });
});
