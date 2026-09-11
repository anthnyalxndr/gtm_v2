import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { writeFile, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { parseCliArgs, runCli } from "../src/cli.js";
import { createFakeService, emptyEntities } from "@anthnyalxndr/gtm-client/testing";

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
      live: false,
      versionName: "v1",
      version: undefined,
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

  it("apply reports every schema problem and makes no API call", async () => {
    const { client, state } = fresh();
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const bad = join(dir, "bad.json");
    await writeFile(
      bad,
      JSON.stringify({
        trigger: [{ name: "CE", type: "custom_event" }],
        tag: [{ name: "T", type: "html", tagFiringOption: "once", nonsense: true }],
      })
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["apply", "--container", "GTM-ABC123", "--workspace", "ws", "--spec", bad]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(1);
    expect(lines).toEqual([
      `Spec ${bad} has 3 problem(s):`,
      expect.stringMatching(/^\[!\] trigger "CE": type must be one of /),
      expect.stringMatching(/^\[!\] tag "T": tagFiringOption must be one of /),
      expect.stringMatching(/^\[!\] tag "T": nonsense is not a field of Tag/),
    ]);
    expect(state.calls).toEqual([]);
  });

  it("apply accepts a TypeScript spec module", async () => {
    const { client, state } = fresh();
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const spec = join(dir, "spec.ts");
    await writeFile(
      spec,
      [
        `const eventName: string = "lead";`,
        `export default {`,
        `  trigger: [{ name: "CE", type: "customEvent" as const, customEventFilter: [{ type: "equals" as const,`,
        `    parameter: [{ type: "template" as const, key: "arg0", value: "{{_event}}" },`,
        `                { type: "template" as const, key: "arg1", value: eventName }] }] }],`,
        `  tag: [{ name: "T", type: "html", firingTriggerName: ["CE"],`,
        `    parameter: [{ type: "template" as const, key: "html", value: "<script></script>" }] }],`,
        `};`,
      ].join("\n")
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["apply", "--container", "GTM-ABC123", "--workspace", "ws", "--spec", spec]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect(state.versions[0].snapshot.tag.map((t) => t.name)).toEqual(["T"]);
    expect(lines.join("\n")).toContain('[+] trigger "CE"');
  });

  it("snapshot prints everything the API exposes for the container", async () => {
    const { client, state } = fresh();
    const ws = client.service.accounts.containers.workspaces;
    const created = await ws.create({
      parent: "accounts/1/containers/10",
      requestBody: { name: "s" },
    });
    await ws.tags.create({ parent: created.data.path!, requestBody: { name: "T", type: "html" } });
    await ws.create_version({ path: created.data.path!, requestBody: { name: "v1" } });
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["snapshot", "--container", "GTM-ABC123"]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    const snap = JSON.parse(lines.join("\n"));
    expect(snap.containerType).toBe("web");
    expect(snap.tag.map((t: { name: string }) => t.name)).toEqual(["T"]);
    expect(snap.containerVersionHeader.containerVersionId).toBe(state.versions[0].versionId);
    expect(snap.destinations).toEqual([]);
  });

  it("export reads the latest version by default, the live one with --live", async () => {
    const { client, state } = fresh();
    const version = (id: string, tagName: string) => ({
      path: `accounts/1/containers/10/versions/${id}`,
      versionId: id,
      name: `v${id}`,
      snapshot: {
        ...emptyEntities(),
        trigger: [{ name: "PV", type: "pageview", triggerId: "1" }],
        tag: [{ name: tagName, type: "html", tagId: "2", firingTriggerId: ["1"] }],
      },
    });
    state.versions.push(version("8", "Published tag"), version("9", "Unpublished tag"));
    state.published.push("accounts/1/containers/10/versions/8");

    const run = async (argv: string[]) => {
      const lines: string[] = [];
      const code = await runCli(parseCliArgs(argv), client, (l) => lines.push(l));
      expect(code).toBe(0);
      return JSON.parse(lines.join("\n"));
    };
    const latest = await run(["export", "--container", "GTM-ABC123"]);
    expect(latest.tag[0]).toEqual({
      name: "Unpublished tag",
      type: "html",
      firingTriggerName: ["PV"],
    });
    const live = await run(["export", "--container", "GTM-ABC123", "--live"]);
    expect(live.tag[0].name).toBe("Published tag");
  });

  it("export --workspace reads an open workspace", async () => {
    const { client } = fresh();
    await runCli(
      parseCliArgs([
        "apply",
        "--container",
        "GTM-ABC123",
        "--workspace",
        "wip",
        "--spec",
        fixturePath,
      ]),
      client,
      () => undefined
    );
    // That apply created a version (deleting "wip"); re-applying recreates the workspace unchanged.
    await runCli(
      parseCliArgs([
        "apply",
        "--container",
        "GTM-ABC123",
        "--workspace",
        "wip",
        "--spec",
        fixturePath,
      ]),
      client,
      () => undefined
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["export", "--container", "GTM-ABC123", "--workspace", "wip"]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    const spec = JSON.parse(lines.join("\n"));
    expect(spec.tag.map((t: { name: string }) => t.name)).toEqual(["Ads - Lead"]);
    expect(spec.tag[0].firingTriggerName).toEqual(["Custom Event - lead", "Form Submit - contact"]);
    expect(spec.builtInVariable.sort()).toEqual(["formId", "pagePath"]);
  });
});
