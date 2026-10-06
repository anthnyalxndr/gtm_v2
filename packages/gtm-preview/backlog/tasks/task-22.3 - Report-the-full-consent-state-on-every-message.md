---
id: TASK-22.3
title: Report the full consent state on every message
status: Done
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-25 09:27'
labels:
  - export
dependencies: []
parent_task_id: TASK-22
priority: medium
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A native export lists seven consent types in consentData.consentList where this tool lists four, and each entry in fullConsentList carries default and quiet booleans this tool does not write. Because tagsFired embeds a copy of the message a tag fired on, this one difference is repeated across hundreds of comparator lines and is the largest single contributor after the parameter split. Establish where the extra types and flags come from in the debug feed before writing them; the records this tool captures may already hold them under a field it ignores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Where the seven consent types and the default and quiet flags come from in the debug feed is established, or recorded as unavailable with what the feed does provide
- [x] #2 The consent a tag fired under, embedded in tagsFired, matches too, which is what removes the repeated difference
- [x] #3 consentData.consentList and fullConsentList equal the source record for every message, and match the native export except where the two recordings saw consent at different times, which is named in the research doc

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

The seven consent types and the default and quiet flags were already in the feed, in consentData.fullConsentList, and the export already passed them through: they equal the source record on all 46 messages. The real defect was consentStatus. The feed has no update field, and Tag Assistant derives both default and update from the entries, true when any type carries that flag. The derived default agrees with the feed's own defaultConsent on all 412 records and the rule reproduces the native export's flags on all 67 of its messages, so update is now true on the same seven messages instead of false everywhere. tcf is always false because the feed never reports it. Found along the way that pnpm compare was measuring shape only; --values turns value comparison on, and the contact flow reads 633 differences in shape and 2195 with values. The one consent difference left is wasSetLate, which is the feed's own value and reflects consent arriving after GTM booted in the headless run.
<!-- SECTION:FINAL_SUMMARY:END -->
