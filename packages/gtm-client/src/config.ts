import { homedir } from "os";
import { join } from "path";

export interface ConfigPaths {
  configDir: string;
  clientSecretsPath: string;
  tokenPath: string;
}

/**
 * Resolve where credentials live. One directory serves every repo that uses
 * gtm-apply, so a user authorizes once. Override with GTM_APPLY_CONFIG_DIR.
 */
export function resolveConfigPaths(env: NodeJS.ProcessEnv = process.env): ConfigPaths {
  const configDir = env.GTM_APPLY_CONFIG_DIR ?? join(homedir(), ".config", "gtm-apply");
  return {
    configDir,
    clientSecretsPath: join(configDir, "client_secrets.json"),
    tokenPath: join(configDir, "token.json"),
  };
}
