import { describe, it, expect } from "vitest";
import { GtmClient } from "../src/client.js";
import { resolveContainer, createContainer } from "../src/containers.js";
import { createFakeService } from "../src/testing.js";

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
