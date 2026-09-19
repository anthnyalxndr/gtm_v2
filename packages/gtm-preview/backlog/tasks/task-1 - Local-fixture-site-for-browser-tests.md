---
id: TASK-1
title: Local fixture site for browser tests
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
labels:
  - infra
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Browser-facing code needs a deterministic page to run against without hitting a real site or a real GTM container. A tiny static server under test/fixtures serves pages that push dataLayer events (including one before any script tag loads), navigate between pages, and fire fake tag hits to GA4, Google Ads, and Floodlight URL shapes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A test helper starts the fixture server on a free port and returns its base URL
- [ ] #2 The fixture home page pushes at least three dataLayer events, one of them before the GTM snippet position
- [ ] #3 The fixture makes requests whose URLs match the GA4 /g/collect, Google Ads conversion, and Floodlight patterns
- [ ] #4 A link on the fixture home page navigates to a second same-origin page that pushes its own event

<!-- AC:END -->
