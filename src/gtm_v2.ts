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
    redirect_uris: string[];
  };
}

interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expiry_date: number;
}

/**
 * Load stored credentials from a file.
 *
 * @param tokenPath - Path to the token storage file.
 * @returns The stored credentials, or null if not found.
 */
async function loadCredentials(
  tokenPath: string
): Promise<StoredCredentials | null> {
  try {
    const content = await readFile(tokenPath, "utf-8");
    return JSON.parse(content) as StoredCredentials;
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      // File doesn't exist - expected on first run
      return null;
    }
    // File exists but couldn't be read or parsed
    console.error(`Error loading credentials from ${tokenPath}:`, error.message);
    return null;
  }
}

/**
 * Save credentials to a file.
 *
 * @param tokenPath - Path to the token storage file.
 * @param credentials - The credentials to store.
 */
async function saveCredentials(
  tokenPath: string,
  credentials: StoredCredentials
): Promise<void> {
  await writeFile(tokenPath, JSON.stringify(credentials, null, 2), "utf-8");
}

/**
 * Run a local server OAuth flow that automatically captures the authorization code.
 * Opens the browser for user authorization and handles the callback automatically.
 *
 * @param clientId - OAuth2 client ID.
 * @param clientSecret - OAuth2 client secret.
 * @param scopes - OAuth2 scopes to request.
 * @param port - Port for the local callback server. Defaults to 0 (random available port).
 * @returns An authenticated OAuth2 client.
 */
async function runLocalServerFlow(
  clientId: string,
  clientSecret: string,
  scopes: readonly string[],
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
          // Exchange code for tokens
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
      // Get the actual port the server is listening on
      const serverAddress = server.address();
      if (!serverAddress || typeof serverAddress === "string") {
        reject(new Error("Could not determine server port"));
        return;
      }

      const actualPort = serverAddress.port;
      redirectUri = `http://localhost:${actualPort}`;

      // Create OAuth2Client with the correct redirect URI
      oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [...scopes],
        prompt: "consent",
        redirect_uri: redirectUri,
      });

      console.log(`\nOpening browser for authorization...`);
      console.log(`Listening on http://localhost:${actualPort}`);
      console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);

      // Open browser automatically
      open(authUrl).catch(() => {
        console.log("Could not open browser automatically. Please open the URL above manually.");
      });
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use. Please close other applications using this port.`));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Get an authenticated OAuth2 client using a local server flow.
 * Automatically opens the browser and captures the authorization code.
 *
 * @param clientSecretsPath - Path to the client secrets JSON file.
 * @param scopes - OAuth2 scopes to request.
 * @param tokenPath - Path to store/retrieve tokens.
 * @returns An authenticated OAuth2 client.
 */
async function getAuthenticatedClient(
  clientSecretsPath: string,
  scopes: readonly string[],
  tokenPath: string
): Promise<OAuth2Client> {
  // Load client secrets
  const content = await readFile(clientSecretsPath, "utf-8");
  const secrets: ClientSecrets = JSON.parse(content);
  const { client_id, client_secret } = secrets.installed;

  // Create OAuth2 client (redirect URI will be set dynamically when server starts)
  const oauth2Client = new OAuth2Client(client_id, client_secret);

  // Check for existing credentials
  const storedCredentials = await loadCredentials(tokenPath);

  if (storedCredentials) {
    // Validate stored credentials have required fields
    if (!storedCredentials.access_token || !storedCredentials.refresh_token) {
      console.warn("Stored credentials are incomplete, re-authenticating...");
      // Continue to OAuth flow below
    } else {
      oauth2Client.setCredentials({
        access_token: storedCredentials.access_token,
        refresh_token: storedCredentials.refresh_token,
        token_type: storedCredentials.token_type,
        expiry_date: storedCredentials.expiry_date,
      });

      // Set up automatic token refresh and save
      oauth2Client.on("tokens", async (tokens) => {
        try {
          const updated: StoredCredentials = {
            access_token: tokens.access_token || storedCredentials.access_token,
            refresh_token: tokens.refresh_token || storedCredentials.refresh_token,
            token_type: tokens.token_type || storedCredentials.token_type,
            expiry_date: tokens.expiry_date || storedCredentials.expiry_date,
          };
          await saveCredentials(tokenPath, updated);
        } catch (err) {
          console.error("Failed to save refreshed credentials:", err);
          // Don't throw - token refresh still succeeded, just couldn't save
        }
      });

      return oauth2Client;
    }
  }

  // No stored credentials - run local server OAuth flow
  // Server will assign a random port and create OAuth2Client with correct redirect URI
  const authenticatedClient = await runLocalServerFlow(
    client_id,
    client_secret,
    scopes
  );

  // Save credentials for future use
  const tokens = authenticatedClient.credentials;
  const credentialsToStore: StoredCredentials = {
    access_token: tokens.access_token || "",
    refresh_token: tokens.refresh_token || "",
    token_type: tokens.token_type || "Bearer",
    expiry_date: tokens.expiry_date || 0,
  };
  await saveCredentials(tokenPath, credentialsToStore);

  // Set up automatic token refresh and save
  authenticatedClient.on("tokens", async (newTokens) => {
    try {
      const updated: StoredCredentials = {
        access_token: newTokens.access_token || credentialsToStore.access_token,
        refresh_token:
          newTokens.refresh_token || credentialsToStore.refresh_token,
        token_type: newTokens.token_type || credentialsToStore.token_type,
        expiry_date: newTokens.expiry_date || credentialsToStore.expiry_date,
      };
      await saveCredentials(tokenPath, updated);
    } catch (err) {
      console.error("Failed to save refreshed credentials:", err);
      // Don't throw - token refresh still succeeded, just couldn't save
    }
  });

  return authenticatedClient;
}

/**
 * Get an authenticated Google Tag Manager API v2 service.
 *
 * @param clientSecretsPath - Path to the OAuth2 client secrets JSON file. Defaults to "client_secrets.json".
 * @param tokenPath - Path to store/retrieve OAuth tokens. Defaults to "tagmanager.token.json".
 * @returns An authenticated Tag Manager API v2 service object.
 */
export async function getGtmService(
  clientSecretsPath: string = "client_secrets.json",
  tokenPath: string = "tagmanager.token.json"
): Promise<tagmanager_v2.Tagmanager> {
  // Validate client secrets file exists
  try {
    await access(clientSecretsPath, constants.F_OK);
  } catch {
    throw new Error(`Client secrets file not found: ${clientSecretsPath}`);
  }

  const auth = await getAuthenticatedClient(
    clientSecretsPath,
    TAG_MANAGER_SCOPES,
    tokenPath
  );

  // Build the service object using googleapis
  return google.tagmanager({ version: "v2", auth });
}
