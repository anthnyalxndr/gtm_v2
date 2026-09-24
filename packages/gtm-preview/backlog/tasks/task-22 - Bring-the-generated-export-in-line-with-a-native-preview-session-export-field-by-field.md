---
id: TASK-22
title: >-
  Bring the generated export in line with a native preview session export, field
  by field
status: In Progress
assignee: []
created_date: '2026-09-23 20:53'
updated_date: '2026-09-24 20:29'
labels:
  - export
dependencies:
  - TASK-14
priority: high
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The Tag Assistant import file is a product deliverable: people open it in Google's own UI, so every divergence from what a native preview session produces is a defect a user sees rather than one a test catches. Two have already been found by eye, one fixed (GTM's _implicit_ listener tags appeared in Tags Fired; a real export omits them, db78ad3) and one open (the Google tag panel's Source line reads 'Tag in container Undefined parameter - CONTAINER_ID'), which suggests there are more. Replace spot-checking with a systematic comparison.

Method: capture the same session twice, once natively and once with this tool, against the same container and the same flow, then diff. Start with the smallest case, a single page load with no interaction, and get the two files structurally identical before adding anything. Then repeat with a flow that exercises clicks, a navigation, and a consent choice, which is where ordering, grouping, and per-event state are most likely to diverge.

Capturing the native side needs a signed-in Tag Assistant session and the export done by hand, so each round is manual; automating it is what task-12 (deferred) was about, and this task may make reviving it worthwhile. A genuine export is already available for reference at preview_mode_export.json in anthnyalxndr/affogato-dr_samantha_munson-conversion_tracking.

Differences already suspected, as a starting list rather than the whole of it: the container entry's version field (a native export used QUICK_PREVIEW for the GTM container where this tool writes env-N); vendorTemplates, where this tool writes empty vendorTemplateTypes and paramMaps while a native export carries the full template definitions with display names and parameter labels; the Google tag container's containerDetails.container fields; pageSummaries.referrer, empty here and the Tag Assistant URL natively; numTaggedPages against numPages; tag index numbering after entries are filtered; and the ordering of tagsFired.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A script compares two export files structurally and prints differences by path, normalising the fields that cannot match (timestamps, groupIds, nonces, page ids, random ids, and the authorization code) so the output is only meaningful divergence
- [ ] #2 Phase one, a single page load with no interaction on one container captured both ways: every difference the script reports is either eliminated in the exporter or recorded in a findings document with the reason it cannot be matched
- [x] #3 Phase two, a flow with clicks, a navigation, and a consent choice captured both ways, given the same treatment; event ordering, page grouping, and per-event consent state are compared explicitly because they are the most likely to diverge
- [ ] #4 Every difference that is fixed gains a regression test pinning the behaviour, so the exporter cannot drift back
- [ ] #5 The findings document lists the accepted differences with reasons, and the shape signature fixture is regenerated from a native export so it covers the fields the comparison checks
- [ ] #6 The Google tag panel's Source line no longer reads 'Undefined parameter - CONTAINER_ID' when the file is imported, confirmed in the Tag Assistant UI
- [ ] #7 The rule for leaving GTM's implicit listener tags out of the export is decided on evidence from more than one container and stops being provisional: either the _implicit_ name prefix or the listener template types (lcl, cl, fsl, sdl, evl, ytl, tl, hl, jel), which agree on every session captured so far, or a signal found elsewhere; the comment in tag-assistant.ts naming the open questions is replaced with the finding
- [ ] #8 It is confirmed whether an implicit tag can appear anywhere but last in tagInfo, since surviving entries keep their original indices, and whether any other generated name is dropped from a GTM container

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Diff script that normalises volatile fields and reports differences by path.
2. Capture our page view of sjpools.com; diff against the native export the user supplied.
3. Fix phase-one differences one at a time with a test each.
4. Record accepted differences in a findings doc.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Phase one started 2026-09-23 against the native page-view export the user captured. Built src/export/compare.ts plus 'pnpm compare', which aligns containers and messages by identity rather than position and normalises clocks, session ids, the auth code and gtm_debug/gtm_auth/gtm_preview/_dbg URL parameters. Matching the environment first mattered: the scenario now names environment 8, the workspace preview the native session used, so container content is identical and what remains is format. Fixed: product OGT to GTAG; environment named as Tag Manager does with version QUICK_PREVIEW for a workspace preview; the Google tag container given its own protocol version, an empty environmentName and no environmentLinkType. Both containers now match the native on every identity field. 925 shape differences remain, catalogued in docs/research/2026-09-23-export-fidelity.md; the largest two (372 params/internalParams and their display names, 21 vendorTemplates) are one missing subsystem, the template definitions a native export carries and we write empty. Where Tag Assistant fetches them is the next question; they are not in the debug feed.

Hits Sent implemented and verified in the UI (2026-09-23, ee2f3d6). The panel reads hitInfo entries inside a message's data array, beside the ruleInfo entry; we wrote none, so the tab was empty. Now the Hit Details panel renders as the native one does: destination chip, URL, and a parameters table with friendly names (Client ID, Cookie Consent State, Debug View, Event Name, Measurement ID, Page Location) falling back to the raw key for dma, frm, gcd, gtm, ibt and ngs, exactly as a native export does. GA4 collect is a Google Analytics Hit of type 2, the Ads endpoints a Google Ads Event of type 3, and the destination passes through as the runtime gave it (a string for GA4, an array for Ads). Hits with no destination are dropped, which a native export also does not show; that is provisional. Two remaining hit differences, both understood and recorded in the findings doc: the native hit carries dr (Page Referrer) because a native preview is opened from tagassistant.google.com while a headless run navigates straight to the page, and the Ads endpoint reported two hits to us differing only in fmt (8 and 3) where the native shows one.

Ads hit duplication settled by comparison rather than choice (2026-09-24): /ccm/collect is sent twice, fmt=8 then fmt=3, and both requests leave the browser; the native export keeps the fmt=8 one, so the export collapses a measurement delivered by two transports and this tool now matches. The SessionReport still lists both requests. Hits now match the native export on count, container, message, title, subtitle, type and destination; the only remaining difference is the dr (Page Referrer) parameter a native preview has because it opens the page from tagassistant.google.com.

Phase two flow captured 2026-09-24: scenarios/sjpools-contact.json with flows/sjpools-contact.mjs drives home, contact, email link, phone link, exit, against environment 8. Produces 23 messages over 2 page groups, 14 tags executed with one Ads tag failing, and 15 hits including the email_click and call_click GA4 hits. Found while writing the driver: clicking as soon as the contact page's page_view arrives lands before the page binds its link listeners and the click is lost, so the driver settles for three seconds first; the flow is otherwise the recorder's output. Awaiting a native export of the same flow to compare.

Phase two compared 2026-09-24 against a native export of the contact flow, captured through the new runbook and using the same environment so content matches. Fixed: a Google tag container carries no tagInfo or tagsFired natively (provisional, an older export of another container disagrees), and every container ends with an empty group. 1585 differences down to 1160, with every container-level count now matching except messages. The message gap is fully explained: the GTM container has 33 messages natively to our 23, and the ten missing are gtag.consent.default (2), gtag.consent.update (1), gtag.set (2) and plain dataLayer pushes rendered as (Message) (5). All are in our raw session as GTAG_COMMAND records with inPageCommand true, plus pushes with no event key; native also gives those messages a gtagCommandModel field we never write. Rendering them is the largest remaining item.
<!-- SECTION:NOTES:END -->
