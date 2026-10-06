---
id: TASK-21
title: Run against a Google tag with no GTM container and no credentials
status: Deferred
assignee: []
created_date: '2026-09-23 20:37'
updated_date: '2026-09-25 09:04'
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

This mode is for pages that have no GTM container, and the implementation must enforce that rather than trust the operator. Where a GTM container is present it is the one to instrument: it loads the Google tags as children, so its records carry the author's tag and trigger names and its verdicts explain why the Google tag did anything at all. That hierarchy already works (task-18) and a report built the other way round would attribute the container's work to the tag, name tags after generated entities such as _Tagging Activity Tag 12, and lose every trigger. On www.sjpools.com, GTM-5KNSPW9K is exactly what loads G-9ECPFL5LDC, so that site must be run through the GTM route even though the Google tag alone would produce records. The one case for proceeding anyway is an operator with no access to the container that is present, where a Google-tag report is better than nothing; that needs to be a deliberate choice and to be stated in the report.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A scenario may give container.id as a Google tag id (GT- or G-) and omit environment and authCodeEnv; the loader rejects a scenario that names a Google tag together with an environment or a code variable, explaining that Google tags have neither
- [ ] #2 A run against such a scenario resolves no code, calls no Tag Manager API, and works with no credentials present at all, which an integration test asserts by running with the credentials directory pointed somewhere empty
- [ ] #3 The runner waits for the Google tag's script instead of a container script, and the report's debugBuildLoaded, container id, product, and summary counts describe that Google tag
- [ ] #4 The Tag Assistant export writes the Google tag as the primary container with containerDetails.container.type GTE and no auth or preview fields, and the document still matches the shape signature
- [ ] #5 A fixture page that loads a Google tag and no GTM container exists under test/fixtures/site, and an integration test runs a scenario against it end to end
- [ ] #6 The README and AGENTS.md state that this mode needs no credentials and works on any site, and say which parts of a report are unavailable without a GTM container (trigger names and tag names come from the Google tag's own generated entities)
- [ ] #7 A GTM container detected during a Google-tag run (a gtm.js request carrying a GTM- id) stops the run with an error naming that container id and saying to name it in the scenario instead, because GTM loads the Google tag and the report would otherwise credit the tag with the container's work
- [ ] #8 A flag allows proceeding for an operator with no access to the container that is present; the report then records which GTM container was on the page and uninstrumented, and the CLI repeats that as a warning
- [ ] #9 An integration test covers both: the fixture page with a GTM container refuses a Google-tag scenario, and passes with the flag while recording the uninstrumented container

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

2026-09-25: deferred at the user's request. The GTM path is where the fidelity work is happening, and a standalone Google tag mode would fork that work before the export matches a native session. Revisit once task-22's subtasks have landed.
<!-- SECTION:NOTES:END -->
