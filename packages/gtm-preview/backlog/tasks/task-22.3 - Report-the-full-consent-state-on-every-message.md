---
id: TASK-22.3
title: Report the full consent state on every message
status: To Do
assignee: []
created_date: '2026-09-24 21:10'
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

- [ ] #1 Where the seven consent types and the default and quiet flags come from in the debug feed is established, or recorded as unavailable with what the feed does provide
- [ ] #2 consentData.consentList and fullConsentList match the native export for every message in the captured contact flow
- [ ] #3 The consent a tag fired under, embedded in tagsFired, matches too, which is what removes the repeated difference

<!-- AC:END -->
