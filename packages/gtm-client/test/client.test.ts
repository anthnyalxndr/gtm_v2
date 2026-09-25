import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { tagmanager_v2 } from "@googleapis/tagmanager";
import { GoogleAuth, JWT, OAuth2Client, UserRefreshClient } from "google-auth-library";
import {
  GtmClient,
  selectCredentials,
  TAG_MANAGER_SCOPES,
  type AuthClient,
} from "../src/client.js";
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

describe("selectCredentials", () => {
  it("prefers a service account, then ADC, then a refresh token, then the user flow", () => {
    const env = {
      GTM_SERVICE_ACCOUNT_KEY: "/sa.json",
      GOOGLE_APPLICATION_CREDENTIALS: "/adc.json",
      GTM_REFRESH_TOKEN: "1//refresh",
      GTM_CLIENT_ID: "id",
      GTM_CLIENT_SECRET: "secret",
    };
    expect(selectCredentials({}, env)).toEqual({ kind: "serviceAccount", keyFile: "/sa.json" });
    expect(selectCredentials({}, { ...env, GTM_SERVICE_ACCOUNT_KEY: undefined })).toEqual({
      kind: "adc",
    });
    expect(
      selectCredentials(
        {},
        { GTM_REFRESH_TOKEN: "1//refresh", GTM_CLIENT_ID: "id", GTM_CLIENT_SECRET: "secret" }
      )
    ).toEqual({
      kind: "refreshToken",
      refreshToken: "1//refresh",
      clientId: "id",
      clientSecret: "secret",
    });
    expect(selectCredentials({}, {})).toEqual({ kind: "user" });
  });

  it("lets options override the environment", () => {
    const env = { GTM_REFRESH_TOKEN: "env-token" };
    expect(selectCredentials({ serviceAccountKeyPath: "/opt.json" }, env)).toEqual({
      kind: "serviceAccount",
      keyFile: "/opt.json",
    });
    expect(selectCredentials({ useAdc: true }, env)).toEqual({ kind: "adc" });
    expect(
      selectCredentials({ refreshToken: "opt-token", clientId: "a", clientSecret: "b" }, env)
    ).toEqual({
      kind: "refreshToken",
      refreshToken: "opt-token",
      clientId: "a",
      clientSecret: "b",
    });
  });
});

describe("headless authentication", () => {
  const fakeService = {
    accounts: {
      list: async () => ({ data: { account: [{ accountId: "1", name: "Acme" }] } }),
    },
  } as unknown as tagmanager_v2.Tagmanager;

  async function dir(): Promise<string> {
    return mkdtemp(join(tmpdir(), "gtm-auth-"));
  }

  it("uses a service account key file without a browser or client secrets, and lists accounts", async () => {
    const d = await dir();
    const keyFile = join(d, "sa.json");
    await writeFile(
      keyFile,
      JSON.stringify({
        type: "service_account",
        client_email: "deploy@acme.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n",
      })
    );
    let captured: AuthClient | undefined;
    const client = new GtmClient({
      clientSecretsPath: join(d, "missing-secrets.json"),
      tokenPath: join(d, "token.json"),
      env: { GTM_SERVICE_ACCOUNT_KEY: keyFile },
      interactive: false,
      createService: (auth) => {
        captured = auth;
        return fakeService;
      },
    });
    await client.init();
    expect(captured).toBeInstanceOf(JWT);
    expect((captured as JWT).scopes).toEqual([...TAG_MANAGER_SCOPES]);
    expect((await listAccounts(client)).map((a) => a.name)).toEqual(["Acme"]);
  });

  it("uses Application Default Credentials when GOOGLE_APPLICATION_CREDENTIALS is set", async () => {
    const d = await dir();
    let captured: AuthClient | undefined;
    const client = new GtmClient({
      clientSecretsPath: join(d, "missing-secrets.json"),
      tokenPath: join(d, "token.json"),
      env: { GOOGLE_APPLICATION_CREDENTIALS: join(d, "adc.json") },
      interactive: false,
      createService: (auth) => {
        captured = auth;
        return fakeService;
      },
    });
    await client.init();
    expect(captured).toBeInstanceOf(GoogleAuth);
  });

  it("uses a refresh token with the client id and secret from the environment or client_secrets.json", async () => {
    const d = await dir();
    let captured: AuthClient | undefined;
    const fromEnv = new GtmClient({
      clientSecretsPath: join(d, "missing-secrets.json"),
      tokenPath: join(d, "token.json"),
      env: { GTM_REFRESH_TOKEN: "1//r", GTM_CLIENT_ID: "id", GTM_CLIENT_SECRET: "secret" },
      interactive: false,
      createService: (auth) => {
        captured = auth;
        return fakeService;
      },
    });
    await fromEnv.init();
    expect(captured).toBeInstanceOf(UserRefreshClient);
    expect((captured as UserRefreshClient)._clientId).toBe("id");

    const secrets = join(d, "client_secrets.json");
    await writeFile(
      secrets,
      JSON.stringify({ installed: { client_id: "file-id", client_secret: "file-secret" } })
    );
    const fromFile = new GtmClient({
      clientSecretsPath: secrets,
      tokenPath: join(d, "token.json"),
      env: { GTM_REFRESH_TOKEN: "1//r" },
      interactive: false,
      createService: (auth) => {
        captured = auth;
        return fakeService;
      },
    });
    await fromFile.init();
    expect((captured as UserRefreshClient)._clientId).toBe("file-id");

    const noSecrets = new GtmClient({
      clientSecretsPath: join(d, "missing-secrets.json"),
      tokenPath: join(d, "token.json"),
      env: { GTM_REFRESH_TOKEN: "1//r" },
      interactive: false,
      createService: () => fakeService,
    });
    await expect(noSecrets.init()).rejects.toThrow(/Client secrets file not found/);
  });

  it("reuses a stored token without a terminal, and refuses to open a browser without one", async () => {
    const d = await dir();
    const secrets = join(d, "client_secrets.json");
    await writeFile(
      secrets,
      JSON.stringify({ installed: { client_id: "id", client_secret: "secret" } })
    );
    const tokenPath = join(d, "token.json");
    await writeFile(
      tokenPath,
      JSON.stringify({
        access_token: "a",
        refresh_token: "r",
        token_type: "Bearer",
        expiry_date: 1,
      })
    );
    let captured: AuthClient | undefined;
    const stored = new GtmClient({
      clientSecretsPath: secrets,
      tokenPath,
      env: {},
      interactive: false,
      createService: (auth) => {
        captured = auth;
        return fakeService;
      },
    });
    await stored.init();
    expect(captured).toBeInstanceOf(OAuth2Client);

    const noToken = new GtmClient({
      clientSecretsPath: secrets,
      tokenPath: join(d, "no-token.json"),
      env: {},
      interactive: false,
      createService: () => fakeService,
    });
    await expect(noToken.init()).rejects.toThrow(
      /service account key file.*Application Default Credentials.*refresh token.*no-token\.json/s
    );
  });
});

describe("package entry", () => {
  it("exports GtmClient from the index", () => {
    expect(typeof pkg.GtmClient).toBe("function");
  });
});
