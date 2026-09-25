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

## The two recordings are different sessions (2026-09-25)

Once the ten missing message kinds were written, the GTM container held 34 messages against
the native export's 33. The extra one is a `user_engagement` event. The Google tag container
has a matching surplus: one extra `gtm.init_consent`.

Neither is a bug in the export. Both events are in the raw session with correct attribution:

```
  2367  GTM   GTM-5KNSPW9K  ev=19  user_engagement    ctid=GTM-5KNSPW9K
  2374  OGT   G-9ECPFL5LDC  ev=19  user_engagement    ctid=G-9ECPFL5LDC
```

GTM's own runtime emitted `EVENT_STARTED` for `user_engagement`, so a native Tag Assistant
reading the same feed would have shown it too. The native file was recorded by a person in a
real browser on a different day. `user_engagement` depends on how long the page was engaged
and when it was hidden, and a second `gtm.init_consent` on the Google tag depends on whether
the second page arrived as a full load. Those differ between any two visits to a live site.

So an exact message count against a separately recorded native file is not a criterion this
tool can satisfy. What is checkable, and now true: every kind of message the native export
writes is written, and no message kind appears on one side only. Counting messages of the
same kind only measures the site's behaviour on the day.

Message order differs for the same reason. In the headless run GTM numbered its own events
`1 gtm.init_consent, 2 gtm.init, 3 gtm.dom, 4 gtm.load, 6 gtm.js`, so the DOM milestones
arrived before `gtm.js`. The container request is rewritten to the debug build, which adds a
round trip, while the hit policy aborts every vendor request, so the page finishes loading
before the container script runs and GTM replays the milestones it missed. The native
recording loaded the container first and ran `gtm.js, gtm.dom, gtm.load`. The export orders
messages by arrival in both cases; the arrivals differ.

## Where template definitions come from (2026-09-25)

A native export's `vendorTemplates` block holds a definition per template id: a display name, a
thumbnail and the list of parameters the template declares. Two visible things follow from it,
and both were wrong here until now.

Tag Assistant fetches the definitions. Its bundle, `new_debug_app_compiled.js` at
tagassistant.google.com, builds this request:

```
https://www.googletagmanager.com/debug/api/<publicId>/vtinfo
  ?templates=<comma separated ids>&request_mode=<2 for GTM, 1 otherwise>&hl=en
  &gtm_auth=<environment code>&env_id=<n>&authuser=<n>
```

The response field is `vendorTemplateDebugInfo`. `paramMaps` is not sent: Tag Assistant derives
it by keying each definition's `param` array on the parameter name, which reproduces the
captured file exactly.

The endpoint authorizes the signed-in Google account, not the container. Called with a valid
environment code for GTM-5KNSPW9K and no session cookie it returns HTTP 200 carrying
`errorCode: 7, "Permission Denied"`, for every environment and both request modes. Omitting the
code gives HTTP 400. A headless run cannot reach it.

So the definitions ship as a capture, in `src/export/fixtures/vendor-templates.json`, taken
from the two native exports of GTM-5KNSPW9K. Ten templates: `awcc, awct, c, e, f, gaawe,
gclidw, googtag, u, v`. The staleness risk is that Google revises a template. A parameter added
since the capture is treated as internal, and a template the capture does not hold declares
nothing, which is how every template behaved before this existed. Refresh by exporting a native
session and copying that container's `vendorTemplateTypes`.

### The split rule, checked against the capture

A parameter key with `vtp_` stripped that the template declares goes in `params`, named with the
template's display name for it. Every other key goes in `internalParams` with an empty name.
`function` and `original_vendor_template_id` name the template rather than configure it and
appear in neither. Order within each list follows the order the keys arrive in.

Checked against every tag and variable in the native contact export: 11 of 11 tags and 19 of 19
variables match on membership and order, with no exceptions. The rule is per container, which
is why a Google tag container needs no special case. Its `vendorTemplateTypes` is empty, so
every one of its parameters is internal, which is what the native file shows.

### The Source line was a different problem

