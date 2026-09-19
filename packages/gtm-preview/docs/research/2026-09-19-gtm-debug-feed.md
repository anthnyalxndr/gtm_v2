# GTM's debug feed can be read headless, without Tag Assistant

Research notes from 2026-09-19. Everything below was verified by running it, against
Google's served scripts and against two real containers. Scripts that reproduce each finding
are in `docs/spikes/debug-queue/`.

## Summary

The Google Tag Manager runtime ships a debug build of every container that pushes structured
records into a global array on `window`. Tag Assistant is only a viewer for that array. With
Playwright we can load the debug build directly, resume it ourselves, and read the same
records Tag Assistant would show: every dataLayer event, every trigger with its predicate
results, every tag with its execution status and resolved parameters, and the consent state
at each step. No Google login, no browser extension, no Tag Assistant tab.

This replaces the plan to predict tag firing by evaluating trigger conditions from the Tag
Manager API. GTM's own verdict is available, so prediction is unnecessary.

## How the pieces fit

1. **Detection.** Every `gtm.js` build checks four signals at bootstrap to decide whether it
   is in debug mode: a `gtm_debug` query parameter on the page URL whose value is a
   millisecond timestamp within 15 minutes behind or 5 minutes ahead of now; a referrer of
   tagassistant.google.com; a `__TAG_ASSISTANT` cookie; or a `data-tag-assistant-present`
   attribute on `<html>` set by the Tag Assistant Companion browser extension.
2. **The debug build.** Requesting `gtm.js?id=<container>&gtm_auth=<code>&gtm_preview=env-<n>&gtm_debug=x`
   returns a different, larger build with the debug flag on and the full set of record
   emitters. The same request without `gtm_auth` returns HTTP 403. The environment
   authorization code is what the server checks. For Google tags (gtag.js, `G-` and `GT-`
   ids) the debug build is served to anyone with `gtm_debug=x`, since a Google tag has no
   unpublished state to protect.
3. **The pause, when it happens.** If the page carries one of the four debug signals, the
   build creates `window["google.tagmanager.debugui2.queue"]`, injects Google's
   `debug/bootstrap` script, pushes a `CONTAINER_STARTING` record whose `data.resume` is a
   function, and stops until something calls it. In a real session the bootstrap script talks
   to Tag Assistant through `window.opener` or the extension, gets container details back,
   and resumes. **Without a signal on the page, the debug build does not pause and does not
   push `CONTAINER_STARTING`. It runs immediately and still emits every record.** That is the
   path the product uses: the signal is only in the container request, never on the page.
4. **Our hook.** An init script defines the queue property before any page script runs, so
   the build's `push` calls land in our recorder. If a `CONTAINER_STARTING` ever arrives (a
   page with a stale `__TAG_ASSISTANT` cookie, say), the recorder calls `data.resume()`
   itself. A route handler aborts `debug/bootstrap` and `debug/badge` so nothing tries to
   reach Tag Assistant.
5. **Loading the debug build on a real site.** The site's own snippet requests plain
   `gtm.js?id=X`. A Playwright route rewrites that one request in flight to add the
   environment and debug parameters. The page is otherwise untouched.

## The record stream

Record types observed from a GTM web container (protocol `version: "2"`):

