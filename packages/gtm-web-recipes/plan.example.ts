// A customer's tracking plan against this library. Recipe and constant names
// are literal types from src/library.ts, so a typo is a compile error.
//
//   gtm-apply apply --container GTM-XXXXXXX --workspace onboarding --plan plan.example.ts --library src/index.ts --dry-run
import { defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "./src/index.js";

export default defineTrackingPlan(library, {
  recipes: ["google_tag", "contact_form_submit", "call_click"],
  destinations: ["googleTag", "ga4", "googleAds"],
  constants: {
    "Const - GA4 Measurement ID": "G-ABC1234567",
    "Const - Google Ads Conversion ID": "123456789",
    "Const - Google Ads - contact_form_submit Conversion Label": "AbCdEfGhIj",
    "Const - Google Ads - call_click Conversion Label": "KlMnOpQrSt",
  },
});
