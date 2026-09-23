---
id: TASK-20
title: Instrument GTM containers on the page that the scenario does not name
status: To Do
assignee: []
created_date: '2026-09-23 20:25'
updated_date: '2026-09-23 20:38'
labels:
  - capture
  - scenario
dependencies:
  - TASK-18
priority: medium
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A scenario names exactly one GTM container and the runner rewrites only the request whose id equals it. A page carrying more than one GTM container (a second snippet, or a zone's child container) therefore has just one instrumented: the others load their production build and report nothing, so their tags are invisible rather than reported as missing. Found by reading the code on 2026-09-23 and not yet reproduced against a real site, so the first step is finding or building one. The Google-tag-without-GTM case that was originally bundled here is now task-21.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A scenario can name more than one GTM container; each named container gets its own environment code and debug build, and the report and Tag Assistant export keep their events and hits apart, which the container-keyed event model already supports
- [ ] #2 A GTM container on the page that the scenario does not name is reported as a warning naming its id, rather than silently loading production and contributing nothing
- [ ] #3 The errors a run produces when no container request arrives name what was expected, so a misconfigured scenario is obvious
- [ ] #4 A fixture page loading two GTM containers exists under test/fixtures/site and an integration test covers it

<!-- AC:END -->
