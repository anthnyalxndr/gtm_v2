---
id: TASK-22.1
title: Render gtag commands and non-event dataLayer pushes as messages
status: To Do
assignee: []
created_date: '2026-09-24 21:10'
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

- [ ] #1 A GTAG_COMMAND record with inPageCommand true becomes a message: commandType set as gtag.set titled Set, commandType consent as gtag.consent.default or gtag.consent.update per commandData.subcommand, titled Consent Default and Consent Update
- [ ] #2 Commands with inPageCommand false produce no message, matching a native export
- [ ] #3 A dataLayer push with no event key becomes a message titled Message, with no eventName and no eventId, and its pushed object as the message body
- [ ] #4 Command messages carry a gtagCommandModel field shaped as a native export writes it
- [ ] #5 All of these interleave with event messages in the right place, and the index numbering stays contiguous and descending across the whole session
- [ ] #6 Against the captured contact flow, the GTM container's message count matches the native export exactly, and the comparator reports no message present on one side only

<!-- AC:END -->
