# Where the generated export differs from a native preview session

Findings for task-22, phase one: a single page load, no interaction.

## How to reproduce

```bash
pnpm dev run scenarios/sjpools-pageview.json --tag-assistant reports/sjpools-pageview.tag-assistant.json
pnpm compare reports/sjpools-recorded.tag-assistant.page-view.json reports/sjpools-pageview.tag-assistant.json
```

`reports/sjpools-recorded.tag-assistant.page-view.json` is a genuine Tag Assistant export of
www.sjpools.com, captured by hand. The scenario names environment 8, the same workspace
preview the native session used, so the two sessions run the _same container content_ and the
differences that remain are the format, not the session. Getting that right first mattered:
comparing against Live instead produced the same count of differences but most of them were
different tags, not a format problem.

`pnpm compare` prints shape differences. Add `--values` to compare values too; it normalises
clocks, per-session identifiers, the authorization code, and the `gtm_debug`, `gtm_auth`,
`gtm_preview` and `_dbg` parameters in URLs, so what it reports is meaningful.

## Fixed in this pass

- **Container product.** The feed says `OGT` for a Google tag; a native export writes `GTAG`.
- **Environment naming.** A native export names the environment as Tag Manager does
  (`Preview Environment 3 2026-06-13 153837`) and sets `version` to `QUICK_PREVIEW` for a
  workspace preview. This tool wrote `env-8` for both.
- **The Google tag is not in the environment.** Its container entry carries its own protocol
  version (`2`), an empty `environmentName`, and no `environmentLinkType` at all. This tool
  gave it the GTM container's environment.

Both containers now match the native export on every identity field.

## Open, in order of how much they account for

Counts are shape differences reported by `pnpm compare` after the fixes above, out of 925.

| Count | What                                                           |
| ----- | -------------------------------------------------------------- |
| 372   | `params` against `internalParams`, and parameter display names |
| 227   | which tags appear in a message's `tagInfo`                     |
| 144   | `consentData` shape                                            |
| 104   | `abstractModel` contents                                       |
| 30    | `tagsFired` membership                                         |
| 21    | `vendorTemplates`                                              |
| 14    | which records become a message                                 |

**One missing subsystem explains the first and the last, and probably more.** A native export
carries `vendorTemplates`, holding a definition per template id (`gaawe`, `googtag`, `awct`,
`gclidw`, `awcc`, and the variable types) with a display name and a declared parameter list.
This tool writes `vendorTemplateTypes: {}` and `paramMaps: {}`. That definition is what decides
both of the biggest categories:

- A parameter goes in `params` when the template declares it, and in `internalParams` when it
  does not. For `GA4 Event — call_click`, a native export puts three in `params` and six in
  `internalParams`; this tool puts seven and two.
- A parameter's `name` is its display name from the template. Native writes
  `Send Ecommerce data`; this tool writes `sendEcommerceData`, which is the key with its
  `vtp_` prefix removed.

Where Tag Assistant gets those definitions is not yet known, and finding out is the next step.
They are not in the debug feed: a tag record carries only `name` and `metadata.type`. The
`vendorTemplates` block in a real export is a usable starting sample for the common templates.

**Which records become a message** is a design difference rather than a missing field. This
tool writes one message per `EVENT_STARTED`. A native export also writes one for a consent
command (`gtag.consent.default`, titled `Consent Default`), for `gtag.set` (titled `Set`), and
for a dataLayer push that carries no event (titled `Message`). Our page load produced 8
messages against the native 13, and the three extra kinds are why.

**Message order follows arrival, not event id.** In the native export `gtm.js` is index 5 while
`gtm.dom` is 12 and `gtm.load` is 13, because on this page they fired late. This tool orders by
capture time and put `gtm.dom` at 3. Ordering feeds `abstractModel`, which accumulates dataLayer
state, so some of those 104 differences are this rather than a separate problem.

**Not yet examined:** `consentData` (the native lists seven consent types to our four, and its
entries carry `default` and `quiet` flags we do not write), `tagInfo` and `tagsFired`
membership, the empty second group a native export contains, and `tagName` (native uses the
container's name in Tag Manager, `www.sjpools.com`; this tool uses the scenario name).
