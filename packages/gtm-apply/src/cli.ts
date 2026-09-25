import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { resolveContainer } from "@anthnyalxndr/gtm-client";
import { loadSpecFile } from "./spec/load.js";
import { normalizeExport } from "./spec/normalize.js";
import { stringifySpec } from "./spec/canonical.js";
import { stringifySnapshot } from "./snapshot/canonical.js";
import { formatIssue, validateSpec } from "./spec/validate.js";
import { executePlan } from "./spec/execute.js";
import { formatPlan, planContainerSpec } from "./spec/plan.js";
import { pullSnapshot } from "./snapshot/pull.js";
import { pullSnapshots, snapshotAccount } from "./snapshot/account.js";
import { pullAccount, pullContainer } from "./snapshot/dir.js";
import type { SnapshotSource } from "./snapshot/types.js";
import { GtmSnapshot, type GtmSnapshotData } from "./library/gtm-snapshot.js";
import { applyPlan, compilePlan, type TrackingPlan } from "./plan/tracking-plan.js";
import { formatIssue as formatSpecIssue } from "./spec/validate.js";
import { gitShortSha, loadRepoConfig, renderWorkspace, resolveEnv } from "./config.js";
import { dirname } from "node:path";

export type CliCommand = "apply" | "normalize" | "export" | "snapshot" | "pull";

export interface CliArgs {
  command: CliCommand;
  container?: string;
  /** Every --container given, in order; `container` is the first. */
  containers: string[];
  account?: string;
  out?: string;
  /** A container from the repo config file, by env name or slug. */
  env?: string;
  /** Path of the repo config file; default: gtm.config.{json,ts,js,mjs} in the working directory. */
  config?: string;
  workspace?: string;
  spec?: string;
  file?: string;
  dryRun: boolean;
  publish: boolean;
  live: boolean;
  versionName?: string;
  version?: string;
  plan?: string;
  library?: string;
  writeSpec?: string;
}

export const USAGE = `Usage:
  gtm-apply apply --container GTM-XXXXXXX --workspace <name> --spec <file> [--dry-run] [--publish] [--version-name <name>]
      (<file> is .json, or a .js/.mjs/.ts module whose default export is the spec)
  gtm-apply apply --container GTM-XXXXXXX --workspace <name> --plan <plan.ts> --library <library.json|module> [--write-spec <file>] [...]
      (compile a tracking plan against a library, then apply it)
  gtm-apply normalize <export.json>
  gtm-apply export --container GTM-XXXXXXX [--live | --workspace <name>]
      (default: the latest version, published or not)
  gtm-apply snapshot --container GTM-XXXXXXX [--live | --version <id> | --workspace <name>]
      (everything the API exposes for the container, as returned by the API)
  gtm-apply snapshot (--container GTM-A --container GTM-B | --account <id>) --out <dir>
      (one <publicId>.json per container)
  gtm-apply pull --container GTM-XXXXXXX --out <dir> [--live | --version <id> | --workspace <name>]
      (writes <dir>/spec.json, snapshot.json and container.json)
  gtm-apply pull --account <id> --out <dir>
      (one <dir>/<slug>/ per container, slug from the container name; exits 1 if any container failed, after trying them all)
  gtm-apply <command> --env <name> [--config <file>]
      (resolve --container, and for apply --spec and --workspace, for pull --out, from the repo config
       file gtm.config.json; explicit flags win)`;

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      container: { type: "string", multiple: true },
      account: { type: "string" },
      out: { type: "string" },
      env: { type: "string" },
      config: { type: "string" },
      workspace: { type: "string" },
      spec: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      publish: { type: "boolean", default: false },
      live: { type: "boolean", default: false },
      "version-name": { type: "string" },
      version: { type: "string" },
      plan: { type: "string" },
      library: { type: "string" },
      "write-spec": { type: "string" },
    },
  });
  const command = positionals[0];
  if (!["apply", "normalize", "export", "snapshot", "pull"].includes(command)) {
    throw new Error(USAGE);
  }
  return {
    command: command as CliCommand,
    container: values.container?.[0],
    containers: values.container ?? [],
    account: values.account,
    out: values.out,
    env: values.env,
    config: values.config,
    workspace: values.workspace,
    spec: values.spec,
    file: positionals[1],
    dryRun: values["dry-run"] ?? false,
    publish: values.publish ?? false,
    live: values.live ?? false,
    versionName: values["version-name"],
    version: values.version,
    plan: values.plan,
    library: values.library,
    writeSpec: values["write-spec"],
  };
}

