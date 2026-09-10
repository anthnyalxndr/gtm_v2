#!/usr/bin/env node
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { parseCliArgs, runCli } from "./cli.js";

async function main(): Promise<number> {
  const args = parseCliArgs(process.argv.slice(2));
  return runCli(args, new GtmClient());
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
