---
id: TASK-23
title: Name tags and variables the way Tag Assistant's code does
status: Done
assignee: []
created_date: '2026-09-25 09:27'
updated_date: '2026-09-25 09:45'
labels: []
dependencies:
  - TASK-22.2
priority: medium
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Reading Tag Assistant's bundle for task-22.2 turned up three naming rules this tool does not follow, all in the same two functions that build tagInfo and macroInfo entries. A variable's public id is metadata.originalType when present and metadata.type otherwise, so a synthesised macro reports the template it came from. A tag whose metadata.type is the literal paused takes its real type from tagData.vtp_originalTagType[0]. And where the container holds no definition for the id, Tag Assistant writes the literal Unknown Variable Type or Unknown Tag Type rather than the template id or a hand-written name, which is 15 value differences on the captured contact flow. A tag's displayName is also not its name: a name matching ^_gen_[^_]+_(.*)$ displays as the captured group. That last one bears on the provisional _implicit_ filter in tag-assistant.ts, so settle both together.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A variable's variablePublicId is metadata.originalType when the record carries one, and metadata.type otherwise
- [x] #2 A tag whose metadata.type is paused takes its type id from tagData.vtp_originalTagType[0]
- [x] #3 A tag or variable whose id the container holds no definition for is typed Unknown Tag Type or Unknown Variable Type, and templates.ts is either kept as a deliberate earlier fallback with the reason written down or removed
- [x] #4 A tag named _gen_<something>_<rest> gets displayName <rest> while name keeps the full string
- [x] #5 The provisional _implicit_ tag filter is resolved: either replaced by a rule read from Tag Assistant's own code or kept with the evidence for it recorded

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Four naming rules read from Tag Assistant's bundle and applied. A paused tag takes its id from tagData.vtp_originalTagType[0]; a variable's id is metadata.originalType when present; a tag or variable whose id the container has no definition for is typed Unknown Tag Type or Unknown Variable Type, and the hand-written type tables in templates.ts are removed because Tag Assistant keeps none and a name invented here would differ from a native export exactly where the capture falls short; a tag named _gen_<kind>_<rest> displays as <rest>. The id resolution is now shared with the scan that decides which definitions a container carries, which a test caught. The implicit tag filter is settled: Tag Assistant's console enumerates six listener names and two patterns, all carrying the _implicit_ prefix, so the prefix is the same rule, and the feed reports 111 such entries where neither native export contains the string. Also fixed the GTM map literal, which printed as {type: "map", pairs: []} instead of the object it stands for. The contact flow reads 519 differences in shape and 1253 with values, from 571 and 1498.
<!-- SECTION:FINAL_SUMMARY:END -->
