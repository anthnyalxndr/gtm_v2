/**
 * Access and manage a Google Tag Manager account.
 */

import { tagmanager, tagmanager_v2 } from "@googleapis/tagmanager";
import { GoogleAuth, JWT, OAuth2Client, UserRefreshClient } from "google-auth-library";
import { readFile, writeFile, access, mkdir } from "fs/promises";
import { constants } from "fs";
import { dirname } from "path";
import * as http from "http";
import { URL } from "url";
import open from "open";
import { resolveConfigPaths } from "./config.js";
import { createLimiter, withRetry } from "./throttle.js";

/** Tag Manager API v2 scopes */
export const TAG_MANAGER_SCOPES: readonly string[] = [
  "https://www.googleapis.com/auth/tagmanager.manage.accounts",
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
  "https://www.googleapis.com/auth/tagmanager.delete.containers",
  "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
  "https://www.googleapis.com/auth/tagmanager.manage.users",
  "https://www.googleapis.com/auth/tagmanager.publish",
];

interface ClientSecrets {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
}

interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expiry_date: number;
}

/** Any auth client the Tag Manager service accepts. */
export type AuthClient = OAuth2Client | JWT | UserRefreshClient | GoogleAuth;

/** Where credentials come from, chosen by selectCredentials(). */
export type CredentialSource =
  | { kind: "serviceAccount"; keyFile: string }
  | { kind: "adc" }
  | { kind: "refreshToken"; refreshToken: string; clientId?: string; clientSecret?: string }
  | { kind: "user" };

export interface GtmClientOptions {
  clientSecretsPath?: string;
  tokenPath?: string;
  scopes?: readonly string[];
  /** Minimum gap between API calls in milliseconds. Defaults to 250. */
  minIntervalMs?: number;
  /** Pre-built service. When set, init() performs no auth. Intended for tests. */
  service?: tagmanager_v2.Tagmanager;
  /** Path of a service account key file. Also read from GTM_SERVICE_ACCOUNT_KEY. */
  serviceAccountKeyPath?: string;
  /** Use Application Default Credentials. Also implied by GOOGLE_APPLICATION_CREDENTIALS. */
  useAdc?: boolean;
  /** An OAuth refresh token. Also read from GTM_REFRESH_TOKEN. */
  refreshToken?: string;
  /** OAuth client id and secret for the refresh token; default GTM_CLIENT_ID and GTM_CLIENT_SECRET, else client_secrets.json. */
  clientId?: string;
  clientSecret?: string;
  /** Whether a browser may be opened for the user OAuth flow. Default: stdin and stdout are terminals. */
  interactive?: boolean;
  /** Environment to read credentials from. Default process.env. Intended for tests. */
  env?: NodeJS.ProcessEnv;
  /** Builds the Tag Manager service from an auth client. Default: the real service. Intended for tests. */
  createService?: (auth: AuthClient) => tagmanager_v2.Tagmanager;
}

/**
 * Pick the credential source, in this order: a service account key file,
 * Application Default Credentials, a refresh token, the user OAuth flow.
 * The first three never open a browser, which is what CI needs.
 */
export function selectCredentials(
  options: GtmClientOptions = {},
  env: NodeJS.ProcessEnv = options.env ?? process.env
): CredentialSource {
  const keyFile = options.serviceAccountKeyPath ?? env.GTM_SERVICE_ACCOUNT_KEY;
  if (keyFile) return { kind: "serviceAccount", keyFile };
  if (options.useAdc || env.GOOGLE_APPLICATION_CREDENTIALS) return { kind: "adc" };
  const refreshToken = options.refreshToken ?? env.GTM_REFRESH_TOKEN;
  if (refreshToken) {
    return {
      kind: "refreshToken",
      refreshToken,
      clientId: options.clientId ?? env.GTM_CLIENT_ID,
      clientSecret: options.clientSecret ?? env.GTM_CLIENT_SECRET,
    };
  }
  return { kind: "user" };
}

/** The message shown instead of a browser when nothing headless is configured. */
export const HEADLESS_HELP =
  "No credentials and no terminal to authorize in. Give the client one of: " +
  "a service account key file (GTM_SERVICE_ACCOUNT_KEY or serviceAccountKeyPath; add its email as a Tag Manager user), " +
  "Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS), " +
  "or a refresh token (GTM_REFRESH_TOKEN with GTM_CLIENT_ID and GTM_CLIENT_SECRET, or client_secrets.json). " +
  "Or run once in a terminal so the token is stored";

