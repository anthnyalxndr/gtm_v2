/**
 * Access and manage a Google Tag Manager account.
 */

import { google, tagmanager_v2 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { readFile, writeFile, access } from "fs/promises";
import { constants } from "fs";
import * as http from "http";
import { URL } from "url";
import open from "open";

/** Tag Manager API v2 scopes */
const TAG_MANAGER_SCOPES: readonly string[] = [
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

export interface GtmClientOptions {
  clientSecretsPath?: string;
  tokenPath?: string;
  scopes?: readonly string[];
}

export class GtmClient {
  private readonly clientSecretsPath: string;
  private readonly tokenPath: string;
  private readonly scopes: readonly string[];
  private oauthClient: OAuth2Client | null = null;
  private service: tagmanager_v2.Tagmanager | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  public constructor(options: GtmClientOptions = {}) {
    this.clientSecretsPath = options.clientSecretsPath ?? "client_secrets.json";
    this.tokenPath = options.tokenPath ?? "tagmanager.token.json";
    this.scopes = options.scopes ?? TAG_MANAGER_SCOPES;
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

  public async listAccounts(): Promise<tagmanager_v2.Schema$Account[]> {
    const service = this.getInitializedService();
    const response = await service.accounts.list();
    return response.data.account ?? [];
  }

  private async initializeInternal(): Promise<void> {
    try {
      await access(this.clientSecretsPath, constants.F_OK);
    } catch {
      throw new Error(
        `Client secrets file not found: ${this.clientSecretsPath}`
      );
    }

    const auth = await this.getAuthenticatedClient();
    this.oauthClient = auth;
    this.service = google.tagmanager({ version: "v2", auth });
    this.initialized = true;
  }

  private getInitializedService(): tagmanager_v2.Tagmanager {
    if (!this.initialized || this.service === null) {
      throw new Error(
        "GtmClient is not initialized. Call `await client.init()` before calling GTM methods."
      );
    }
    return this.service;
  }

  private async loadCredentials(): Promise<StoredCredentials | null> {
    try {
      const content = await readFile(this.tokenPath, "utf-8");
      return JSON.parse(content) as StoredCredentials;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        // File doesn't exist - expected on first run
        return null;
      }
      // File exists but couldn't be read or parsed
      console.error(
        `Error loading credentials from ${this.tokenPath}:`,
        error.message
      );
      return null;
    }
  }

  private async saveCredentials(credentials: StoredCredentials): Promise<void> {
    await writeFile(
      this.tokenPath,
      JSON.stringify(credentials, null, 2),
      "utf-8"
    );
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
                  <h1>❌ Authorization failed</h1>
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
                  <h1>✅ Authorization successful!</h1>
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
          console.log(
            "Could not open browser automatically. Please open the URL above manually."
          );
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
        // Don't throw - token refresh still succeeded, just couldn't save
      }
    });
  }

  private async getAuthenticatedClient(): Promise<OAuth2Client> {
    const content = await readFile(this.clientSecretsPath, "utf-8");
    const secrets: ClientSecrets = JSON.parse(content);
    const { client_id, client_secret } = secrets.installed;

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

    const authenticatedClient = await this.runLocalServerFlow(
      client_id,
      client_secret
    );
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
