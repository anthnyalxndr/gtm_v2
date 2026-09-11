// A customer's tracking plan against this library. Recipe and constant names
// are literal types from src/library.ts, so a typo is a compile error.
//
//   gtm-apply apply --container GTM-XXXXXXX --workspace onboarding --plan plan.example.ts --library src/index.ts --dry-run
import { defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "./src/index.js";

export default defineTrackingPlan(library, {
  recipes: ["form_submit", "call_click"],
  destinations: ["ga4", "googleAds"],
  constants: {
    "Const - GA4 Measurement ID": "G-XXXXXXX",
    "Const - Ads Conversion ID": "AW-123456789",
    "Const - Ads Label - form_submit": "AbCdEfGhIj",
    "Const - Ads Label - call_click": "KlMnOpQrSt",
  },
});