/** The SnapshotSource the flags describe for one container. */
function sourceFromArgs(args: CliArgs, container: string): SnapshotSource {
  return {
    container,
    ...(args.workspace ? { workspace: args.workspace } : {}),
    ...(args.live ? { version: "live" } : args.version ? { version: args.version } : {}),
  };
}

/**
 * Fill in what --env resolves from the repo config file: the container for
 * every command, the spec and a rendered workspace name for apply, the
 * container directory for pull. An explicit flag always wins.
 */
export async function withRepoConfig(args: CliArgs): Promise<CliArgs> {
  if (!args.env) return args;
  const config = await loadRepoConfig(args.config);
  const { slug, entry } = resolveEnv(config, args.env);
  const container = args.container ?? entry.publicId;
  const filled: CliArgs = {
    ...args,
    container,
    containers: args.containers.length > 0 ? args.containers : [container],
  };
  if (args.command === "apply") {
    if (!args.plan && !args.spec) filled.spec = entry.spec;
    if (!args.workspace) {
      filled.workspace = renderWorkspace(config.defaults.workspace, {
        slug,
        env: entry.env,
        commit: gitShortSha(dirname(config.path)),
      });
    }
  }
  if (args.command === "pull" && !args.out) filled.out = entry.dir;
  return filled;
}

/** Run a parsed command. Returns the process exit code. */
export async function runCli(
  input: CliArgs,
  client: GtmClient,
  out: (line: string) => void = console.log
): Promise<number> {
  const args = await withRepoConfig(input);
  switch (args.command) {
    case "normalize": {
      if (!args.file) throw new Error(`normalize needs a file argument.\n${USAGE}`);
      out(stringifySpec(normalizeExport(await loadSpecFile(args.file))).trimEnd());
      return 0;
    }
    case "export": {
      if (!args.container) throw new Error(`export needs --container.\n${USAGE}`);
      await client.init();
      const ref = await resolveContainer(client, args.container);
      const api = client.service.accounts.containers;
      let source: unknown;
      if (args.workspace) {
        // Unpublished, un-versioned work in progress: read the workspace's entity lists.
        const wsList = await client.call(() => api.workspaces.list({ parent: ref.path }));
        const ws = (wsList.data.workspace ?? []).find((w) => w.name === args.workspace);
        if (!ws?.path)
          throw new Error(`Workspace "${args.workspace}" not found in ${args.container}`);
        const parent = ws.path;
        const [folder, variable, trigger, tag, builtIn] = await Promise.all([
          client.call(() => api.workspaces.folders.list({ parent })),
          client.call(() => api.workspaces.variables.list({ parent })),
          client.call(() => api.workspaces.triggers.list({ parent })),
          client.call(() => api.workspaces.tags.list({ parent })),
          client.call(() => api.workspaces.built_in_variables.list({ parent })),
        ]);
        source = {
          folder: folder.data.folder ?? [],
          variable: variable.data.variable ?? [],
          trigger: trigger.data.trigger ?? [],
          tag: tag.data.tag ?? [],
          builtInVariable: builtIn.data.builtInVariable ?? [],
        };
      } else if (args.live) {
        const live = await client.call(() => api.versions.live({ parent: ref.path }));
        source = live.data;
      } else {
        // Default: the latest version, published or not. A library container is
        // rarely published, and new workspaces branch from the latest version anyway.
        const header = await client.call(() => api.version_headers.latest({ parent: ref.path }));
        const id = header.data.containerVersionId;
        if (!id) throw new Error(`Container ${args.container} has no versions yet`);
        const version = await client.call(() =>
          api.versions.get({ path: `${ref.path}/versions/${id}` })
        );
        source = version.data;
      }
      out(stringifySpec(normalizeExport(source)).trimEnd());
      return 0;
    }
    case "snapshot": {
      const many = Boolean(args.account) || args.containers.length > 1;
      if (many) {
        if (!args.out) {
          throw new Error(`snapshot of several containers needs --out <dir>.\n${USAGE}`);
        }
        await client.init();
        const snapshots = args.account
          ? await snapshotAccount(client, args.account)
          : await pullSnapshots(
              client,
              args.containers.map((c) => sourceFromArgs(args, c))
            );
        await mkdir(args.out, { recursive: true });
        for (const snapshot of snapshots) {
          const file = join(
            args.out,
            `${snapshot.container.publicId ?? snapshot.source.container}.json`
          );
          await writeFile(file, stringifySnapshot(snapshot));
          out(`Wrote ${file}`);
        }
        return 0;
      }
      if (!args.container) throw new Error(`snapshot needs --container.\n${USAGE}`);
      await client.init();
      const snapshot = await pullSnapshot(client, sourceFromArgs(args, args.container));
      out(stringifySnapshot(snapshot).trimEnd());
      return 0;
    }
    case "pull": {
      if (!args.out) throw new Error(`pull needs --out <dir>.\n${USAGE}`);
      if (!args.account && !args.container) {
        throw new Error(`pull needs --container or --account.\n${USAGE}`);
      }
      await client.init();
      if (args.account) {
        const result = await pullAccount(client, args.account, args.out);
        let failed = result.failures.length;
        for (const o of result.outcomes) {
          out(
            `${o.record.publicId}: wrote ${o.dir}${o.specError ? ` (no spec: ${o.specError})` : ""}`
          );
          if (o.specError) failed++;
        }
        for (const f of result.failures) out(`${f.publicId}: pull failed: ${f.error}`);
        return failed > 0 ? 1 : 0;
      }
      const outcome = await pullContainer(client, sourceFromArgs(args, args.container!), args.out);
      out(`${outcome.record.publicId}: wrote ${outcome.dir}`);
      if (outcome.specError) {
        out(`[!] no spec written: ${outcome.specError}`);
        return 1;
      }
      return 0;
    }
    case "apply": {
      if (args.plan) return applyFromPlan(args, client, out);
      if (!args.container || !args.workspace || !args.spec) {
        throw new Error(`apply needs --container, --workspace and --spec.\n${USAGE}`);
      }
      const spec = normalizeExport(await loadSpecFile(args.spec));
      const issues = validateSpec(spec);
      if (issues.length > 0) {
        out(`Spec ${args.spec} has ${issues.length} problem(s):`);
        for (const issue of issues) out(`[!] ${formatIssue(issue)}`);
        return 1;
      }
      await client.init();
      const plan = await planContainerSpec(
        client,
        { container: args.container, workspace: args.workspace },
        spec,
        { publish: args.publish }
      );
      out(formatPlan(plan));
      if (plan.errors.length > 0) return 1;
      if (args.dryRun) {
        out("Dry run: no changes made.");
        return 0;
      }
      const result = await executePlan(client, plan, {
        publish: args.publish,
        versionName: args.versionName,
      });
      if (result.versionPath) {
        out(`Version: ${result.versionPath}${result.published ? " (published)" : ""}`);
      } else {
        out("No changes: no version created.");
      }
      return 0;
    }
  }
}

