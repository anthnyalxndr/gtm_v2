import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { GtmSnapshot } from "../src/library/gtm-snapshot.js";
import { manifestVariable } from "../src/library/manifest.js";
import { libraryModuleSource } from "../src/plan/tracking-plan.js";
import { redactSnapshotSecrets } from "../src/snapshot/redact.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";

const env = (id: string, type: string, name: string, code: string) => ({
  path: `accounts/1/containers/10/environments/${id}`,
  accountId: "1",
  containerId: "10",
  environmentId: id,
  type,
  name,
  authorizationCode: code,
  authorizationTimestamp: "2026-09-29T00:00:00.000Z",
});

async function pulled() {
  const { service } = createFakeService({
    containers: [{ accountId: "1", containerId: "10", publicId: "GTM-ENV", name: "env" }],
    environments: [
      env("1", "live", "Live", "live-secret-code"),
      env("2", "latest", "Latest", "latest-secret-code"),
    ],
  });
  const client = new GtmClient({ service, minIntervalMs: 0 });
  await applySpec(client, {
    container: "GTM-ENV",
    workspace: "seed",
    spec: defineContainer({ variable: [manifestVariable({ recipes: {} })] }),
  });
  return new GtmSnapshot(client, { container: "GTM-ENV" }).init();
}

describe("environment authorization codes", () => {
  it("are read by the pull but never written to a committed library", async () => {
    const lib = await pulled();
    expect(lib.data.environments.map((e) => e.authorizationCode)).toEqual([
      "live-secret-code",
      "latest-secret-code",
    ]);
    const committed = JSON.stringify(lib.toJSON());
    expect(committed).not.toContain("secret-code");
    expect(committed).toContain('"Latest"');
    expect(libraryModuleSource(lib.toJSON())).not.toContain("secret-code");
  });

  it("are removed from every environment by redactSnapshotSecrets, the serving one included", async () => {
    const lib = await pulled();
    const data = { ...lib.data, environment: lib.data.environments[1] };
    const redacted = redactSnapshotSecrets(data);
    expect(JSON.stringify(redacted)).not.toContain("secret-code");
    expect(redacted.environments.map((e) => e.name)).toEqual(["Live", "Latest"]);
    expect(redacted.environment?.name).toBe("Latest");
    // The input is left as it was.
    expect(data.environments[0].authorizationCode).toBe("live-secret-code");
  });
});
