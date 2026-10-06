---
id: TASK-22.1
title: Render gtag commands and non-event dataLayer pushes as messages
status: Done
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-25 09:07'
labels:
  - export
dependencies: []
parent_task_id: TASK-22
priority: high
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A native export writes a message for things this tool skips, so its timeline has ten more entries than ours for the same flow (33 against 23 on the GTM container). Every one is already in our raw session. Commands come from GTAG_COMMAND records where inPageCommand is true: commandType set becomes eventName gtag.set titled Set, and commandType consent becomes gtag.consent.default or gtag.consent.update from commandData.subcommand, titled Consent Default and Consent Update. Commands with inPageCommand false are the container's own internal config and event calls and a native export does not show them. The remaining five are dataLayer pushes carrying no event key, which appear with the title Message and no eventName or eventId. Native also gives command messages a gtagCommandModel field this tool never writes. This is the most visible gap left: someone reading the timeline is missing ten entries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A GTAG_COMMAND record with inPageCommand true becomes a message: commandType set as gtag.set titled Set, commandType consent as gtag.consent.default or gtag.consent.update per commandData.subcommand, titled Consent Default and Consent Update
- [x] #2 Commands with inPageCommand false produce no message, matching a native export
- [x] #3 A dataLayer push with no event key becomes a message titled Message, with no eventName and no eventId, and its pushed object as the message body
- [x] #4 Command messages carry a gtagCommandModel field shaped as a native export writes it
- [x] #5 All of these interleave with event messages in the right place, and the index numbering stays contiguous and descending across the whole session
- [x] #6 Against the captured contact flow, the comparator reports no message kind present on one side only, and any remaining count difference is a difference between the two recordings rather than the export, named in the research doc

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

GTAG_COMMAND records with inPageCommand true and DATA_LAYER pushes with no event key now become messages alongside events. The message loop builds a Candidate per source, sorts them by arrival, and numbers them once, so commands, plain pushes and events interleave and the index stays contiguous and descending. Set and consent commands carry gtagCommandModel; commands with inPageCommand false are left out, as a native export leaves them out. Every message kind the native contact-flow export writes is now written, in the same counts: two gtag.set, two gtag.consent.default, one gtag.consent.update, six plain Messages. The GTM container holds 34 messages against the native 33; the extra is a user_engagement GTM genuinely emitted in our run, which is a difference between two recordings of a live site rather than a difference in the export. Documented in docs/research/2026-09-23-export-fidelity.md, along with why the headless run sees gtm.dom and gtm.load before gtm.js.
<!-- SECTION:FINAL_SUMMARY:END -->
