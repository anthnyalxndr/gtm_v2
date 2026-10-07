import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { parseCliArgs, runCli } from "../src/cli.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";

const spec = defineContainer({
  variable: [
    { name: "Const - X", type: "c", parameter: [{ type: "template", key: "value", value: "x" }] },
  ],
});
const target = { container: "GTM-ABC123", workspace: "release" };

/** Account 1 holds container 10 (GTM-ABC123). Only the owner may publish it. */
function fake(email?: string) {
  const { service, state } = createFakeService({
    userPermissions: [
      {
        accountId: "1",
        emailAddress: "editor@acme.com",
        containerAccess: [{ containerId: "10", permission: "edit" }],
      },
      {
        accountId: "1",
        emailAddress: "owner@acme.com",
        containerAccess: [{ containerId: "10", permission: "publish" }],
      },
      {
        accountId: "1",
        emailAddress: "elsewhere@acme.com",
        containerAccess: [{ containerId: "99", permission: "publish" }],
      },
    ],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0, email }), state, service };
}

describe("publish permission", () => {
  it("stops before creating a version when the caller lacks Publish, naming who holds it", async () => {
    const { client, state } = fake("editor@acme.com");
    const error = await applySpec(client, { ...target, spec, publish: true }).catch(
      (e: Error) => e
    );
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toMatch(/editor@acme\.com .*GTM-ABC123/);
    expect(message).toContain("owner@acme.com");
    expect(message).not.toContain("elsewhere@acme.com");
    expect(message).toMatch(
      /https:\/\/tagmanager\.google\.com\/#\/container\/accounts\/1\/containers\/10\/workspaces\/\d+/
    );

    // The workspace is intact with the applied change; nothing was versioned or published.
    expect(state.calls).not.toContain("workspaces.create_version");
    expect(state.versions).toEqual([]);
    expect(state.published).toEqual([]);
    expect(state.workspaces.map((w) => w.name)).toEqual(["release"]);
    expect(state.variables.map((v) => v.name)).toEqual(["Const - X"]);
  });

  it("publishes when the caller holds Publish on the container", async () => {
    const { client, state } = fake("owner@acme.com");
    const { result } = await applySpec(client, { ...target, spec, publish: true });
    expect(result?.published).toBe(true);
    expect(result?.warnings).toEqual([]);
    expect(state.published).toEqual([state.versions[0].path]);
  });

  it("publishes with a warning when the caller's email is unknown", async () => {
    const { client, state } = fake();
    const { result } = await applySpec(client, { ...target, spec, publish: true });
    expect(result?.published).toBe(true);
    expect(result?.warnings).toEqual([expect.stringMatching(/not checked.*email/)]);
    expect(state.calls).not.toContain("user_permissions.list");
  });

  it("publishes with a warning when the account's users cannot be listed", async () => {
    const { client, service } = fake("editor@acme.com");
    service.accounts.user_permissions.list = (async () => {
      throw Object.assign(new Error("The caller does not have permission"), { code: 403 });
    }) as typeof service.accounts.user_permissions.list;
    const { result } = await applySpec(client, { ...target, spec, publish: true });
    expect(result?.published).toBe(true);
    expect(result?.warnings).toEqual([
      expect.stringMatching(/not checked.*users.*The caller does not have permission/),
    ]);
  });

  it("does not check permissions when no publish is requested", async () => {
    const { client, state } = fake("editor@acme.com");
    const { result } = await applySpec(client, { ...target, spec, version: true });
    expect(result?.versionPath).toBeDefined();
    expect(state.calls).not.toContain("user_permissions.list");
  });
});

describe("cli --publish", () => {
  async function specFile(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "gtm-publish-"));
    const path = join(dir, "spec.json");
    await writeFile(path, JSON.stringify(spec));
    return path;
  }
  const args = async () => [
    "apply",
    "--container",
    target.container,
    "--workspace",
    target.workspace,
    "--spec",
    await specFile(),
    "--publish",
  ];

  it("fails without publishing and leaves the workspace when the caller lacks Publish", async () => {
    const { client, state } = fake("editor@acme.com");
    await expect(runCli(parseCliArgs(await args()), client, () => undefined)).rejects.toThrow(
      /owner@acme\.com/
    );
    expect(state.published).toEqual([]);
    expect(state.workspaces.map((w) => w.name)).toEqual(["release"]);
  });

  it("prints the skipped check as a warning before the version line", async () => {
    const { client } = fake();
    const lines: string[] = [];
    expect(await runCli(parseCliArgs(await args()), client, (l) => lines.push(l))).toBe(0);
    const warning = lines.findIndex((l) => /^\[\?\] Publish permission not checked/.test(l));
    expect(warning).toBeGreaterThan(-1);
    expect(lines.at(-1)).toMatch(/^Version: .* \(published\)$/);
  });
});