| Type                                     | What it carries                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INIT`                                   | Container id, aliases, destinations, load source                                                                                                        |
| `EVENT_STARTED`                          | Event id and name, plus `tagInfo`: every tag in the container with its template and resolved parameters for this event                                  |
| `MACRO_RESOLVED`                         | `ruleInfo`: every trigger by name, its predicates with results, `pass`, and the tag indexes it fires or blocks                                          |
| `DATA_LAYER`                             | The data layer state after the event                                                                                                                    |
| `TAG_STARTED`                            | Tag name, `execute` (execute, blocked, suppressed, malware), `tagData` with each parameter as a template and resolved pair, variable references by name |
| `TAG_STATUS`                             | `execute_running`, `execute_succeeded`, `execute_failed`, `execute_exception`, `execute_permission_error`                                               |
| `TAG_BLOCKED`                            | A tag whose firing trigger matched but a blocking trigger or consent stopped it                                                                         |
| `GTAG_COMMAND`, `GTAG_EVENT`, `GTAG_GET` | Google tag commands the container issued internally                                                                                                     |
| `GTAG_HIT`                               | A hit the Google tag runtime sent: target, endpoint, URL, POST body                                                                                     |
| `CONSENT_STATE`, `CONSENT_ERROR`         | Consent commands and errors                                                                                                                             |
| `ERROR`, `LOG`, `TAG_DIAGNOSTICS`        | Runtime errors, template logs, CSP violations                                                                                                           |

Every record has `key` (publicId, eventId, eventName, tagName, groupId, targetRef) and
`consentData` with the full consent list at the moment of the record.

Google tags emit the same types with `containerProduct: "OGT"` and `version: "3"`. The two
protocol versions have not yet been compared field by field.

## What the production build emits

The production build (no `gtm_debug`) has only three emitters, `INIT`, `GTAG_HIT`, and
`TAG_DIAGNOSTICS`, and writes them to a different global, `google.tagmanager.ta.prodqueue`,
only when the Tag Assistant Companion extension has stamped `<html>` with
`data-tag-assistant-prod-present=<timestamp>`. Faking that stamp headless works and yields hit
records tied to GTM event ids on any live container, with no token. The stamp has to be in
the HTML before the container script runs. Playwright init scripts execute before `<html>`
exists, so it must be added by rewriting the served HTML or by a MutationObserver.

## Environment authorization codes

- The Tag Manager API v2 `environments.list` call returns `authorizationCode` for every
  environment. Every container has Live (id 1) and Latest (id 2). Workspace quick previews
  also appear as environments of type `workspace` with their own code.
- Codes do not expire. `environments.reauthorize` rotates one. Anyone holding a code can load
  that version with full debug instrumentation, so codes are secrets.
- The code is also visible in the `gtm.js` request of any recorded preview session, so a HAR
  of a preview session is sensitive.

## Hits and side effects

- The debug build sends real hits. A page load of the test site put a real page_view into
  the client's GA4 property, and that container fires Google Ads conversions on phone and
  email clicks.
- Aborting hit requests at the browser does not change the debug stream. GTM reports
  `execute_succeeded` when the tag's code finishes, not when the network call lands. So a
  dry run loses no fidelity.
- Neither the debug build nor a `gtm_debug` parameter on the page URL marks GA4 hits with
  `_dbg=1`. The GA4 runtime copies a `debug_mode` value from the event onto the hit, and in a
  real session Tag Assistant supplies that value over its connection. Rewriting GA4 collect
  requests to append `_dbg=1` at the network layer is the deterministic way to get hits into
  DebugView. Only GA4 has a debug flag. Ads, Floodlight, and Meta hits are real in every mode
  that lets them out.

## Verified against

- `GTM-WNX8FFXW` (test container): synthetic events, a pre-snippet push, a click, a pushed
  `form_submit` that passed its trigger and ran a GA4 tag to `execute_succeeded`.
- `GTM-52ZLPX7` on www.drsamanthamunson.com (Squarespace): 11 tags, 9 triggers, page load and
  scroll events, hits captured and, in dry run, aborted.
- `GTM-PZ7GMV9` (public, no access): production queue records with a faked extension stamp.

## Prior art checked

No published tool reads this feed. Simo Ahava's gtm-datalayer-test and puppeteer-datalayer
assert on `window.dataLayer` only. ObservePoint, DataTrue, and Tag Inspector capture network
hits in a real browser. gtm-spy and GTM Parser decode the compiled container resource.
selnekovic/gtm_scripts_exploration documents the runtime and was the lead for the queue name.
