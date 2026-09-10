import { describe, it, expect } from "vitest";
import { GtmClient } from "../src/client.js";
import { listAccounts } from "../src/accounts.js";
import { createFakeService } from "../src/testing.js";

describe("listAccounts", () => {
  it("returns the accounts the user can see, with paths", async () => {
    const { service, state } = createFakeService({
      accounts: [
        { accountId: "1", name: "A" },
        { accountId: "2", name: "B" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const accounts = await listAccounts(client);
    expect(accounts.map((a) => a.name)).toEqual(["A", "B"]);
    expect(accounts[0].path).toBe("accounts/1");
    expect(state.calls).toEqual(["accounts.list"]);
  });
});
