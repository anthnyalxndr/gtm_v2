# @anthnyalxndr/gtm-web-recipes

A recipe library for Google Tag Manager web containers, built on [`@anthnyalxndr/gtm-apply`](../gtm-apply). The library is the Web Template container (`GTM-TPLKC7QP`), pulled into `src/library.ts` as a `const` TypeScript module, so every recipe and constant name is a literal type in a customer's tracking plan.

```ts
import { applyPlan, defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "@anthnyalxndr/gtm-web-recipes";

const plan = defineTrackingPlan(library, {
  recipes: ["google_tag", "contact_form_submit", "call_click"],
  destinations: ["googleTag", "ga4", "googleAds"],
  constants: { "Const - GA4 Measurement ID": "G-XXXXXXXXXX", /* … */ },
});
await applyPlan(client, { library, plan, container: "GTM-XXXXXXX", workspace: "onboarding" });
```

See [`plan.example.ts`](plan.example.ts) for a complete plan.

## The recipes

The set is what recurs across lead-generation client work: a site that wants a form submission, a phone call, an email and a directions request counted in GA4 and in Google Ads. Each conversion recipe is one trigger, a `GA4 - <recipe>` event tag and an `Ads - <recipe>` conversion tag.

| Recipe | Trigger | Constants it needs |
|---|---|---|
| `google_tag` | `Initialization - All Pages` (built-in) | `Const - GA4 Measurement ID` |
| `contact_form_submit` | `Custom Event - contact_form_submit`, a dataLayer event the site pushes with `form_id`, `form_name`, `form_destination`, `form_submit_text` | measurement id, `Const - Google Ads Conversion ID`, `Const - Google Ads - contact_form_submit Conversion Label` |
| `call_click` | `Click - call`: Click URL contains `tel:` | measurement id, conversion id, its label |
| `email_click` | `Click - email`: Click URL contains `mailto:` | measurement id, conversion id, its label |
| `maps_click` | `Click - maps`: Click URL is a Google Maps link | measurement id, conversion id, its label |

Every recipe assumes `google_tag`. There is no Conversion Linker tag: a Google tag on every page sets the same click cookies ([Conversion linker help](https://support.google.com/tagmanager/answer/7549390)); the Google tag's notes say so. The Google Ads conversion id is the bare number, not `AW-…`, because that is how GTM stores it; a plan value with the prefix fails the recipe's dependency check.

Form submissions come from a dataLayer event the site emits on success, never from GTM's Form Submission trigger or GA4's enhanced measurement, which miss AJAX forms and count failed validation. The site-side listener is platform-specific (Squarespace, Wix, HubSpot) and lives with the site, not in this container.

## How recipes are declared

In the template container, each tag that belongs to a recipe carries a `recipes` key in its Additional Tag Metadata. Everything a recipe needs beyond its tags, triggers, variables and built-ins, is found by following references. Customer-specific values are `Const - …` variables whose library value is a placeholder such as `<G-XXXXXXXXXX>`; a plan must supply them. A `Library - Manifest` constant in the container names the encoding, describes recipes, and lists each recipe's Google Ads conversion action, conversion tracking id and GA4 key event dependencies.

## Changing the library

The source of truth is [`scripts/template.ts`](scripts/template.ts), a `ContainerSpec`. Change it there, then:

```bash
pnpm push --dry-run   # plan against the template container
pnpm push             # new workspace and version on GTM-TPLKC7QP; nothing is published
pnpm pull             # write src/library.ts from the container
```

`pnpm push` lints the template first and refuses on findings. `pnpm pull` lints the container the same way. Commit the regenerated `src/library.ts`; a package version pins a library snapshot. `pnpm sample` regenerates `src/library.ts` from the template through an in-memory container, for work without credentials.

```bash
GTM_LIBRARY_WORKSPACE=wip pnpm pull    # work in progress instead of the latest version
```
