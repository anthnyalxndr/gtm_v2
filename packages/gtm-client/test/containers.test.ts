import { describe, it, expect } from "vitest";
import { GtmClient } from "../src/client.js";
import { resolveContainer, createContainer } from "../src/containers.js";
import { createFakeService } from "../src/testing.js";

const twoAccounts = {
  accounts: [
    { accountId: "1", name: "A" },
    { accountId: "2", name: "B" },
  ],
  containers: [
    { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a" },
    { accountId: "2", containerId: "20", publicId: "GTM-BBB", name: "b" },
  ],
};

/** Make the fake's lookup endpoint fail with the given HTTP status, still recording the call. */
function failLookup(
  service: ReturnType<typeof createFakeService>["service"],
  state: ReturnType<typeof createFakeService>["state"],
  code: number
): void {
  service.accounts.containers.lookup = (async () => {
    state.calls.push("containers.lookup");
    throw Object.assign(new Error(`lookup failed with ${code}`), { code });
  }) as typeof service.accounts.containers.lookup;
}

describe("resolveContainer", () => {
  it("finds the container across accounts", async () => {
    const { service } = createFakeService(twoAccounts);
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

  it("makes exactly one API call on the lookup fast path", async () => {
    const { service, state } = createFakeService(twoAccounts);
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ref = await resolveContainer(client, "GTM-BBB");
    expect(ref.path).toBe("accounts/2/containers/20");
    expect(state.calls).toEqual(["containers.lookup"]);
  });

  it("falls back to the account scan when lookup returns 404", async () => {
    const { service, state } = createFakeService(twoAccounts);
    failLookup(service, state, 404);
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ref = await resolveContainer(client, "GTM-BBB");
    expect(ref.path).toBe("accounts/2/containers/20");
    expect(state.calls).toEqual([
      "containers.lookup",
      "accounts.list",
      "containers.list",
      "containers.list",
    ]);
  });

  it("falls back to the account scan when lookup returns 403", async () => {
    const { service, state } = createFakeService(twoAccounts);
    failLookup(service, state, 403);
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await expect(resolveContainer(client, "GTM-AAA")).resolves.toMatchObject({
      path: "accounts/1/containers/10",
    });
    expect(state.calls).toContain("accounts.list");
  });

  it("falls back to the account scan when lookup returns a different container", async () => {
    const { service, state } = createFakeService(twoAccounts);
    const real = service.accounts.containers.lookup;
    service.accounts.containers.lookup = (async () =>
      real({ tagId: "GTM-AAA" })) as typeof service.accounts.containers.lookup;
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ref = await resolveContainer(client, "GTM-BBB");
    expect(ref).toMatchObject({ publicId: "GTM-BBB", path: "accounts/2/containers/20" });
    expect(state.calls).toContain("accounts.list");
  });

  it("propagates lookup errors other than 404 and 403", async () => {
    const { service, state } = createFakeService(twoAccounts);
    failLookup(service, state, 401);
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await expect(resolveContainer(client, "GTM-BBB")).rejects.toMatchObject({ code: 401 });
    expect(state.calls).toEqual(["containers.lookup"]);
  });

  it("throws when no container matches", async () => {
    const { service, state } = createFakeService();
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await expect(resolveContainer(client, "GTM-NOPE")).rejects.toThrow(/GTM-NOPE/);
    expect(state.calls).toEqual(["containers.lookup", "accounts.list", "containers.list"]);
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
