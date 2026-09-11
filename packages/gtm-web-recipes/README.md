# @anthnyalxndr/gtm-web-recipes

A recipe library for Google Tag Manager web containers, built on [`@anthnyalxndr/gtm-apply`](../gtm-apply). The library is the Web Template container (`GTM-TPLKC7QP`), edited in the GTM UI and pulled into `src/library.ts` as a `const` TypeScript module, so every recipe and constant name is a literal type in a customer's tracking plan.

```ts
import { applyPlan, defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "@anthnyalxndr/gtm-web-recipes";

const plan = defineTrackingPlan(library, {
  recipes: ["form_submit", "call_click"],
  constants: { "Const - GA4 Measurement ID": "G-XXXXXXX", /* … */ },
});
await applyPlan(client, { library, plan, container: "GTM-XXXXXXX", workspace: "onboarding" });
```

See [`plan.example.ts`](plan.example.ts) for a complete plan.

## How recipes are declared

In the template container, each tag that belongs to a recipe carries a `recipes` key in its Additional Tag Metadata (`form_submit, call_click`). Everything a recipe needs beyond its tags, triggers, variables, setup tags and folders, is found by following references. Customer-specific values are `Const - …` variables whose library value is a placeholder such as `<G-XXXXXXX>`; a plan must supply them. A `Library - Manifest` constant in the container names the encoding, describes recipes, and lists each recipe's Google Ads or GA4 dependencies.

## Refreshing the library

```bash
pnpm pull                              # latest version of the template container
GTM_LIBRARY_WORKSPACE=wip pnpm pull    # work in progress
```

The pull lints the container first (recipe names not in the manifest, recipes that reach no trigger, naming rules) and refuses to write on findings. Commit the regenerated `src/library.ts`; a package version pins a library snapshot.

Until the first real pull, `src/library.ts` holds a sample built by `pnpm sample` from an in-code template with three recipes: `form_submit`, `email_click`, `call_click`.
