import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { resolveContainer } from "@anthnyalxndr/gtm-client";
import { deleteWorkspace } from "./resources/workspaces.js";
import { loadSpecFile } from "./spec/load.js";
import { normalizeExport } from "./spec/normalize.js";
import { formatIssue, validateSpec } from "./spec/validate.js";
import { executePlan, type ApplyResult } from "./spec/execute.js";
import { formatPlan, planContainerSpec, wantsVersion, type PlanOptions } from "./spec/plan.js";
import { pullSnapshot } from "./snapshot/pull.js";
import { GtmSnapshot, type GtmSnapshotData } from "./library/gtm-snapshot.js";
import { applyPlan, compilePlan, type TrackingPlan } from "./plan/tracking-plan.js";
import { formatIssue as formatSpecIssue } from "./spec/validate.js";

export type CliCommand = "apply" | "normalize" | "export" | "snapshot" | "delete-workspace";

export interface CliArgs {
  command: CliCommand;
  container?: string;
  workspace?: string;
  spec?: string;
  file?: string;
  dryRun: boolean;
  publish: boolean;
  live: boolean;
  /** apply --version: create a version from the workspace. --publish implies it. */
  createVersion: boolean;
  versionName?: string;
  versionDescription?: string;
  /** Shell command to run after a successful publish; its exit code becomes the result. */
  verify?: string;
  /** snapshot --version <id>. */
  version?: string;
  plan?: string;
  library?: string;
  writeSpec?: string;
}

export const USAGE = `Usage:
  gtm-apply apply --container GTM-XXXXXXX --workspace <name> --spec <file> [--dry-run] [--version | --publish [--verify <command>]] [--version-name <name>] [--version-description <text>]
      (apply writes the workspace and leaves it there for review; --version creates a version from it,
       --publish creates and publishes one; --version-name and --version-description imply --version)
      (--verify runs <command> after a successful publish and exits with its code)
      (<file> is .json, or a .js/.mjs/.ts module whose default export is the spec)
  gtm-apply apply --container GTM-XXXXXXX --workspace <name> --plan <plan.ts> --library <library.json|module> [--write-spec <file>] [...]
      (compile a tracking plan against a library, then apply it)
  gtm-apply normalize <export.json>
  gtm-apply export --container GTM-XXXXXXX [--live | --workspace <name>]
      (default: the latest version, published or not)
  gtm-apply snapshot --container GTM-XXXXXXX [--live | --version <id> | --workspace <name>]
      (everything the API exposes for the container, as returned by the API)
  gtm-apply delete-workspace --container GTM-XXXXXXX --workspace <name>
      (delete a review workspace, e.g. when its pull request closes; refuses the Default Workspace)`;

const OPTIONS = {
  container: { type: "string" },
  workspace: { type: "string" },
  spec: { type: "string" },
  "dry-run": { type: "boolean", default: false },
  publish: { type: "boolean", default: false },
  live: { type: "boolean", default: false },
  "version-name": { type: "string" },
  "version-description": { type: "string" },
  // Removed in favor of the default; kept so the error can say what replaced it.
  "no-version": { type: "boolean", default: false },
  verify: { type: "string" },
  plan: { type: "string" },
  library: { type: "string" },
  "write-spec": { type: "string" },
} as const;

/**
 * The command decides how --version reads: a flag for apply (create a version), a
 * version id for snapshot. A lenient first pass finds the command either way.
 */
function commandOf(argv: readonly string[]): string {
  const { positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: false,
    options: { ...OPTIONS, version: { type: "string" } },
  });
  return positionals[0];
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const command = commandOf(argv);
  if (!["apply", "normalize", "export", "snapshot", "delete-workspace"].includes(command)) {
    throw new Error(USAGE);
  }
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      ...OPTIONS,
      version: command === "apply" ? { type: "boolean", default: false } : { type: "string" },
    },
  });
  if (values["no-version"]) {
    throw new Error(
      `--no-version was removed: apply leaves the workspace in place by default. Add --version to create a version.\n${USAGE}`
    );
  }
  return {
    command: command as CliCommand,
    container: values.container,
    workspace: values.workspace,
    spec: values.spec,
    file: positionals[1],
    dryRun: values["dry-run"] ?? false,
    publish: values.publish ?? false,
    live: values.live ?? false,
    createVersion: typeof values.version === "boolean" ? values.version : false,
    versionName: values["version-name"],
    versionDescription: values["version-description"],
    verify: values.verify,
    version: typeof values.version === "string" ? values.version : undefined,
    plan: values.plan,
    library: values.library,
    writeSpec: values["write-spec"],
  };
}

