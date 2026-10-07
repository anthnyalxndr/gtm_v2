import { afterEach, describe, it, expect, vi } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { tagmanager_v2 } from "@googleapis/tagmanager";
import { OAuth2Client, type TokenInfo } from "google-auth-library";
import { GtmClient } from "../src/client.js";
import * as pkg from "../src/index.js";
import { listAccounts } from "../src/accounts.js";

describe("GtmClient", () => {
  it("throws a clear error when a method is called before init()", async () => {
    const client = new GtmClient({ clientSecretsPath: "/nonexistent/secrets.json" });
    await expect(listAccounts(client)).rejects.toThrow(/not initialized/);
    expect(() => client.service).toThrow(/not initialized/);
  });

  it("init() fails with a clear error when the secrets file is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gtm-apply-"));
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
    const accounts = await listAccounts(client);
    expect(accounts.map((a) => a.name)).toEqual(["Acme"]);
    expect(client.service).toBe(fake);
  });
});

describe("GtmClient.email", () => {
  const fake = { accounts: {} } as unknown as tagmanager_v2.Tagmanager;

  it("returns the email the client was given", async () => {
    const client = new GtmClient({ service: fake, email: "owner@acme.com" });
    expect(await client.email()).toBe("owner@acme.com");
  });

  it("returns undefined when the identity behind an injected service is unknown", async () => {
    const client = new GtmClient({ service: fake });
    expect(await client.email()).toBeUndefined();
  });

  /**
   * A client initialized from a stored, unexpired token, so init() and
   * getAccessToken() run without the network. The token-info call is the only
   * request the lookup makes; each test stands in for Google's answer to it.
   */
  async function fromStoredToken(): Promise<GtmClient> {
    const dir = await mkdtemp(join(tmpdir(), "gtm-client-email-"));
    const clientSecretsPath = join(dir, "client_secrets.json");
    const tokenPath = join(dir, "token.json");
    await writeFile(
      clientSecretsPath,
      JSON.stringify({ installed: { client_id: "id", client_secret: "secret" } })
    );
    await writeFile(
      tokenPath,
      JSON.stringify({
        access_token: "stored-access-token",
        refresh_token: "stored-refresh-token",
        token_type: "Bearer",
        expiry_date: Date.now() + 60 * 60 * 1000,
      })
    );
    const client = new GtmClient({ clientSecretsPath, tokenPath });
    await client.init();
    return client;
  }

  const tokenInfo = (fields: Partial<TokenInfo>): TokenInfo => ({
    aud: "id",
    expiry_date: Date.now() + 60 * 60 * 1000,
    scopes: ["https://www.googleapis.com/auth/tagmanager.publish"],
    ...fields,
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the email from the stored token's info", async () => {
    const lookup = vi
      .spyOn(OAuth2Client.prototype, "getTokenInfo")
      .mockResolvedValue(tokenInfo({ email: "owner@acme.com" }));
    const client = await fromStoredToken();
    expect(await client.email()).toBe("owner@acme.com");
    expect(lookup).toHaveBeenCalledWith("stored-access-token");
    // The answer is cached: a second call makes no second request.
    expect(await client.email()).toBe("owner@acme.com");
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("returns undefined when the token was granted without the email scope", async () => {
    vi.spyOn(OAuth2Client.prototype, "getTokenInfo").mockResolvedValue(tokenInfo({}));
    const client = await fromStoredToken();
    expect(await client.email()).toBeUndefined();
  });

  it("rejects when the lookup fails, and asks again on the next call", async () => {
    const lookup = vi
      .spyOn(OAuth2Client.prototype, "getTokenInfo")
      .mockRejectedValueOnce(new Error("tokeninfo unavailable"))
      .mockResolvedValue(tokenInfo({ email: "owner@acme.com" }));
    const client = await fromStoredToken();
    await expect(client.email()).rejects.toThrow("tokeninfo unavailable");
    expect(await client.email()).toBe("owner@acme.com");
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("asks for the email scope so the token can say who the caller is", () => {
    expect(pkg.TAG_MANAGER_SCOPES).toContain("https://www.googleapis.com/auth/userinfo.email");
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
    await expect(listAccounts(client)).rejects.toThrow(
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
    await expect(listAccounts(client)).rejects.toThrow("HTTP 403");
  });
});

describe("package entry", () => {
  it("exports GtmClient from the index", () => {
    expect(typeof pkg.GtmClient).toBe("function");
  });
});
