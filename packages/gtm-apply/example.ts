import { Gtm, formatPlan } from "./src/index.js";

// Dry run by default. Set GTM_LIBRARY to the template container that holds
// your recipes and GTM_CONTAINER to a container you own, then flip dryRun to
// false to write a workspace and version (nothing is published).
const gtm = await Gtm.fromConfig().init();

const library = await gtm.snapshot({ container: process.env.GTM_LIBRARY ?? "GTM-TPLXXXX" });
console.log(`Library recipes: ${library.recipeNames.join(", ")}`);

const { plan, result, warnings } = await gtm.applyPlan({
  library,
  plan: {
    recipes: library.recipeNames.slice(0, 1),
    constants: { "Const - GA4 Measurement ID": process.env.GA4_MEASUREMENT_ID ?? "G-XXXXXXX" },
  },
  container: process.env.GTM_CONTAINER ?? "GTM-XXXXXXX",
  workspace: "gtm-apply-example",
  dryRun: true,
});

for (const w of warnings) console.log(`warning: ${w}`);
console.log(formatPlan(plan));
if (result) console.log(`Version: ${result.versionPath}`);
