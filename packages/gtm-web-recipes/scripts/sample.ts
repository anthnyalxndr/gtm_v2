/**
 * Regenerate src/library.ts from the in-code sample template through the
 * gtm-client fake, so the package works before the first real pull.
 *
 *   pnpm sample
 */
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService } from "@anthnyalxndr/gtm-client/testing";
import { applySpec, GtmSnapshot } from "@anthnyalxndr/gtm-apply";
import { sampleTemplate } from "./sample-template.js";
import { writeLibrary } from "./write-library.js";

const { service } = createFakeService({
  containers: [
    { accountId: "1", containerId: "10", publicId: "GTM-SAMPLE", name: "Web Template (sample)" },
  ],
});
const client = new GtmClient({ service, minIntervalMs: 0 });
await applySpec(client, { container: "GTM-SAMPLE", workspace: "sample", spec: sampleTemplate });
const library = await new GtmSnapshot(client, { container: "GTM-SAMPLE" }).init();
library.pulledAt = "1970-01-01T00:00:00.000Z";
await writeLibrary(library);
