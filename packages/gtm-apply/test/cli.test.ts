import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { writeFile, mkdtemp, readdir, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { parseCliArgs, runCli } from "../src/cli.js";
import { createFakeService, emptyEntities } from "@anthnyalxndr/gtm-client/testing";
import { seedVersion } from "./account.test.js";

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
      plan: undefined,
      library: undefined,
      writeSpec: undefined,
      containers: ["GTM-ABC123"],
      account: undefined,
      out: undefined,
      env: undefined,
      config: undefined,
    });
  });

  it("collects repeated --container and reads --account and --out", () => {
    const args = parseCliArgs([
      "snapshot",
      "--container",
      "GTM-A",
      "--container",
      "GTM-B",
      "--out",
      "dir",
    ]);
    expect(args.container).toBe("GTM-A");
    expect(args.containers).toEqual(["GTM-A", "GTM-B"]);
    expect(args.out).toBe("dir");
    expect(parseCliArgs(["snapshot", "--account", "1", "--out", "d"]).account).toBe("1");
  });

  it("accepts pull", () => {
    expect(parseCliArgs(["pull", "--account", "1", "--out", "gtm/containers"])).toMatchObject({
      command: "pull",
      account: "1",
      out: "gtm/containers",
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
  it("snapshot --account writes one canonical file per container into --out", async () => {
    const { service, state } = createFakeService({
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
        { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    await seedVersion(client, state, "accounts/1/containers/11", "Tag B");
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["snapshot", "--account", "1", "--out", dir]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect((await readdir(dir)).sort()).toEqual(["GTM-AAA.json", "GTM-BBB.json"]);
    const b = JSON.parse(await readFile(join(dir, "GTM-BBB.json"), "utf-8"));
    expect(b.tag[0].name).toBe("Tag B");
    expect(lines).toEqual([
      `Wrote ${join(dir, "GTM-AAA.json")}`,
      `Wrote ${join(dir, "GTM-BBB.json")}`,
    ]);
  });

  it("pull --container writes the directory and exits 0", async () => {
    const { client, state } = fresh();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["pull", "--container", "GTM-ABC123", "--out", dir]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect((await readdir(dir)).sort()).toEqual(["container.json", "snapshot.json", "spec.json"]);
    expect(lines).toEqual([`GTM-ABC123: wrote ${dir}`]);
  });

  it("pull --account writes every container and exits 1 when one fails", async () => {
    const { service, state } = createFakeService({
      containers: [
        { accountId: "1", containerId: "10", publicId: "GTM-AAA", name: "a.com" },
        { accountId: "1", containerId: "11", publicId: "GTM-BBB", name: "b.com" },
      ],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    const root = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["pull", "--account", "1", "--out", root]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(1);
    expect(await readdir(root)).toEqual(["a-com"]);
    expect(lines[0]).toBe(`GTM-AAA: wrote ${join(root, "a-com")}`);
    expect(lines[1]).toMatch(/^GTM-BBB: pull failed: .*no versions/);
  });

  it("pull refuses without --out or without a target", async () => {
    const { client } = fresh();
    await expect(
      runCli(parseCliArgs(["pull", "--container", "GTM-ABC123"]), client)
    ).rejects.toThrow(/--out/);
    await expect(runCli(parseCliArgs(["pull", "--out", "x"]), client)).rejects.toThrow(
      /--container or --account/
    );
  });

  it("apply --env resolves the container, spec and workspace from the repo config", async () => {
    const { client, state } = fresh();
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const config = join(dir, "gtm.config.json");
    await writeFile(
      config,
      JSON.stringify({
        containers: { "acme-com": { publicId: "GTM-ABC123", env: "prod", spec: fixturePath } },
        defaults: { workspace: "${env}-${slug}-${commit}" },
      })
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["apply", "--env", "prod", "--config", config, "--dry-run"]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect(lines[0].split("\n")[0]).toMatch(
      /^Container GTM-ABC123 \(acme\.com\), workspace "prod-acme-com-\w+"$/
    );
    expect(lines.join("\n")).toContain('[+] tag "Ads - Lead"');
    expect(state.calls.some((c) => c.endsWith(".create"))).toBe(false);
  });

  it("explicit flags win over the repo config, and an unknown env names the file", async () => {
    const { client } = fresh();
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const config = join(dir, "gtm.config.json");
    await writeFile(
      config,
      JSON.stringify({
        containers: { "acme-com": { publicId: "GTM-NOPE", env: "prod", spec: "/nowhere.json" } },
      })
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs([
        "apply",
        "--env",
        "prod",
        "--config",
        config,
        "--container",
        "GTM-ABC123",
        "--spec",
        fixturePath,
        "--workspace",
        "mine",
        "--dry-run",
      ]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    expect(lines[0]).toContain('Container GTM-ABC123 (acme.com), workspace "mine"');
    await expect(
      runCli(parseCliArgs(["apply", "--env", "qa", "--config", config, "--dry-run"]), client)
    ).rejects.toThrow(/gtm\.config\.json: containers: no container with env or slug "qa"/);
  });

  it("pull --env writes into the container directory from the repo config", async () => {
    const { client, state } = fresh();
    await seedVersion(client, state, "accounts/1/containers/10", "Tag A");
    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const config = join(dir, "gtm.config.json");
    await writeFile(
      config,
      JSON.stringify({ containers: { "acme-com": { publicId: "GTM-ABC123", env: "prod" } } })
    );
    const lines: string[] = [];
    const code = await runCli(
      parseCliArgs(["pull", "--env", "prod", "--config", config]),
      client,
      (l) => lines.push(l)
    );
    expect(code).toBe(0);
    const target = join(dir, "gtm", "containers", "acme-com");
    expect((await readdir(target)).sort()).toEqual([
      "container.json",
      "snapshot.json",
      "spec.json",
    ]);
    expect(lines).toEqual([`GTM-ABC123: wrote ${target}`]);
  });

  it("snapshot of several containers refuses without --out", async () => {
    const { client } = fresh();
    await expect(
      runCli(parseCliArgs(["snapshot", "--container", "GTM-A", "--container", "GTM-B"]), client)
    ).rejects.toThrow(/--out/);
    await expect(runCli(parseCliArgs(["snapshot", "--account", "1"]), client)).rejects.toThrow(
      /--out/
    );
  });

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

  it("normalize prints canonical output and is idempotent on it", async () => {
    const { client } = fresh();
    const first: string[] = [];
    expect(
      await runCli(parseCliArgs(["normalize", fixturePath]), client, (l) => first.push(l))
    ).toBe(0);
    const spec = JSON.parse(first.join("\n"));
    expect(spec.builtInVariable).toEqual(["formId", "pagePath"]);
    expect(Object.keys(spec.tag[0]).slice(0, 2)).toEqual(["name", "type"]);

    const dir = await mkdtemp(join(tmpdir(), "gtm-cli-"));
    const again = join(dir, "spec.json");
    await writeFile(again, first.join("\n") + "\n");
    const second: string[] = [];
    expect(await runCli(parseCliArgs(["normalize", again]), client, (l) => second.push(l))).toBe(0);
    expect(second.join("\n")).toBe(first.join("\n"));
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
