---
id: TASK-11
title: Flag mismatches between GTM's tag verdicts and observed hits
status: Done
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 20:01'
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

- [x] #1 Each report event gains a mismatches list naming executed tags with no attributable hit and hits with no executed tag, considering only tag types that send hits
- [x] #2 The summary counts mismatches and the CLI prints them
- [x] #3 The run command exits non-zero when --fail-on-mismatch is set and mismatches exist

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

src/report/mismatches.ts is a pure comparison per event: hit-sending tag types (gaawe, awct, sp, flc, fls, ua, img) that executed with no hit, and hits with no executed explaining tag (those types plus googtag and html). Hits that leave before GTM's first event go in report.unattributedHits and count as mismatches, which is how the fixture site's fake vendor requests surface. The CLI prints each mismatch under the event list and --fail-on-mismatch exits 3. Verified on the fixture site: three unattributed hits, exit 3.
<!-- SECTION:FINAL_SUMMARY:END -->