async function loadLibrary(path: string): Promise<GtmSnapshot> {
  const loaded = await loadSpecFile(path);
  if (loaded instanceof GtmSnapshot) return loaded;
  const data = loaded as GtmSnapshotData;
  if (!("data" in data) || !("recipes" in data)) {
    throw new Error(
      `${path} is not a library snapshot (expected { data, manifest, encoding, metadata, recipes })`
    );
  }
  return GtmSnapshot.fromData(data);
}

async function applyFromPlan(
  args: CliArgs,
  client: GtmClient,
  out: (line: string) => void
): Promise<number> {
  if (!args.container || !args.workspace || !args.plan || !args.library) {
    throw new Error(`apply with --plan needs --container, --workspace and --library.\n${USAGE}`);
  }
  const library = await loadLibrary(args.library);
  const plan = (await loadSpecFile(args.plan)) as TrackingPlan;
  const compiled = compilePlan(library, plan);
  for (const w of compiled.warnings) out(`[?] ${w}`);
  if (compiled.issues.length > 0) {
    out(`Plan ${args.plan} has ${compiled.issues.length} problem(s):`);
    for (const issue of compiled.issues) out(`[!] ${formatSpecIssue(issue)}`);
    return 1;
  }
  await client.init();
  const outcome = await applyPlan(client, {
    library,
    plan,
    container: args.container,
    workspace: args.workspace,
    dryRun: args.dryRun,
    publish: args.publish,
    versionName: args.versionName,
    writeSpecTo: args.writeSpec,
  });
  out(formatPlan(outcome.plan));
  if (outcome.plan.errors.length > 0) return 1;
  if (args.dryRun) {
    out("Dry run: no changes made.");
    return 0;
  }
  if (outcome.result?.versionPath) {
    out(`Version: ${outcome.result.versionPath}${outcome.result.published ? " (published)" : ""}`);
  } else {
    out("No changes: no version created.");
  }
  return 0;
}