The Google tag panel's Source line reading "Undefined parameter - CONTAINER_ID" has nothing to
do with templates. Tag Assistant builds that line from
`containerLoadInfoByGroupId[groupId]`: `containerLoadSource` picks the wording and `sourceId`
fills the placeholder. Source 6 is "Tag in container {CONTAINER_ID}", and this tool wrote no
`sourceId`, so the placeholder had nothing to fill it. The value is in the feed, as the Google
tag's INIT record `parentTargetReference.ctid`. The same record's sibling field `developerIds`
comes from `developer_id.<id>: true` keys of a gtag `set` command; the ids also reach the
dataLayer and a native export does not list the ones that only appear there. Both now match the
native file exactly.

## Consent state, and what the comparator was not measuring (2026-09-25)

The seven consent types and the `default` and `quiet` flags are already in the debug feed, in
each record's `consentData.fullConsentList`. The export passes that object through unchanged,
and it equals the source record on all 46 messages of the captured contact session. GTM reports
four types carrying only `implicit` until it has seen a consent command, then seven carrying
`default` and `quiet`. Nothing needs inventing.

`consentStatus` is different. The feed has no `update` field at all, and Tag Assistant derives
both flags from the entries: `default` is true when any type's `consentEntry.default` is true,
`update` likewise. Checked both ways. The derived `default` agrees with the feed's own
`defaultConsent` on all 412 records of the session, and the rule reproduces the native export's
`default` and `update` on all 67 of its messages. The feed never reports TCF, so `tcf` is
always false. With this, `update` is true on the same seven messages as the native export,
where before it was false everywhere.

### The comparison numbers were shape only

`compareExports` takes a `compareValues` option that is off by default, and the numbers quoted
above it were counting structure: a key present on one side, a type mismatch, an array of a
different length. A field holding the wrong value was not counted. Passing `--values` to
`pnpm compare` turns it on. For the contact flow the two numbers are now 633 differences in
shape and 2195 with values included. Both matter, and the shape number alone was hiding, among
other things, that `consentStatus.update` was never true.

The remaining consent difference against the native file is `wasSetLate`, true on 35 of our
messages and false on all of the native ones. That is the feed's own value, true on 378 of our
412 records. In the headless run the site's consent default command arrives after GTM has
already raised its first events, so consent genuinely was set late. It is the same class of
difference as the extra `user_engagement`: two recordings of a live site, not two renderings of
one session.

## Hit parameter descriptors (2026-09-25)

Unlike the template definitions, these are not fetched. Tag Assistant carries them in its own
bundle as one array per vendor, each ending with a spread of the same eight consent
descriptors:

| Variable in `new_debug_app_compiled.js` | Vendor                                | Entries |
| --------------------------------------- | ------------------------------------- | ------- |
| `RWb`                                   | Google Ads                            | 47      |
| `XWb`                                   | Universal Analytics                   | 144     |
| `bXb`                                   | GA4                                   | 65      |
| `iXb`                                   | Floodlight, DV360                     | 13      |
| `W$`                                    | consent, spread into each of the four | 8       |

Each array is split into a map of exact short names and a list of entries carrying a
`shortNameRegExp`, which is how `ep.form_id` gets the "Event Parameter" descriptor. Lookup is
exact first, then the first matching pattern, then nothing: a parameter no entry covers gets no
`descriptor` field at all, which the native contact export shows for 38 of its parameters. A
`RegExp` serialises to `{}`, so that is what `shortNameRegExp` looks like in the file.

Which array applies is decided by the endpoint rather than the vendor. The Ads `ccm/collect`
endpoint carries GA4's parameter names, so a hit whose subtitle reads "Google Ads Event" is
described from the GA4 list: "Event Name" with a capital N, and `dt` as "Page Title", neither of
which the Ads list holds at all. Applying that rule reproduces all 719 parameter descriptors in
the native contact export exactly, including which parameters have none.

### Measuring it needed two comparator changes

Hit parameters are now aligned by name. Without that, one extra parameter shifted every later
one and turned a single difference into a run of 301. And the values that belong to one visit
are ignored, the way the volatile keys already were: the client and session ids, the random page
id, engagement time, screen resolution, user agent, cache busters. What is left is two
parameters present in one recording and not the other, `_gaz` and `gdid`.

The contact flow now reads 571 differences in shape and 1498 with values, from 633 and 2195.