export class GtmClient {
  private readonly clientSecretsPath: string;
  private readonly tokenPath: string;
  private readonly scopes: readonly string[];
  private readonly limiter: <T>(fn: () => Promise<T>) => Promise<T>;
  private readonly options: GtmClientOptions;
  private readonly interactive: boolean;
  private readonly createService: (auth: AuthClient) => tagmanager_v2.Tagmanager;
  private api: tagmanager_v2.Tagmanager | null = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  public constructor(options: GtmClientOptions = {}) {
    const defaults = resolveConfigPaths();
    this.clientSecretsPath = options.clientSecretsPath ?? defaults.clientSecretsPath;
    this.tokenPath = options.tokenPath ?? defaults.tokenPath;
    this.scopes = options.scopes ?? TAG_MANAGER_SCOPES;
    this.limiter = createLimiter(options.minIntervalMs ?? 250);
    this.options = options;
    this.interactive = options.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);
    this.createService = options.createService ?? ((auth) => tagmanager({ version: "v2", auth }));
    if (options.service) {
      this.api = options.service;
      this.initialized = true;
    }
  }

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.initializeInternal();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /** The raw Tag Manager API v2 service. Escape hatch for calls the tool does not wrap. */
  public get service(): tagmanager_v2.Tagmanager {
    return this.getInitializedService();
  }

  /** Run an API call with throttling and retry. Every helper goes through this. */
  public async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await this.limiter(() => withRetry(fn));
    } catch (err) {
      throw this.describeAuthError(err);
    }
  }

  /** Replace Google's bare "invalid_grant" with an error that says what to do about it. */
  private describeAuthError(err: unknown): unknown {
    const message = err instanceof Error ? err.message : String(err);
    if (!/invalid_grant/i.test(message)) return err;
    return new Error(
      `The stored OAuth token at ${this.tokenPath} was rejected (invalid_grant): it has expired or been revoked. Delete that file and run again to re-authorize in the browser.`,
      { cause: err }
    );
  }

  private async initializeInternal(): Promise<void> {
    const source = selectCredentials(this.options);
    const auth = await this.authFor(source);
    this.api = this.createService(auth);
    this.initialized = true;
  }

  /** Build the auth client for a credential source. Only the user flow may open a browser. */
  private async authFor(source: CredentialSource): Promise<AuthClient> {
    switch (source.kind) {
      case "serviceAccount":
        return new JWT({ keyFile: source.keyFile, scopes: [...this.scopes] });
      case "adc":
        return new GoogleAuth({ scopes: [...this.scopes] });
      case "refreshToken": {
        let { clientId, clientSecret } = source;
        if (!clientId || !clientSecret) {
          const secrets = await this.readClientSecrets();
          clientId = clientId ?? secrets.client_id;
          clientSecret = clientSecret ?? secrets.client_secret;
        }
        return new UserRefreshClient(clientId, clientSecret, source.refreshToken);
      }
      case "user":
        return this.getAuthenticatedClient();
    }
  }

  private async readClientSecrets(): Promise<ClientSecrets["installed"]> {
    try {
      await access(this.clientSecretsPath, constants.F_OK);
    } catch {
      throw new Error(`Client secrets file not found: ${this.clientSecretsPath}`);
    }
    const content = await readFile(this.clientSecretsPath, "utf-8");
    return (JSON.parse(content) as ClientSecrets).installed;
  }

  private getInitializedService(): tagmanager_v2.Tagmanager {
    if (!this.initialized || this.api === null) {
      throw new Error(
        "GtmClient is not initialized. Call `await client.init()` before calling GTM methods."
      );
    }
    return this.api;
  }

  private async loadCredentials(): Promise<StoredCredentials | null> {
    try {
      const content = await readFile(this.tokenPath, "utf-8");
      return JSON.parse(content) as StoredCredentials;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        return null;
      }
      console.error(`Error loading credentials from ${this.tokenPath}:`, error.message);
      return null;
    }
  }

  private async saveCredentials(credentials: StoredCredentials): Promise<void> {
    await mkdir(dirname(this.tokenPath), { recursive: true });
    await writeFile(this.tokenPath, JSON.stringify(credentials, null, 2), "utf-8");
  }

  private async runLocalServerFlow(
    clientId: string,
    clientSecret: string,
    port: number = 0
  ): Promise<OAuth2Client> {
    return new Promise((resolve, reject) => {
      let oauth2Client: OAuth2Client;
      let redirectUri: string;

      const server = http.createServer(async (req, res) => {
        try {
          if (!req.url) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("Bad Request: Missing URL");
            return;
          }

          const url = new URL(req.url, redirectUri);
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          if (error) {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end(
              `<html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: system-ui, sans-serif; text-align: center; padding: 50px;">
                  <h1>Authorization failed</h1>
                  <p>${error}</p>
                </body>
              </html>`
            );
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (code) {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(
              `<html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: system-ui, sans-serif; text-align: center; padding: 50px;">
                  <h1>Authorization successful</h1>
                  <p>You can close this window and return to the terminal.</p>
                </body>
              </html>`
            );

            server.close();
            resolve(oauth2Client);
          } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found");
          }
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal error");
          server.close();
          reject(err);
        }
      });

      server.listen(port, () => {
        const serverAddress = server.address();
        if (!serverAddress || typeof serverAddress === "string") {
          reject(new Error("Could not determine server port"));
          return;
        }

        const actualPort = serverAddress.port;
        redirectUri = `http://localhost:${actualPort}`;
        oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

        const authUrl = oauth2Client.generateAuthUrl({
          access_type: "offline",
          scope: [...this.scopes],
          prompt: "consent",
          redirect_uri: redirectUri,
        });

        console.log("\nOpening browser for authorization...");
        console.log(`Listening on http://localhost:${actualPort}`);
        console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);

        open(authUrl).catch(() => {
          console.log("Could not open browser automatically. Please open the URL above manually.");
        });
      });

      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          reject(
            new Error(
              `Port ${port} is already in use. Please close other applications using this port.`
            )
          );
        } else {
          reject(err);
        }
      });
    });
  }

  private registerTokenRefreshHandler(
    client: OAuth2Client,
    baseCredentials: StoredCredentials
  ): void {
    client.on("tokens", async (tokens) => {
      try {
        const updated: StoredCredentials = {
          access_token: tokens.access_token || baseCredentials.access_token,
          refresh_token: tokens.refresh_token || baseCredentials.refresh_token,
          token_type: tokens.token_type || baseCredentials.token_type,
          expiry_date: tokens.expiry_date || baseCredentials.expiry_date,
        };
        await this.saveCredentials(updated);
      } catch (err) {
        console.error("Failed to save refreshed credentials:", err);
      }
    });
  }

  private async getAuthenticatedClient(): Promise<OAuth2Client> {
    const { client_id, client_secret } = await this.readClientSecrets();

    const oauth2Client = new OAuth2Client(client_id, client_secret);
    const storedCredentials = await this.loadCredentials();

    if (storedCredentials) {
      if (!storedCredentials.access_token || !storedCredentials.refresh_token) {
        console.warn("Stored credentials are incomplete, re-authenticating...");
      } else {
        oauth2Client.setCredentials({
          access_token: storedCredentials.access_token,
          refresh_token: storedCredentials.refresh_token,
          token_type: storedCredentials.token_type,
          expiry_date: storedCredentials.expiry_date,
        });
        this.registerTokenRefreshHandler(oauth2Client, storedCredentials);
        return oauth2Client;
      }
    }

    if (!this.interactive) {
      throw new Error(`${HEADLESS_HELP} (looked for ${this.tokenPath}).`);
    }
    const authenticatedClient = await this.runLocalServerFlow(client_id, client_secret);
    const tokens = authenticatedClient.credentials;
    const credentialsToStore: StoredCredentials = {
      access_token: tokens.access_token || "",
      refresh_token: tokens.refresh_token || "",
      token_type: tokens.token_type || "Bearer",
      expiry_date: tokens.expiry_date || 0,
    };
    await this.saveCredentials(credentialsToStore);
    this.registerTokenRefreshHandler(authenticatedClient, credentialsToStore);
    return authenticatedClient;
  }
}
