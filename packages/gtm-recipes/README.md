# @anthnyalxndr/gtm-recipes

Recipe libraries for Google Tag Manager, built on [`@anthnyalxndr/gtm-apply`](../gtm-apply), one per container type. Each library is a template container pulled into a `const` TypeScript module, so every recipe and constant name is a literal type in a customer's tracking plan.

| Container type | Template container | Module | Import |
|---|---|---|---|
| web | Template - Web (`GTM-TPLKC7QP`) | `src/web/library.ts` | `@anthnyalxndr/gtm-recipes/web`, or `recipes.web` from the root |
| server | Template - Server (`GTM-WMGVDZ5H`) | `src/server/library.ts` | `@anthnyalxndr/gtm-recipes/server`, or `recipes.server` from the root |

## The web library

```ts
import { applyPlan, defineTrackingPlan } from "@anthnyalxndr/gtm-apply";
import { library } from "@anthnyalxndr/gtm-recipes/web";

const plan = defineTrackingPlan(library, {
  recipes: ["google_tag", "contact_form_submit", "call_click"],
  destinations: ["googleTag", "ga4", "googleAds"],
  constants: { "Const - GA4 Measurement ID": "G-XXXXXXXXXX", /* … */ },
});
await applyPlan(client, { library, plan, container: "GTM-XXXXXXX", workspace: "onboarding" });
```

See [`examples/web.plan.ts`](examples/web.plan.ts) for a complete plan.

### The recipes

The set is what recurs across lead-generation client work: a site that wants a form submission, a phone call, an email and a directions request counted in GA4 and in Google Ads. Each conversion recipe is one trigger, a `GA4 - <recipe>` event tag and an `Ads - <recipe>` conversion tag.

| Recipe | Trigger | Constants it needs |
|---|---|---|
| `google_tag` | `Initialization - All Pages` (built-in) | `Const - GA4 Measurement ID` |
| `google_tag_server` | `Initialization - All Pages` (built-in); `Google Tag - Server` sets `server_container_url` so hits go to the customer's tagging server. Use instead of `google_tag`. | measurement id, `Const - Server Container URL` |
| `contact_form_submit` | `Custom Event - contact_form_submit`, a dataLayer event the site pushes with `form_id`, `form_name`, `form_destination`, `form_submit_text` | measurement id, `Const - Google Ads Conversion ID`, `Const - Google Ads - contact_form_submit Conversion Label` |
| `call_click` | `Click - call`: Click URL contains `tel:` | measurement id, conversion id, its label |
| `email_click` | `Click - email`: Click URL contains `mailto:` | measurement id, conversion id, its label |
| `maps_click` | `Click - maps`: Click URL is a Google Maps link | measurement id, conversion id, its label |

