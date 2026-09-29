import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { parseCliArgs, runCli } from "../src/cli.js";
import { applySpec } from "../src/spec/execute.js";
import { formatPlan } from "../src/spec/plan.js";
import { defineContainer } from "../src/spec/types.js";
import { formatIssue, validateSpec } from "../src/spec/validate.js";
import { pullSnapshot, snapshotToSpec } from "../src/snapshot/pull.js";

const builtIn = (id: string, type: string, name: string) => ({
  path: `accounts/1/containers/10/environments/${id}`,
  accountId: "1",
  containerId: "10",
  environmentId: id,
  type,
  name,
  authorizationCode: `${type}-code`,
  fingerprint: "1",
});

function fake() {
  const { service, state } = createFakeService({
    environments: [builtIn("1", "live", "Live"), builtIn("2", "latest", "Latest")],
  });
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

const staging = (description = "Staging site") =>
  defineContainer({
    environment: [
      { name: "Staging", description, url: "https://staging.example.com", enableDebug: true },
    ],
  });

const target = { container: "GTM-ABC123", workspace: "envs" };

describe("custom environments", () => {
  it("creates an environment by name, and a second apply reports it unchanged", async () => {
    const { client, state } = fake();
    const first = await applySpec(client, { ...target, spec: staging() });
    expect(first.plan.ops.find((o) => o.kind === "environment")).toMatchObject({
      name: "Staging",
      action: "create",
    });
    const env = state.environments.find((e) => e.name === "Staging");
    expect(env).toMatchObject({
      type: "user",
      description: "Staging site",
      url: "https://staging.example.com",
      enableDebug: true,
    });
    const again = await applySpec(client, { ...target, spec: staging() });
    expect(again.plan.ops.find((o) => o.kind === "environment")?.action).toBe("unchanged");
    expect(state.environments.filter((e) => e.name === "Staging")).toHaveLength(1);
  });

  it("updates a changed environment in place, keeping its id", async () => {
    const { client, state } = fake();
    await applySpec(client, { ...target, spec: staging() });
    const id = state.environments.find((e) => e.name === "Staging")?.environmentId;
    const changed = await applySpec(client, { ...target, spec: staging("Staging, new site") });
    expect(changed.plan.ops.find((o) => o.kind === "environment")?.action).toBe("update");
    const env = state.environments.find((e) => e.name === "Staging");
    expect(env?.environmentId).toBe(id);
    expect(env?.description).toBe("Staging, new site");
  });

  it("does not create a version when only environments change", async () => {
    const { client, state } = fake();
    await applySpec(client, { ...target, spec: staging() });
    expect(state.calls).not.toContain("workspaces.create_version");
  });

  it("lists environment operations under a container-level heading", async () => {
    const { client } = fake();
    const outcome = await applySpec(client, { ...target, spec: staging(), dryRun: true });
    const text = formatPlan(outcome.plan);
    expect(text).toContain("Environments (container level, not versioned):");
    expect(text.indexOf("Environments (container level")).toBeLessThan(
      text.indexOf('environment "Staging"')
    );
  });

  it("rejects Live, Latest and fields Tag Manager sets itself", () => {
    const issues = validateSpec({
      environment: [
        { name: "Live" },
        { name: "latest" },
        { name: "QA", authorizationCode: "x" },
        { name: "Preview", type: "workspace" },
      ],
    }).map(formatIssue);
    expect(issues).toEqual([
      'environment "Live": name is built in; Live and Latest are never in a spec',
      'environment "latest": name is built in; Live and Latest are never in a spec',
      'environment "QA": authorizationCode is set by Tag Manager and never in a spec',
      'environment "Preview": type must be "user" (only custom environments are in a spec)',
    ]);
  });

  it("puts custom environments in a spec from a snapshot, without Live, Latest or codes", async () => {
    const { client } = fake();
    await applySpec(client, { ...target, spec: staging() });
    // Only environments changed, so no version exists; read the workspace instead.
    const snap = await pullSnapshot(client, { container: "GTM-ABC123", workspace: "envs" });
    const spec = snapshotToSpec(snap);
    expect(spec.environment).toEqual([
      {
        name: "Staging",
        description: "Staging site",
        url: "https://staging.example.com",
        enableDebug: true,
      },
    ]);
    expect(JSON.stringify(spec)).not.toContain("-code");
  });

  it("exports custom environments with the latest version, without Live, Latest or codes", async () => {
    const { client } = fake();
    // A variable change as well, so the apply creates a version to export.
    await applySpec(client, {
      ...target,
      spec: defineContainer({
        ...staging(),
        variable: [
          {
            name: "Const - X",
            type: "c",
            parameter: [{ type: "template", key: "value", value: "x" }],
          },
        ],
      }),
    });
    const lines: string[] = [];
    const code = await runCli(parseCliArgs(["export", "--container", "GTM-ABC123"]), client, (l) =>
      lines.push(l)
    );
    expect(code).toBe(0);
    const exported = JSON.parse(lines.join("\n"));
    expect(exported.environment).toEqual([
      {
        name: "Staging",
        description: "Staging site",
        url: "https://staging.example.com",
        enableDebug: true,
      },
    ]);
    expect(lines.join("\n")).not.toContain("-code");
    expect(lines.join("\n")).not.toContain("auth-");
  });
});
