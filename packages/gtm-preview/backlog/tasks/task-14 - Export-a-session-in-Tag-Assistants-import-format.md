---
id: TASK-14
title: Export a session in Tag Assistant's import format
status: Review
assignee: []
created_date: '2026-09-19 17:04'
updated_date: '2026-09-19 17:11'
labels:
  - export
dependencies:
  - TASK-13
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Tag Assistant can import a debug session JSON (overflow menu, Import session, opens read-only). Its export format is per container: a messages list (one per event, merging the event, trigger evaluation, data layer, variable resolution, and tag status records, plus display names and pretty-printed strings), a tagsFired map, groups per page load, pageSummaries, containerLoadInfoByGroupId, and vendorTemplates. Our debug feed holds the same records, so a headless run can be written in that format and opened in Tag Assistant by anyone. Reference export: preview_mode_export.json in anthnyalxndr/affogato-dr_samantha_munson-conversion_tracking (not copied here; it contains a live authorization code and client data).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A pure function builds the export from a raw session: root name, version 2, timestamp, data.debugContext WEB, data.domainDetails, and one container entry with type, publicId, canonicalId, aliases, destinations, version, product, containerDetails, messages, tagsFired, groups, pageSummaries, containerLoadInfoByGroupId, vendorTemplates, counts, tagName, and environmentName
- [x] #2 Each message carries index (descending, 1-based), eventNameKey, navType MESSAGE, consentData (consentList, consentStatus, fullConsentList), title from the same event-name table Tag Assistant uses, data with eventId and ruleInfo, tagInfo for every container tag with params as template and resolved literal pairs and execute status for tags that ran, macroInfo, message, abstractModel, and the pretty-printed messageString and abstractModelString
- [x] #3 Template ids map to the display names and thumbnails Tag Assistant shows for the common Google templates and listeners, with the id itself as the fallback
- [x] #4 The authorization code is not written into the export unless --include-auth is passed
- [x] #5 The run command accepts --tag-assistant <path> and writes the export next to the report; an export command builds it from a saved raw session; unit tests compare the produced structure against the key and type shape of a real export message

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Implemented on feat/debug-feed-capture. src/export/tag-assistant.ts builds the document from a raw session; src/export/templates.ts maps template ids to Tag Assistant display names, thumbnails, and event titles; src/export/js-literal.ts reproduces Tag Assistant's literal formatting including {{variable}} references. run gained --raw, --tag-assistant, and --include-auth; a new export command builds the file from a saved raw session. Tests pin the structure to a key-and-type signature extracted from a real export. Verified by importing the produced file into tagassistant.google.com without a login: the session, event list, tag summary, tag details with parameters and firing trigger filters, and variables all render.
<!-- SECTION:FINAL_SUMMARY:END -->
