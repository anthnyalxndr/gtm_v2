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

- **Hits were missing entirely.** Tag Assistant's "Hits Sent" panel is fed by `hitInfo`
  entries inside a message's `data` array, beside the `ruleInfo` entry this tool already
  wrote. Each describes one request a tag runtime made: `baseUrl`, `destination`, a title,
  a subtitle, and every parameter with a display name that falls back to the raw key. Our
  GA4 hit now matches a native one on container, message, title, subtitle, type and
  destination.

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

**The hits now match the native export**: the same two, on the same container and message,
with the same titles, subtitles, types and destinations. Two things were learned getting
there.

The Ads consent endpoint `/ccm/collect` is sent twice, once with `fmt=8` and once with
`fmt=3`, and both requests really do leave the browser. A native export shows one, the `fmt=8`
record, which the runtime reported first. So the export collapses a measurement delivered by
two transports, and this tool now does the same. Only the export collapses them: the
`SessionReport` still lists all nine network requests, because all nine were made. Checking
which of the two the native kept, rather than picking one, is what settled it.

A native hit carries `dr` (Page Referrer) and ours does not, because a native preview opens
the page from tagassistant.google.com while a headless run navigates straight to it. That is
an accepted difference, and it matters beyond the export: a referrer-based trigger behaves
differently under a native preview than for a real visitor.

**Not yet examined:** `consentData` (the native lists seven consent types to our four, and its
entries carry `default` and `quiet` flags we do not write), `tagInfo` and `tagsFired`
membership, the empty second group a native export contains, and `tagName` (native uses the
container's name in Tag Manager, `www.sjpools.com`; this tool uses the scenario name).

## Phase two: a flow with clicks and a navigation

A native export of home, contact, the email link and the phone link is in
`reports/sjpools-recorded.tag-assistant.contact.json`, captured with the runbook in
`docs/runbooks/capture-a-native-tag-assistant-export.md`. It used the same environment as
phase one, so container content matches and the differences are format.

```bash
pnpm dev run scenarios/sjpools-contact.json --tag-assistant reports/sjpools-contact.tag-assistant.json
pnpm compare reports/sjpools-recorded.tag-assistant.contact.json reports/sjpools-contact.tag-assistant.json
```

### Fixed in this pass

- **A Google tag container carries no tags.** A native export gives it an empty `tagInfo` on
  every message and an empty `tagsFired`, though its runtime reports plenty of generated
  activity tags. This tool wrote 27 of them. Provisional: an older export of a different
  container (2026-08-26) does list five, so this either changed in Tag Assistant or turns on
  something not yet identified. The two recent exports win, because the point is to match Tag
  Assistant as it is now.
- **Every container ends with an empty group**, `{navType: GROUP, title: "", navTitle: "",
logInfo: [], messageCount: 0, memoCount: 0}`, after the real page loads.

That took the flow from 1585 differences to 1160, and every container-level count now matches
the native export except the number of messages.

### The message gap is now fully understood

The GTM container has 33 messages natively and 23 here. The ten missing ones are exactly the
record kinds this tool does not render, and our raw session holds all of them:

| Missing                                        | Count           | Comes from                                                                    |
| ---------------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `gtag.consent.default`, titled Consent Default | 2, one per page | `GTAG_COMMAND` with `commandType: consent`, `commandData.subcommand: default` |
| `gtag.consent.update`                          | 1               | the same, `subcommand: update`                                                |
| `gtag.set`, titled Set                         | 2, one per page | `GTAG_COMMAND` with `commandType: set`                                        |
| `(Message)`, no event name or id               | 5               | a dataLayer push with no `event` key                                          |

Only commands with `inPageCommand: true` become messages: the container's own internal
`config` and `event` commands do not. Those messages also carry a `gtagCommandModel` field
this tool never writes. Rendering them is the single largest remaining item and the most
visible, since a person reading the timeline is missing ten entries.

### Still open after that

| Count | What                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------- |
| 562   | `tagInfo` and `tagsFired` detail on the GTM container, where the names match but the entries differ |
| 120   | `params` against `internalParams`, still waiting on template definitions                            |
| 113   | `hitInfo`, more numerous in a flow than in a page view                                              |
| 100   | `abstractModel` contents, which follow from message ordering                                        |
| 79    | `macroInfo`                                                                                         |
| 64    | `consentData`                                                                                       |
| 19    | `vendorTemplates`                                                                                   |
