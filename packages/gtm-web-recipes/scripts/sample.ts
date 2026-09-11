/**
 * Regenerate src/library.ts from the in-code template through the gtm-client
 * fake, so the package works before a real pull.
 *
 *   pnpm sample
 */
import { templateSnapshot } from "./template.js";
import { writeLibrary } from "./write-library.js";

const library = await templateSnapshot();
library.data.pulledAt = "1970-01-01T00:00:00.000Z";
await writeLibrary(library);
