---
id: TASK-22.4
title: Match hit parameter descriptors to a native export
status: Done
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-25 09:36'
labels:
  - export
dependencies: []
parent_task_id: TASK-22
priority: medium
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Hits now render in Tag Assistant, but their parameter descriptors differ in two ways. A native export omits the descriptor entirely on some parameters where this tool always writes one, and it carries a shortNameRegExp field on others that this tool never writes. There is also a parameter count difference of one, which is the dr referrer a native preview has and a headless run does not, and that is already recorded as an accepted difference.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Which parameters a native export gives a descriptor, and which it leaves bare, is established from the captured exports and applied
- [x] #2 shortNameRegExp is written where a native export writes it
- [x] #3 Hit parameters match the native export for every hit in the captured contact flow, apart from the accepted dr difference

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Tag Assistant carries the hit parameter dictionaries in its own bundle, four arrays by vendor each ending with the same eight consent descriptors, read out into src/export/fixtures/hit-parameter-descriptors.json. Lookup is exact short name, then the first entry whose shortNameRegExp matches, then nothing: a parameter no entry covers gets no descriptor field, which is what a native export does for 38 of the parameters in the captured contact flow. Which array applies follows the endpoint, not the vendor, because the Ads ccm/collect endpoint carries GA4's parameter names. The rule reproduces all 719 descriptors in the native contact export exactly. Measuring it needed the comparator to align hit parameters by name and to ignore the values that belong to one visit, so the hand-written HIT_PARAM_NAMES table is gone. The contact flow reads 571 differences in shape and 1498 with values, and the only parameters left differing are _gaz and gdid, present in one recording and not the other.
<!-- SECTION:FINAL_SUMMARY:END -->
