---
id: TASK-11
title: Flag mismatches between GTM's tag verdicts and observed hits
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 17:01'
labels:
  - predict
dependencies:
  - TASK-13
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The finding a user cares about is a tag GTM says succeeded with no hit leaving the browser, or a hit that left with no tag GTM reports for that event. Compute this per event from the report's tags and hits and surface it in the summary and the CLI output.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Each report event gains a mismatches list naming executed tags with no attributable hit and hits with no executed tag, considering only tag types that send hits
- [ ] #2 The summary counts mismatches and the CLI prints them
- [ ] #3 The run command exits non-zero when --fail-on-mismatch is set and mismatches exist

<!-- AC:END -->
