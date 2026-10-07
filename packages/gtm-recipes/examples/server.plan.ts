// A customer's tracking plan against the server library: the GA4 client and
// two conversion recipes. Pair it with a web plan that selects
// google_tag_server and leaves the googleAds destination out.
//
//   gtm-apply apply --container GTM-XXXXXXX --workspace onboarding --plan examples/server.plan.ts --library src/server/index.ts --dry-run
import { defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "../src/server/index.js";

export default defineTrackingPlan(library, {
  recipes: ["ga4_client", "contact_form_submit", "call_click"],
  constants: {
    "Const - Google Ads Conversion ID": "123456789",
    "Const - Google Ads - contact_form_submit Conversion Label": "AbCdEfGhIj",
    "Const - Google Ads - call_click Conversion Label": "KlMnOpQrSt",
  },
});
