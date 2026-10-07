import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { parseCliArgs, runCli } from "../src/cli.js";
import { deleteWorkspace, workspaceUrl } from "../src/resources/workspaces.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";

const constant = (value: string) =>
  defineContainer({
    variable: [
      { name: "Const - X", type: "c", parameter: [{ type: "template", key: "value", value }] },
    ],
  });

function fake() {
  const { service, state } = createFakeService();
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

const named = (state: ReturnType<typeof fake>["state"], name: string) =>
  state.workspaces.filter((w) => w.name === name);

describe("apply without a version", () => {
  it("reconciles the workspace, leaves it in place and creates no version", async () => {
    const { client, state } = fake();
    const outcome = await applySpec(client, {
      container: "GTM-ABC123",
      workspace: "pr-42",
      spec: constant("a"),
    });
    expect(outcome.plan.ops.some((o) => o.kind === "version")).toBe(false);
    expect(outcome.result?.versionPath).toBeUndefined();
    expect(state.calls).not.toContain("workspaces.create_version");
    const [ws] = named(state, "pr-42");
    expect(ws).toBeDefined();
    expect(outcome.result?.workspaceUrl).toBe(workspaceUrl(ws.path!));
    expect(outcome.result?.workspaceUrl).toMatch(
      /^https:\/\/tagmanager\.google\.com\/#\/container\/accounts\/1\/containers\/10\/workspaces\/\d+$/
    );
  });

  it("updates the same workspace when run again with a changed spec", async () => {
    const { client, state } = fake();
    const target = { container: "GTM-ABC123", workspace: "pr-42" };
    await applySpec(client, { ...target, spec: constant("a") });
    const again = await applySpec(client, { ...target, spec: constant("b") });
    expect(again.plan.ops.find((o) => o.name === "Const - X")?.action).toBe("update");
    expect(named(state, "pr-42")).toHaveLength(1);
    const variable = state.variables.find((v) => v.name === "Const - X");
    expect(variable?.parameter?.[0].value).toBe("b");
  });
});

describe("deleteWorkspace", () => {
  it("deletes a workspace by name and reports one that is already gone", async () => {
    const { client, state } = fake();
    await applySpec(client, { container: "GTM-ABC123", workspace: "pr-42", spec: constant("a") });
    expect(await deleteWorkspace(client, "accounts/1/containers/10", "pr-42")).toBe(true);
    expect(named(state, "pr-42")).toHaveLength(0);
    expect(await deleteWorkspace(client, "accounts/1/containers/10", "pr-42")).toBe(false);
  });

  it("refuses the Default Workspace", async () => {
    const { client } = fake();
    await expect(
      deleteWorkspace(client, "accounts/1/containers/10", "Default Workspace")
    ).rejects.toThrow(/Default Workspace/);
  });
});

describe("cli", () => {
  it("parses the delete-workspace command", () => {
    expect(
      parseCliArgs(["delete-workspace", "--container", "GTM-X", "--workspace", "pr-1"])
    ).toMatchObject({ command: "delete-workspace", container: "GTM-X", workspace: "pr-1" });
  });

  it("prints the workspace URL after an apply, then deletes the workspace", async () => {
    const { client, state } = fake();
    const dir = await mkdtemp(join(tmpdir(), "gtm-preview-"));
    const specPath = join(dir, "spec.json");
    await writeFile(specPath, JSON.stringify(constant("a")));
    const lines: string[] = [];
    const out = (l: string) => lines.push(l);
    const base = ["--container", "GTM-ABC123", "--workspace", "pr-7"];
    expect(await runCli(parseCliArgs(["apply", ...base, "--spec", specPath]), client, out)).toBe(0);
    const [ws] = named(state, "pr-7");
    expect(lines).toContain(`Workspace "pr-7": ${workspaceUrl(ws.path!)}`);
    expect(await runCli(parseCliArgs(["delete-workspace", ...base]), client, out)).toBe(0);
    expect(lines.at(-1)).toBe('Deleted workspace "pr-7".');
    expect(await runCli(parseCliArgs(["delete-workspace", ...base]), client, out)).toBe(0);
    expect(lines.at(-1)).toBe('No workspace named "pr-7"; nothing to delete.');
  });
});
