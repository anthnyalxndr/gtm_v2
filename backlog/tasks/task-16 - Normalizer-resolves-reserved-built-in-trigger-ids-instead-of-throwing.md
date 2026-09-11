---
id: TASK-16
title: Normalizer resolves reserved built-in trigger ids instead of throwing
status: To Do
assignee: []
created_date: '2026-09-11 22:51'
labels:
  - sdk
  - snapshot
dependencies: []
priority: high
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pulling a real container (e.g. GTM-KK24CHH) fails in normalizeExport: a tag's firingTriggerId references a reserved built-in trigger id such as 2147479553 (the All Pages / gtm.js initialization trigger) that is not in the container's trigger list, and nameFor throws 'Unknown trigger id'. These high-range ids (>= 2^31) are Tag Manager's built-in triggers (All Pages, DOM Ready, Window Loaded, Consent Initialization, Initialization). The normalizer should map them to stable built-in trigger names (and apply should resolve those names back to the reserved ids) rather than treat them as danglers, so a container that uses built-in triggers can be pulled, put in a library, and applied. Found on 2026-09-11 while verifying TASK-10 against live containers; orthogonal to templates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A catalog maps reserved built-in trigger ids (All Pages, DOM Ready, Window Loaded, Consent Initialization - All Pages, Initialization - All Pages, and the server equivalents) to names, verified against a live container
- [ ] #2 normalizeExport resolves a firingTriggerId/blockingTriggerId that is a reserved id to its built-in name rather than throwing, and apply resolves the name back to the reserved id without creating a trigger
- [ ] #3 A real container that uses built-in triggers (e.g. GTM-KK24CHH) pulls into a GtmSnapshot without error; unit tests cover the mapping both directions
<!-- AC:END -->
