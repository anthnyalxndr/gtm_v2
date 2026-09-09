import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import type { GtmClient } from "./gtm_v2.js";
import { resolveContainer } from "./resources/containers.js";
import { normalizeExport } from "./spec/normalize.js";
import { executePlan } from "./spec/execute.js";
import { formatPlan, planContainerSpec } from "./spec/plan.js";

export type CliCommand = "apply" | "normalize" | "export";

export interface CliArgs {
  command: CliCommand;
  container?: string;
  workspace?: string;
  spec?: string;
  file?: string;
  dryRun: boolean;
  publish: boolean;
  versionName?: string;
}

export const USAGE = `Usage:
  gtm-sdk apply --container GTM-XXXXXXX --workspace <name> --spec <file.json> [--dry-run] [--publish] [--version-name <name>]
  gtm-sdk normalize <export.json>
  gtm-sdk export --container GTM-XXXXXXX`;

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
      "version-name": { type: "string" },
    },
  });
  const command = positionals[0];
  if (command !== "apply" && command !== "normalize" && command !== "export") {
    throw new Error(USAGE);
  }
  return {
    command,
    container: values.container,
    workspace: values.workspace,
    spec: values.spec,
    file: positionals[1],
    dryRun: values["dry-run"] ?? false,
    publish: values.publish ?? false,
    versionName: values["version-name"],
  };
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf-8")) as unknown;
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
      out(JSON.stringify(normalizeExport(await readJson(args.file)), null, 2));
      return 0;
    }
    case "export": {
      if (!args.container) throw new Error(`export needs --container.\n${USAGE}`);
      await client.init();
      const ref = await resolveContainer(client, args.container);
      const live = await client.call(() =>
        client.service.accounts.containers.versions.live({ parent: ref.path })
      );
      out(JSON.stringify(normalizeExport(live.data), null, 2));
      return 0;
    }
    case "apply": {
      if (!args.container || !args.workspace || !args.spec) {
        throw new Error(`apply needs --container, --workspace and --spec.\n${USAGE}`);
      }
      const spec = normalizeExport(await readJson(args.spec));
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
      out(`Version: ${result.versionPath}${result.published ? " (published)" : ""}`);
      return 0;
    }
  }
}
