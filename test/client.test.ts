import { describe, it, expect } from "vitest";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { tagmanager_v2 } from "@googleapis/tagmanager";
import { GtmClient } from "../src/gtm_v2.js";
import * as sdk from "../src/index.js";

describe("GtmClient", () => {
  it("throws a clear error when a method is called before init()", async () => {
    const client = new GtmClient({ clientSecretsPath: "/nonexistent/secrets.json" });
    await expect(client.listAccounts()).rejects.toThrow(/not initialized/);
    expect(() => client.service).toThrow(/not initialized/);
  });

  it("init() fails with a clear error when the secrets file is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gtm-sdk-"));
    const client = new GtmClient({
      clientSecretsPath: join(dir, "missing.json"),
      tokenPath: join(dir, "token.json"),
    });
    await expect(client.init()).rejects.toThrow(/Client secrets file not found/);
  });

  it("accepts an injected service and skips auth", async () => {
    const fake = {
      accounts: {
        list: async () => ({ data: { account: [{ accountId: "1", name: "Acme" }] } }),
      },
    } as unknown as tagmanager_v2.Tagmanager;
    const client = new GtmClient({ service: fake });
    await client.init();
    const accounts = await client.listAccounts();
    expect(accounts.map((a) => a.name)).toEqual(["Acme"]);
    expect(client.service).toBe(fake);
  });
});

describe("GtmClient.call", () => {
  it("explains an invalid_grant refresh failure and names the token file", async () => {
    const fake = {
      accounts: {
        list: async () => {
          throw new Error("invalid_grant");
        },
      },
    } as unknown as tagmanager_v2.Tagmanager;
    const client = new GtmClient({ service: fake, tokenPath: "/tmp/x/token.json" });
    await expect(client.listAccounts()).rejects.toThrow(
      /token at \/tmp\/x\/token\.json was rejected \(invalid_grant\).*re-authorize/
    );
  });

  it("passes other errors through unchanged", async () => {
    const fake = {
      accounts: {
        list: async () => {
          throw Object.assign(new Error("HTTP 403"), { code: 403 });
        },
      },
    } as unknown as tagmanager_v2.Tagmanager;
    const client = new GtmClient({ service: fake });
    await expect(client.listAccounts()).rejects.toThrow("HTTP 403");
  });
});

describe("package entry", () => {
  it("exports GtmClient from the index", () => {
    expect(typeof sdk.GtmClient).toBe("function");
  });
});
