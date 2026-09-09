import { homedir } from "os";
import { join } from "path";

export interface ConfigPaths {
  configDir: string;
  clientSecretsPath: string;
  tokenPath: string;
}

/**
 * Resolve where credentials live. One directory serves every repo that uses
 * the SDK, so a user authorizes once. Override with GTM_SDK_CONFIG_DIR.
 */
export function resolveConfigPaths(env: NodeJS.ProcessEnv = process.env): ConfigPaths {
  const configDir = env.GTM_SDK_CONFIG_DIR ?? join(homedir(), ".config", "gtm-sdk");
  return {
    configDir,
    clientSecretsPath: join(configDir, "client_secrets.json"),
    tokenPath: join(configDir, "token.json"),
  };
}
