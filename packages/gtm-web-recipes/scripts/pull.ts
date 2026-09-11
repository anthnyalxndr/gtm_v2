/**
 * Pull the Web Template container into src/library.ts.
 *
 *   pnpm pull                          # latest version of GTM_LIBRARY (default GTM-TPLKC7QP)
 *   GTM_LIBRARY_WORKSPACE=wip pnpm pull  # work in progress instead
 */
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { GtmSnapshot } from "@anthnyalxndr/gtm-apply";
import { writeLibrary } from "./write-library.js";

const container = process.env.GTM_LIBRARY ?? "GTM-TPLKC7QP";
const workspace = process.env.GTM_LIBRARY_WORKSPACE;

const client = new GtmClient();
await client.init();
const library = await new GtmSnapshot(client, {
  container,
  ...(workspace ? { workspace } : {}),
}).init();
await writeLibrary(library);
