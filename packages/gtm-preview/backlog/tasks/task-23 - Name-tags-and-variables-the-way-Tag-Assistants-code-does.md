---
id: TASK-23
title: Name tags and variables the way Tag Assistant's code does
status: To Do
assignee: []
created_date: '2026-09-25 09:27'
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

- [ ] #1 A variable's variablePublicId is metadata.originalType when the record carries one, and metadata.type otherwise
- [ ] #2 A tag whose metadata.type is paused takes its type id from tagData.vtp_originalTagType[0]
- [ ] #3 A tag or variable whose id the container holds no definition for is typed Unknown Tag Type or Unknown Variable Type, and templates.ts is either kept as a deliberate earlier fallback with the reason written down or removed
- [ ] #4 A tag named _gen_<something>_<rest> gets displayName <rest> while name keeps the full string
- [ ] #5 The provisional _implicit_ tag filter is resolved: either replaced by a rule read from Tag Assistant's own code or kept with the evidence for it recorded

<!-- AC:END -->