Every recipe assumes `google_tag` or `google_tag_server`. There is no Conversion Linker tag: a Google tag on every page sets the same click cookies ([Conversion linker help](https://support.google.com/tagmanager/answer/7549390)); the Google tag's notes say so. The Google Ads conversion id is the bare number, not `AW-…`, because that is how GTM stores it; a plan value with the prefix fails the recipe's dependency check.

Form submissions come from a dataLayer event the site emits on success, never from GTM's Form Submission trigger or GA4's enhanced measurement, which miss AJAX forms and count failed validation. The site-side listener is platform-specific (Squarespace, Wix, HubSpot) and lives with the site, not in this container.

### How recipes are declared

In the template container, library metadata lives in entity notes. The text above a line that is exactly `---` is the note the customer receives; the JSON object below it is the library's, and never reaches a customer container. A tag that belongs to a recipe declares it there:

```
Sends the call_click event to GA4.
---
{"recipes": ["call_click"]}
```

Everything a recipe needs beyond its tags, triggers, variables and built-ins, is found by following references. Customer-specific values are `Const - …` variables whose library value is a placeholder such as `<G-XXXXXXXXXX>` and whose notes carry a `placeholder` entry (`kind`, `example`, `pattern`); a plan must supply them, and compilePlan checks a supplied value against the entry's pattern. This is where the bare Google Ads conversion id is documented (`kind: adsConversionId`, no `AW-` prefix, `pattern: ^[0-9]+$`), rather than repeated in the manifest. A `Library - Manifest` constant in the container describes recipes and lists each recipe's Google Ads conversion action dependency. The pulled `src/web/library.ts` carries every parsed trailer in its `metadata` field, keyed by `kind:name`.

## The server library

The server library is the server-side half of the same lead-gen recipes, for a customer who runs a tagging server. See [`examples/server.plan.ts`](examples/server.plan.ts).

| Recipe | What it adds | Constants it needs |
|---|---|---|
| `ga4_client` | The `GA4` client, `GA4 - All Events` (a GA4 tag forwarding every event the client claims) on `Client - GA4`, and the `Conversion Linker` on the server's built-in `All Pages` | none |
| `contact_form_submit`, `call_click`, `email_click`, `maps_click` | `Custom Event - <recipe>` (the event name, claimed by the GA4 client) and `Ads - <recipe>`, a server Google Ads conversion tag | `Const - Google Ads Conversion ID`, the recipe's `Const - Google Ads - <recipe> Conversion Label` |
| `web_container_client` | The `GTM` client, serving the web container's `gtm.js` from the tagging server's domain | `Const - Web Container ID` |

`GA4 - All Events` keeps its fields at their defaults, so it inherits the measurement id and parameters from each event ([Google's server-side tagging guide](https://developers.google.com/tag-platform/learn/sst-fundamentals/5-sst-setup-analytics)). There is no per-recipe GA4 tag on the server; one would count each event twice.

### How the web and server libraries fit together

A customer with server tagging applies two plans. The web plan selects `google_tag_server` instead of `google_tag`, plus the conversion recipes, and leaves `googleAds` out of `destinations`. The server plan selects `ga4_client` and the same conversion recipes.

One conversion then flows like this. The site pushes `contact_form_submit`, and the web trigger `Custom Event - contact_form_submit` fires `GA4 - contact_form_submit`. `Google Tag - Server` carries `server_container_url`, so the GA4 hit goes to the tagging server. The server's `GA4` client claims it, which sets Client Name to `GA4` and Event Name to `contact_form_submit`. `Client - GA4` fires `GA4 - All Events`, which forwards the event to GA4, and `Custom Event - contact_form_submit` fires `Ads - contact_form_submit`. The web `Ads - contact_form_submit` tag is never installed, so the conversion counts once.

`google_tag_server` declares a conflict with `google_tag` in the manifest, so `compilePlan` reports a plan that selects both.

## Changing the library

Each library's source of truth is its in-code template, a `ContainerSpec`: [`scripts/web/template.ts`](scripts/web/template.ts) for web, [`scripts/server/template.ts`](scripts/server/template.ts) for server. [`scripts/libraries.ts`](scripts/libraries.ts) maps each container type to its template container, module path and template. Change the template, then:

```bash
pnpm push web --dry-run   # plan against the template container
pnpm push web             # new workspace and version recipes-<date> on GTM-TPLKC7QP; nothing is published
pnpm pull web             # write src/web/library.ts from the container
```

`pnpm push <type>` reads three settings: `GTM_LIBRARY` (the template container, default the type's, `GTM-TPLKC7QP` for web), `GTM_LIBRARY_WORKSPACE` (the workspace to push into, default `recipes-<date>`) and `GTM_LIBRARY_VERSION` (the version name, default `recipes-<date>` whatever the workspace is called). `GTM_LIBRARY_VERSION_DESCRIPTION` sets the description Tag Manager shows with the version; without it the version has none.

A new workspace starts from the container's latest version, so edits made by hand in another workspace and not yet versioned are not in it. To keep them, make interface edits in a named workspace and push into that workspace; the version it creates holds both:

```bash
GTM_LIBRARY_WORKSPACE="owner-edits" pnpm push web
```

The Default Workspace is refused (decision-4): automation never writes where people edit by hand.

`pnpm push` lints the template first and refuses on findings. `pnpm pull` lints the container the same way. Commit the regenerated module; a package version pins a library snapshot. `pnpm sample <type>` regenerates the module from the template through an in-memory container, for work without credentials.

```bash
GTM_LIBRARY_WORKSPACE=wip pnpm pull web    # work in progress instead of the latest version
```
