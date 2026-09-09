import { describe, it, expect } from "vitest";
import { homedir } from "os";
import { join } from "path";
import { resolveConfigPaths } from "../src/config.js";

describe("resolveConfigPaths", () => {
  it("defaults to ~/.config/gtm-sdk", () => {
    const paths = resolveConfigPaths({});
    expect(paths.configDir).toBe(join(homedir(), ".config", "gtm-sdk"));
    expect(paths.clientSecretsPath).toBe(join(paths.configDir, "client_secrets.json"));
    expect(paths.tokenPath).toBe(join(paths.configDir, "token.json"));
  });

  it("honors GTM_SDK_CONFIG_DIR", () => {
    const paths = resolveConfigPaths({ GTM_SDK_CONFIG_DIR: "/tmp/gtm" });
    expect(paths.configDir).toBe("/tmp/gtm");
    expect(paths.tokenPath).toBe("/tmp/gtm/token.json");
  });
});
