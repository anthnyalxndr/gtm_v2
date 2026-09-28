/**
 * Regenerate a library module from its in-code template through the
 * gtm-client fake, so the package works before a real pull.
 *
 *   pnpm sample web
 */
import { LIBRARIES, libraryFromArgv } from "./libraries.js";
import { writeLibrary } from "./write-library.js";

const { template, libraryPath } = LIBRARIES[libraryFromArgv(process.argv.slice(2))];
const library = await template();
library.data.pulledAt = "1970-01-01T00:00:00.000Z";
await writeLibrary(library, libraryPath);
