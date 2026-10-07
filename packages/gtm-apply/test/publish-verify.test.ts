import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { parseCliArgs, runCli, runShellCommand } from "../src/cli.js";
import { applySpec } from "../src/spec/execute.js";
import { defineContainer } from "../src/spec/types.js";

const spec = defineContainer({
  variable: [
    { name: "Const - X", type: "c", parameter: [{ type: "template", key: "value", value: "x" }] },
  ],
});
const target = { container: "GTM-ABC123", workspace: "release" };

function fake() {
  const { service, state } = createFakeService();
  return { service, state, client: new GtmClient({ service, minIntervalMs: 0 }) };
}

async function specFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "gtm-verify-"));
  const path = join(dir, "spec.json");
  await writeFile(path, JSON.stringify(spec));
  return path;
}

describe("publish verification", () => {
  it("confirms the live version is the one just published", async () => {
    const { client, state } = fake();
    const outcome = await applySpec(client, { ...target, spec, publish: true });
    expect(outcome.result?.published).toBe(true);
    expect(state.calls.filter((c) => c === "versions.live")).toHaveLength(1);
  });

  it("fails when the live version is not the one just published", async () => {
    const { service, client } = fake();
    service.accounts.containers.versions.live = (async () => ({
      data: { path: "accounts/1/containers/10/versions/999", containerVersionId: "999" },
    })) as unknown as typeof service.accounts.containers.versions.live;
    await expect(applySpec(client, { ...target, spec, publish: true })).rejects.toThrow(
      /live version is 999/
    );
  });

  it("runs the verify command after a successful publish and returns its exit code", async () => {
    const { client } = fake();
    const ran: string[] = [];
    const runner = async (command: string) => {
      ran.push(command);
      return 2;
    };
    const args = parseCliArgs([
      "apply",
      "--container",
      "GTM-ABC123",
      "--workspace",
      "release",
      "--spec",
      await specFile(),
      "--publish",
      "--verify",
      "pnpm audit:live",
    ]);
    expect(args.verify).toBe("pnpm audit:live");
    const lines: string[] = [];
    expect(await runCli(args, client, (l) => lines.push(l), runner)).toBe(2);
    expect(ran).toEqual(["pnpm audit:live"]);
    expect(lines).toContain("Verify: pnpm audit:live exited with 2");
  });

  it("does not run the verify command on a dry run, and needs --publish", async () => {
    const { client } = fake();
    const ran: string[] = [];
    const runner = async (command: string) => {
      ran.push(command);
      return 0;
    };
    const base = [
      "apply",
      "--container",
      "GTM-ABC123",
      "--workspace",
      "release",
      "--spec",
      await specFile(),
    ];
    expect(
      await runCli(
        parseCliArgs([...base, "--publish", "--dry-run", "--verify", "x"]),
        client,
        () => {},
        runner
      )
    ).toBe(0);
    expect(ran).toEqual([]);
    await expect(
      runCli(parseCliArgs([...base, "--verify", "x"]), client, () => {}, runner)
    ).rejects.toThrow(/--verify needs --publish/);
  });

  it("runs a shell command and reports its exit code", async () => {
    expect(await runShellCommand("exit 3")).toBe(3);
    expect(await runShellCommand("true")).toBe(0);
  });
});
