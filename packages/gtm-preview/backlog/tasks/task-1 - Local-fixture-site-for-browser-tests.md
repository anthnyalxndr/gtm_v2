---
id: TASK-1
title: Local fixture site for browser tests
status: Review
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 17:01'
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

- [x] #1 A test helper starts the fixture server on a free port and returns its base URL
- [x] #2 The fixture home page pushes at least three dataLayer events, one of them before the GTM snippet position
- [x] #3 The fixture makes requests whose URLs match the GA4 /g/collect, Google Ads conversion, and Floodlight patterns
- [x] #4 A link on the fixture home page navigates to a second same-origin page that pushes its own event

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Fixture site under test/fixtures/site: server.ts starts on a free port (or PORT) and substitutes the container id; index.html pushes pre_snippet before the snippet, cta_click on click, form_submit on submit, links to page2.html, and fires GA4, Google Ads, and Floodlight shaped requests. pnpm fixture serves it on 4173.
<!-- SECTION:FINAL_SUMMARY:END -->
