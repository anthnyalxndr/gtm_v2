---
id: TASK-22.2
title: >-
  Carry Tag Assistant's template definitions so parameters split and display as
  a native export does
status: To Do
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-24 21:10'
labels:
  - export
dependencies:
  - TASK-22.1
parent_task_id: TASK-22
priority: high
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A native export carries a vendorTemplates block holding a definition per template id (gaawe, googtag, awct, gclidw, awcc, and the variable types c, e, f, u, v) with a display name and a declared parameter list. This tool writes vendorTemplateTypes and paramMaps empty, and two visible differences follow. A parameter goes in params when the template declares it and internalParams when it does not: for GA4 Event call_click a native export puts three in params and six in internalParams while this tool puts seven and two. And a parameter's name is its display name from the template: native writes Send Ecommerce data where this tool writes sendEcommerceData, the key with its vtp_ prefix stripped. The same split applies to variables in macroInfo. This is the largest remaining root cause, since the tagInfo and macroInfo difference counts are this one problem repeated per message. It is probably also behind the Google tag panel's Source line reading Undefined parameter - CONTAINER_ID. Where Tag Assistant fetches the definitions is not known and is the first thing to settle; they are not in the debug feed, which gives a tag only name and metadata.type. The vendorTemplates block in a captured native export is a usable sample for the common templates if no live source is found.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Where Tag Assistant obtains template definitions is established and written down: a request it makes, a payload already on the page, or neither, in which case shipping a captured set is the decision and its staleness risk is stated
- [ ] #2 The export writes vendorTemplateTypes and paramMaps for the templates a session uses, in the shape a native export uses
- [ ] #3 A tag parameter the template declares goes in params and one it does not goes in internalParams, matching the native export for every tag in the captured contact flow
- [ ] #4 A parameter's name is the template's display name, falling back to the key with vtp_ stripped when the template is unknown, and the same rule applies to variables in macroInfo
- [ ] #5 A tag's type display name comes from the definition rather than the hand-written table in templates.ts, which is reduced to a fallback
- [ ] #6 Re-importing the file, the Google tag panel's Source line no longer reads Undefined parameter - CONTAINER_ID

<!-- AC:END -->
