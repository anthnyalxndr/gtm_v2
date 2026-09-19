import { describe, it, expect } from "vitest";
import { createFakeService } from "../src/testing.js";

const seed = {
  accounts: [{ accountId: "1", name: "Acme" }],
  containers: [
    { accountId: "1", containerId: "10", publicId: "GTM-ABC123", name: "acme.com" },
    {
      accountId: "1",
      containerId: "11",
      publicId: "GTM-SRV999",
      name: "acme server",
      usageContext: ["server"],
    },
  ],
  destinations: [
    {
      accountId: "1",
      containerId: "10",
      destinationId: "AW-123456789",
      path: "accounts/1/containers/10/destinations/AW-123456789",
    },
  ],
};

describe("createFakeService accounts.containers.lookup", () => {
  it("returns the container for a known tagId and records the call", async () => {
    const { service, state } = createFakeService(seed);
    const res = await service.accounts.containers.lookup({ tagId: "GTM-SRV999" });
    expect(res.data).toMatchObject({
      accountId: "1",
      containerId: "11",
      publicId: "GTM-SRV999",
      name: "acme server",
      usageContext: ["server"],
      path: "accounts/1/containers/11",
    });
    expect(state.calls).toEqual(["containers.lookup"]);
  });

  it("returns the container linked to a known destinationId", async () => {
    const { service } = createFakeService(seed);
    const res = await service.accounts.containers.lookup({ destinationId: "AW-123456789" });
    expect(res.data).toMatchObject({ publicId: "GTM-ABC123", path: "accounts/1/containers/10" });
  });

  it("throws 404 for an unknown tagId", async () => {
    const { service, state } = createFakeService(seed);
    await expect(service.accounts.containers.lookup({ tagId: "GTM-NOPE" })).rejects.toMatchObject({
      code: 404,
    });
    expect(state.calls).toEqual(["containers.lookup"]);
  });

  it("throws 404 for an unknown destinationId", async () => {
    const { service } = createFakeService(seed);
    await expect(
      service.accounts.containers.lookup({ destinationId: "AW-000" })
    ).rejects.toMatchObject({ code: 404 });
  });

  it("throws 400 unless exactly one of tagId and destinationId is given", async () => {
    const { service } = createFakeService(seed);
    await expect(service.accounts.containers.lookup({})).rejects.toMatchObject({ code: 400 });
    await expect(
      service.accounts.containers.lookup({ tagId: "GTM-ABC123", destinationId: "AW-123456789" })
    ).rejects.toMatchObject({ code: 400 });
  });
});