/** The engine's version and publish options for an apply run. */
function applyOptions(args: CliArgs): PlanOptions {
  const named = args.versionName !== undefined || args.versionDescription !== undefined;
  return {
    version:
      args.createVersion || named
        ? { name: args.versionName, notes: args.versionDescription }
        : false,
    publish: args.publish,
  };
}

/** What an apply run did with the workspace and the version, after the plan. */
function reportApply(
  args: CliArgs,
  options: PlanOptions,
  result: ApplyResult,
  out: (line: string) => void
): void {
  for (const w of result.warnings) out(`[?] ${w}`);
  if (result.versionPath) {
    out(`Version: ${result.versionPath}${result.published ? " (published)" : ""}`);
    return;
  }
  out(`Workspace "${args.workspace}": ${result.workspaceUrl}`);
  out(
    wantsVersion(options)
      ? "No changes to version; the workspace matches the latest version."
      : "No version created. Add --version to create one, or --publish to create and publish it."
  );
}

/** Run a parsed command. Returns the process exit code. */
/** Run a command through the shell, inheriting stdio, and resolve to its exit code. */
export function runShellCommand(command: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

/** After a successful publish, run --verify and pass its exit code on. */
async function verifyAfterPublish(
  args: CliArgs,
  published: boolean,
  out: (line: string) => void,
  runCommand: (command: string) => Promise<number>
): Promise<number> {
  if (!args.verify || !published) return 0;
  const code = await runCommand(args.verify);
  out(`Verify: ${args.verify} exited with ${code}`);
  return code;
}

export async function runCli(
  args: CliArgs,
  client: GtmClient,
  out: (line: string) => void = console.log,
  runCommand: (command: string) => Promise<number> = runShellCommand
): Promise<number> {
  if (args.verify && !args.publish) {
    throw new Error(`--verify needs --publish: it runs after a successful publish.\n${USAGE}`);
  }
  switch (args.command) {
    case "normalize": {
      if (!args.file) throw new Error(`normalize needs a file argument.\n${USAGE}`);
      out(JSON.stringify(normalizeExport(await loadSpecFile(args.file)), null, 2));
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
      // Custom environments are container level, so every source gets the same list;
      // normalize keeps only custom ones and drops ids and authorization codes.
      const envs = await client.call(() => api.environments.list({ parent: ref.path }));
      source = { ...(source as object), environment: envs.data.environment ?? [] };
      out(JSON.stringify(normalizeExport(source), null, 2));
      return 0;
    }
    case "snapshot": {
      if (!args.container) throw new Error(`snapshot needs --container.\n${USAGE}`);
      await client.init();
      const snapshot = await pullSnapshot(client, {
        container: args.container,
        ...(args.workspace ? { workspace: args.workspace } : {}),
        ...(args.live ? { version: "live" } : args.version ? { version: args.version } : {}),
      });
      out(JSON.stringify(snapshot, null, 2));
      return 0;
    }
    case "delete-workspace": {
      if (!args.container || !args.workspace) {
        throw new Error(`delete-workspace needs --container and --workspace.\n${USAGE}`);
      }
      await client.init();
      const container = await resolveContainer(client, args.container);
      const deleted = await deleteWorkspace(client, container.path, args.workspace);
      out(
        deleted
          ? `Deleted workspace "${args.workspace}".`
          : `No workspace named "${args.workspace}"; nothing to delete.`
      );
      return 0;
    }
    case "apply": {
      if (args.plan) return applyFromPlan(args, client, out, runCommand);
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
      const options = applyOptions(args);
      const plan = await planContainerSpec(
        client,
        { container: args.container, workspace: args.workspace },
        spec,
        options
      );
      out(formatPlan(plan));
      if (plan.errors.length > 0) return 1;
      if (args.dryRun) {
        out("Dry run: no changes made.");
        return 0;
      }
      const result = await executePlan(client, plan, options);
      reportApply(args, options, result, out);
      return verifyAfterPublish(args, result.published, out, runCommand);
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
  out: (line: string) => void,
  runCommand: (command: string) => Promise<number>
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
  const options = applyOptions(args);
  const outcome = await applyPlan(client, {
    library,
    plan,
    container: args.container,
    workspace: args.workspace,
    dryRun: args.dryRun,
    ...options,
    writeSpecTo: args.writeSpec,
  });
  out(formatPlan(outcome.plan));
  if (outcome.plan.errors.length > 0) return 1;
  if (args.dryRun || !outcome.result) {
    out("Dry run: no changes made.");
    return 0;
  }
  reportApply(args, options, outcome.result, out);
  return verifyAfterPublish(args, outcome.result.published, out, runCommand);
}
