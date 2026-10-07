/**
 * Push a library's in-code template to its template container as a version.
 * Nothing is published.
 *
 *   pnpm push web --dry-run                                  # plan only
 *   pnpm push web                                            # new workspace and version recipes-<date>
 *   GTM_LIBRARY_WORKSPACE="owner-edits" pnpm push web        # into an existing named workspace,
 *                                                            # keeping its unversioned edits
 *   GTM_LIBRARY_VERSION=my-version pnpm push web             # name the version
 *   GTM_LIBRARY_VERSION_DESCRIPTION="Adds …" pnpm push web  # describe the version
 *   GTM_LIBRARY=GTM-XXXXXXX pnpm push web                    # another template container
 *
 * A new workspace branches from the latest version, so edits sitting in a
 * workspace without a version are only kept by pushing into that workspace.
 */
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { formatIssue, formatPlan } from "@anthnyalxndr/gtm-apply";
import { LIBRARIES, libraryFromArgv } from "./libraries.js";
import { pushSettings } from "./push-settings.js";

const type = libraryFromArgv(process.argv.slice(2));
const { container, workspace, versionName, versionDescription, dryRun } = pushSettings(
  type,
  process.env,
  process.argv
);
// Tag Manager allows 30 write requests per user per minute; one every 2.5s
// keeps a full push (roughly twenty entities) safely inside the window.
const minIntervalMs = Number(process.env.GTM_MIN_INTERVAL_MS ?? 2500);

const library = await LIBRARIES[type].template();
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
  { dryRun, version: { name: versionName, notes: versionDescription } }
);
console.log(formatPlan(outcome.plan));
if (outcome.plan.errors.length > 0) process.exit(1);
if (dryRun) console.log("Dry run; nothing written.");
else
  console.log(
    `Pushed to ${container}: workspace "${workspace}", version "${versionName}" ${outcome.result?.versionPath ?? "(none)"}, published: ${outcome.result?.published ?? false}`
  );
