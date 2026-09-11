import { parseArgs } from "node:util";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { resolveContainer } from "@anthnyalxndr/gtm-client";
import { loadSpecFile } from "./spec/load.js";
import { normalizeExport } from "./spec/normalize.js";
import { formatIssue, validateSpec } from "./spec/validate.js";
import { executePlan, writePlanReport } from "./spec/execute.js";
import { formatPlan, planContainerSpec } from "./spec/plan.js";
import { pullSnapshot } from "./snapshot/pull.js";
import { GtmSnapshot, type GtmSnapshotData } from "./library/gtm-snapshot.js";
import { applyPlan, compilePlan, type TrackingPlan } from "./plan/tracking-plan.js";
import { formatIssue as formatSpecIssue } from "./spec/validate.js";

export type CliCommand = "apply" | "normalize" | "export" | "snapshot";

export interface CliArgs {
  report?: string;
  command: CliCommand;
  container?: string;
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
  gtm-apply apply --container GTM-XXXXXXX --workspace <name> --spec <file> [--dry-run] [--publish] [--version-name <name>] [--report <file.md|file.html>]
      (<file> is .json, or a .js/.mjs/.ts module whose default export is the spec)
  gtm-apply apply --container GTM-XXXXXXX --workspace <name> --plan <plan.ts> --library <library.json|module> [--write-spec <file>] [...]
      (compile a tracking plan against a library, then apply it)
  gtm-apply normalize <export.json>
  gtm-apply export --container GTM-XXXXXXX [--live | --workspace <name>]
      (default: the latest version, published or not)
  gtm-apply snapshot --container GTM-XXXXXXX [--live | --version <id> | --workspace <name>]
      (everything the API exposes for the container, as returned by the API)`;

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      container: { type: "string" },
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
      report: { type: "string" },
    },
  });
  const command = positionals[0];
  if (!["apply", "normalize", "export", "snapshot"].includes(command)) {
    throw new Error(USAGE);
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
    versionName: values["version-name"],
    version: values.version,
    plan: values.plan,
    library: values.library,
    writeSpec: values["write-spec"],
    report: values.report,
  };
}

/** Run a parsed command. Returns the process exit code. */
export async function runCli(
  args: CliArgs,
  client: GtmClient,
  out: (line: string) => void = console.log
): Promise<number> {
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
      if (args.report) await writePlanReport(plan, args.report);
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
    reportTo: args.report,
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
