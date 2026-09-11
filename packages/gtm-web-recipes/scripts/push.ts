/**
 * Push the in-code template to the Web Template container as a new workspace
 * and version. Nothing is published.
 *
 *   pnpm push --dry-run                       # plan only
 *   pnpm push                                 # GTM_LIBRARY (default GTM-TPLKC7QP)
 *   GTM_LIBRARY_WORKSPACE=recipes pnpm push   # workspace and version name
 */
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { formatIssue, formatPlan } from "@anthnyalxndr/gtm-apply";
import { templateSnapshot } from "./template.js";

const container = process.env.GTM_LIBRARY ?? "GTM-TPLKC7QP";
const workspace =
  process.env.GTM_LIBRARY_WORKSPACE ?? `recipes-${new Date().toISOString().slice(0, 10)}`;
const dryRun = process.argv.includes("--dry-run");
// Tag Manager allows 30 write requests per user per minute; one every 2.5s
// keeps a full push (roughly twenty entities) safely inside the window.
const minIntervalMs = Number(process.env.GTM_MIN_INTERVAL_MS ?? 2500);

const library = await templateSnapshot();
const issues = library.lint();
if (issues.length > 0) {
  console.error(`Template has ${issues.length} problem(s):`);
  for (const issue of issues) console.error(`[!] ${formatIssue(issue)}`);
  process.exit(1);
}

const client = new GtmClient({ minIntervalMs });
await client.init();
const outcome = await library.push(
  client,
  { container, workspace },
  { dryRun, versionName: workspace }
);
console.log(formatPlan(outcome.plan));
if (outcome.plan.errors.length > 0) process.exit(1);
if (dryRun) console.log("Dry run; nothing written.");
else
  console.log(
    `Pushed to ${container}: workspace "${workspace}", version ${outcome.result?.versionPath ?? "(none)"}, published: ${outcome.result?.published ?? false}`
  );
