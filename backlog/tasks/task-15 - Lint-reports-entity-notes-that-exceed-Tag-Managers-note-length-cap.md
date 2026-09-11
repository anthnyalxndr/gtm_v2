---
id: TASK-15
title: Lint reports entity notes that exceed Tag Manager's note length cap
status: Done
assignee: []
created_date: '2026-09-11 21:45'
updated_date: '2026-09-11 22:51'
labels:
  - sdk
  - library
dependencies:
  - TASK-12
priority: low
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A notes trailer plus customer text can grow past the length Tag Manager accepts, and the failure would surface only when push writes the entity. The cap should be verified (documentation or an empirical write against the test container), recorded as a constant, and enforced by lint so a pull refuses an entity whose notes would not save. If the cap cannot be verified, the constant is left undefined and lint only enforces a manifest override.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 NOTES_MAX_LENGTH is exported with a comment recording how the value was verified
- [x] #2 lint() reports every entity whose notes exceed the cap, with the length and the cap in the message, and formatNotes documents the cap
- [x] #3 Tests cover a note at the cap and one past it; pnpm verify passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch feat/task-15-notes-cap, stacked on task-14. Probe found no cap up to 512,000 characters; NOTES_MAX_LENGTH set to that verified figure with a manifest override. pnpm verify green (162 tests). Draft PR opened; owner merges.
<!-- SECTION:NOTES:END -->
