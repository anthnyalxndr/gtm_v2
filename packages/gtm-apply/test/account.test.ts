import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, type FakeState } from "@anthnyalxndr/gtm-client/testing";
import { pullSnapshots, snapshotAccount } from "../src/snapshot/account.js";

function fake() {
  const { service, state } = createFakeService({
    accounts: [
      { accountId: "1", name: "Acme" },
      { accountId: "2", name: "Other" },
    ],
    containers: [
      { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
      { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
      { accountId: "2", containerId: "20", publicId: "GTM-ZZZ", name: "z.com" },
    ],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

/** Create a workspace holding one tag named after the container and version it. */
export async function seedVersion(
  client: GtmClient,
  state: FakeState,
  containerPath: string,
  tagName: string
): Promise<string> {
  const ws = client.service.accounts.containers.workspaces;
  const created = await ws.create({ parent: containerPath, requestBody: { name: "seed" } });
  const parent = created.data.path!;
  await ws.tags.create({ parent, requestBody: { name: tagName, type: "html" } });
  await ws.create_version({ path: parent, requestBody: { name: "v1" } });
  return state.versions[state.versions.length - 1].versionId;
}

describe("pullSnapshots", () => {
  it("returns one snapshot per source, in source order", async () => {
    const { client, state } = fake();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await seedVersion(client, state, "accounts/1/containers/11", "Tag B");
    const snaps = await pullSnapshots(client, [{ container: "GTM-BBB" }, { container: "GTM-AAA" }]);
    expect(snaps.map((s) => s.container.publicId)).toEqual(["GTM-BBB", "GTM-AAA"]);
    expect(snaps.map((s) => s.tag[0]?.name)).toEqual(["Tag B", "Tag A"]);
  });
});

describe("snapshotAccount", () => {
  it("snapshots every container of the account and none of another", async () => {
    const { client, state } = fake();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await seedVersion(client, state, "accounts/1/containers/11", "Tag B");
    await seedVersion(client, state, "accounts/2/containers/20", "Tag Z");
    const snaps = await snapshotAccount(client, "1");
    expect(snaps.map((s) => s.container.publicId)).toEqual(["GTM-AAA", "GTM-BBB"]);
    expect(state.calls.filter((c) => c === "versions.get")).toHaveLength(2);
  });

  it("rejects when any container has no versions, naming it", async () => {
    const { client, state } = fake();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await expect(snapshotAccount(client, "1")).rejects.toThrow(/GTM-BBB/);
  });
});
