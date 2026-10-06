---
id: TASK-22.2
title: >-
  Carry Tag Assistant's template definitions so parameters split and display as
  a native export does
status: Done
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-25 09:22'
labels:
  - export
dependencies:
  - TASK-13
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

- [x] #1 Where Tag Assistant obtains template definitions is established and written down: a request it makes, a payload already on the page, or neither, in which case shipping a captured set is the decision and its staleness risk is stated
- [x] #2 The export writes vendorTemplateTypes and paramMaps for the templates a session uses, in the shape a native export uses
- [x] #3 A tag parameter the template declares goes in params and one it does not goes in internalParams, matching the native export for every tag in the captured contact flow
- [x] #4 A parameter's name is the template's display name, falling back to the key with vtp_ stripped when the template is unknown, and the same rule applies to variables in macroInfo
- [x] #5 A tag's type display name comes from the definition rather than the hand-written table in templates.ts, which is reduced to a fallback
- [x] #6 The Google tag's containerLoadInfoByGroupId entry carries the sourceId that Tag Assistant's Source line reads, matching the native export field for field; confirming the rendered line needs a human import and is noted as unverified

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Template definitions now drive the parameter split. Tag Assistant fetches them from https://www.googletagmanager.com/debug/api/<publicId>/vtinfo, found by reading its bundle; that endpoint authorizes the signed-in account rather than the container and answers Permission Denied to a valid environment code, so the definitions ship as a capture in src/export/fixtures/vendor-templates.json with the staleness risk written down. A key the template declares goes in params under the template's display name and every other key goes in internalParams with an empty name, with function and original_vendor_template_id in neither; the same rule covers variables, and a Google tag container holds no definitions so all of its parameters are internal, which needs no special case. Tag and variable type names and thumbnails come from the definitions, leaving templates.ts as the fallback. Separately, the Source line reading Undefined parameter - CONTAINER_ID turned out to be containerLoadInfoByGroupId missing sourceId, not a template problem; sourceId and developerIds now match the native export exactly. The contact flow went from 1390 differences to 633 and the page view to 332.
<!-- SECTION:FINAL_SUMMARY:END -->
