import { describe, it, expect } from "vitest";
import { GtmClient } from "../src/client.js";
import { resolveContainer, createContainer, listContainers } from "../src/containers.js";
import { createFakeService } from "../src/testing.js";

describe("listContainers", () => {
  it("returns every container of one account as refs, in listing order", async () => {
    const { service, state } = createFakeService({
      accounts: [
        { accountId: "1", name: "A" },
        { accountId: "2", name: "B" },
      ],
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a" },
        { accountId: "2", containerId: "20", publicId: "GTM-BBB", name: "b" },
        {
          accountId: "1",
          containerId: "11",
          publicId: "GTM-CCC",
          name: "c",
          usageContext: ["server"],
        },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const refs = await listContainers(client, "1");
    expect(refs.map((r) => r.publicId)).toEqual(["GTM-AAA", "GTM-CCC"]);
    expect(refs[1]).toEqual({
      accountId: "1",
      containerId: "11",
      path: "accounts/1/containers/11",
      name: "c",
      publicId: "GTM-CCC",
      usageContext: ["server"],
    });
    expect(state.calls).toEqual(["containers.list"]);
  });

  it("returns an empty list for an account with no containers", async () => {
    const { service } = createFakeService({ accounts: [{ accountId: "7", name: "Empty" }] });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    expect(await listContainers(client, "7")).toEqual([]);
  });
});

describe("resolveContainer", () => {
  it("finds the container across accounts", async () => {
    const { service } = createFakeService({
      accounts: [
        { accountId: "1", name: "A" },
        { accountId: "2", name: "B" },
      ],
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a" },
        { accountId: "2", containerId: "20", publicId: "GTM-BBB", name: "b" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ref = await resolveContainer(client, "GTM-BBB");
    expect(ref).toEqual({
      accountId: "2",
      containerId: "20",
      path: "accounts/2/containers/20",
      name: "b",
      publicId: "GTM-BBB",
      usageContext: ["web"],
    });
  });

  it("throws when no container matches", async () => {
    const { service } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await expect(resolveContainer(client, "GTM-NOPE")).rejects.toThrow(/GTM-NOPE/);
  });
});

describe("createContainer", () => {
  it("creates a web container in the account and returns a ref", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ref = await createContainer(client, "1", "newcustomer.com");
    expect(state.calls).toContain("containers.create");
    expect(ref.accountId).toBe("1");
    expect(ref.name).toBe("newcustomer.com");
    expect(ref.path).toMatch(/^accounts\/1\/containers\/\d+$/);
    await expect(resolveContainer(client, ref.publicId)).resolves.toMatchObject({
      name: "newcustomer.com",
    });
  });
});
