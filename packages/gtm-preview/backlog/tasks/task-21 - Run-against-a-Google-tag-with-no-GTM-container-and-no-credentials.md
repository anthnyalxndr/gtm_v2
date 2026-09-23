---
id: TASK-21
title: Run against a Google tag with no GTM container and no credentials
status: To Do
assignee: []
created_date: '2026-09-23 20:37'
labels:
  - capture
  - scenario
dependencies:
  - TASK-18
priority: high
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A Google tag (a GT- or G- id loaded through gtag/js) serves its debug build to anyone who adds gtm_debug=x: no authorization code, no OAuth, no account access. Its runtime emits the same record stream a GTM container does, and on www.sjpools.com the Google tag G-9ECPFL5LDC produced 25 TAG_STARTED, 50 TAG_STATUS, GTAG_HIT records tying GA4 and Ads hits to their events, plus consent state (2026-09-23). Every piece is already implemented and verified; what blocks it is that a scenario must name a GTM-XXXXXXX container and the runner waits for a gtm.js request that a site without GTM never makes. Closing that gap turns the tool on for every site using GA4 or Google Ads without Tag Manager, which is a large share of them, and makes the first run of the product require no setup at all. Split out of task-20, which keeps the unrelated multi-GTM-container work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A scenario may give container.id as a Google tag id (GT- or G-) and omit environment and authCodeEnv; the loader rejects a scenario that names a Google tag together with an environment or a code variable, explaining that Google tags have neither
- [ ] #2 A run against such a scenario resolves no code, calls no Tag Manager API, and works with no credentials present at all, which an integration test asserts by running with the credentials directory pointed somewhere empty
- [ ] #3 The runner waits for the Google tag's script instead of a container script, and the report's debugBuildLoaded, container id, product, and summary counts describe that Google tag
- [ ] #4 The Tag Assistant export writes the Google tag as the primary container with containerDetails.container.type GTE and no auth or preview fields, and the document still matches the shape signature
- [ ] #5 A fixture page that loads a Google tag and no GTM container exists under test/fixtures/site, and an integration test runs a scenario against it end to end
- [ ] #6 The README and AGENTS.md state that this mode needs no credentials and works on any site, and say which parts of a report are unavailable without a GTM container (trigger names and tag names come from the Google tag's own generated entities)

<!-- AC:END -->
