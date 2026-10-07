/**
 * Pull a template container into its committed library module.
 *
 *   pnpm pull web                              # latest version of the web template (GTM-TPLKC7QP)
 *   GTM_LIBRARY_WORKSPACE=wip pnpm pull web    # work in progress instead
 *   GTM_LIBRARY=GTM-XXXXXXX pnpm pull web      # another template container
 */
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { GtmSnapshot } from "@anthnyalxndr/gtm-apply";
import { LIBRARIES, libraryFromArgv } from "./libraries.js";
import { writeLibrary } from "./write-library.js";

const { publicId, libraryPath } = LIBRARIES[libraryFromArgv(process.argv.slice(2))];
const container = process.env.GTM_LIBRARY ?? publicId;
const workspace = process.env.GTM_LIBRARY_WORKSPACE;

const client = new GtmClient();
await client.init();
const library = await new GtmSnapshot(client, {
  container,
  ...(workspace ? { workspace } : {}),
}).init();
await writeLibrary(library, libraryPath);
