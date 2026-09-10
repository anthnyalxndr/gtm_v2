import { GtmClient, applyConversions, formatPlan } from "./src/index.js";

// Dry run by default. Set GTM_CONTAINER to a container you own and flip
// dryRun to false to write a workspace and version (nothing is published).
const client = new GtmClient();
await client.init();

const { plan, result } = await applyConversions(client, {
  container: process.env.GTM_CONTAINER ?? "GTM-XXXXXXX",
  workspace: "gtm-apply-example",
  conversions: [
    {
      kind: "ga4-event",
      name: "GA4 - generate_lead",
      event: "generate_lead",
      measurementId: process.env.GA4_MEASUREMENT_ID ?? "G-XXXXXXX",
      trigger: { type: "customEvent", eventName: "lead" },
    },
  ],
  dryRun: true,
});

console.log(formatPlan(plan));
if (result) console.log(`Version: ${result.versionPath}`);
