import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { writeFile, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { GtmClient } from "../src/gtm_v2.js";
import { parseCliArgs, runCli } from "../src/cli.js";
import { createFakeService } from "./helpers/fakeService.js";

const fixturePath = fileURLToPath(new URL("./fixtures/ui-export.json", import.meta.url));

describe("parseCliArgs", () => {
  it("parses apply with flags", () => {
    const args = parseCliArgs([
      "apply",
      "--container",
      "GTM-ABC123",
      "--workspace",
      "ws",
      "--spec",
      "spec.json",
      "--dry-run",
      "--publish",
      "--version-name",
      "v1",
    ]);
    expect(args).toEqual({
      command: "apply",
      container: "GTM-ABC123",
      workspace: "ws",
      spec: "spec.json",
      file: undefined,
      dryRun: true,
      publish: true,
      versionName: "v1",
    });
  });

  it("parses normalize with a file and rejects unknown commands", () => {
    expect(parseCliArgs(["normalize", "x.json"])).toMatchObject({
      command: "normalize",
      file: "x.json",
    });
    expect(() => parseCliArgs(["frobnicate"])).toThrow(/Usage/);
  });
});

function fresh() {
  const { service, state } = createFakeService();
  return { client: new GtmClient({ service, minIntervalMs: 0 }), state };
}

describe("runCli", () => {
  it("normalize prints a normalized spec", async () => {
    const { client } = fresh();
    const lines: string[] = [];
    const code = await runCli(parseCliArgs(["normalize", fixturePath]), client, (l) =>
      lines.push(l)
    );
    expect(code).toBe(0);
    const spec = JSON.parse(lines.join("\n"));
    expect(spec.tag[0].firingTriggerName).toEqual(["Custom Event - lead", "Form Submit - contact"]);
  });

  it("apply --dry-run prints the plan and writes nothing", async () => {
    const { client, state } = fresh();
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs([
        "apply",
        "--container",
        "GTM-ABC123",
        "--workspace",
        "ws",
        "--spec",
        fixturePath,
        "--dry-run",
      ]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain('[+] tag "Ads - Lead"');
    expect(lines.join("\n")).toContain("Dry run");
    expect(state.calls.some((c) => c.endsWith(".create"))).toBe(false);
  });

  it("apply executes and reports the version", async () => {
    const { client, state } = fresh();
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs([
        "apply",
        "--container",
        "GTM-ABC123",
        "--workspace",
        "ws",
        "--spec",
        fixturePath,
      ]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect(state.versions[0].snapshot.tag).toHaveLength(1);
    expect(lines[lines.length - 1]).toMatch(
      /^Version: accounts\/1\/containers\/10\/versions\/\d+$/
    );
  });

  it("apply returns 1 on plan errors", async () => {
    const { client, state } = fresh();
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const bad = join(dir, "bad.json");
    await writeFile(
      bad,
      JSON.stringify({ tag: [{ name: "T", type: "html", firingTriggerName: ["Missing"] }] })
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["apply", "--container", "GTM-ABC123", "--workspace", "ws", "--spec", bad]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("[!]");
    expect(state.tags).toHaveLength(0);
  });

  it("export prints the live container as a spec", async () => {
    const { client, state } = fresh();
    state.versions.push({
      path: "accounts/1/containers/10/versions/9",
      versionId: "9",
      name: "live",
      snapshot: {
        folder: [],
        variable: [],
        trigger: [{ name: "PV", type: "pageview", triggerId: "1" }],
        tag: [{ name: "T", type: "html", tagId: "2", firingTriggerId: ["1"] }],
        builtIns: [],
      },
    });
    state.published.push("accounts/1/containers/10/versions/9");
    const lines: string[] = [];
    const code = await runCli(parseCliArgs(["export", "--container", "GTM-ABC123"]), client, (l) =>
      lines.push(l)
    );
    expect(code).toBe(0);
    const spec = JSON.parse(lines.join("\n"));
    expect(spec.tag[0]).toEqual({ name: "T", type: "html", firingTriggerName: ["PV"] });
  });
});
