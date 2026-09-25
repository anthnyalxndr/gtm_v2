---
id: TASK-20
title: Instrument GTM containers on the page that the scenario does not name
status: Done
assignee: []
created_date: '2026-09-23 20:25'
updated_date: '2026-09-25 10:01'
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

- [x] #1 A scenario can name more than one GTM container; each named container gets its own environment code and debug build, and the report and Tag Assistant export keep their events and hits apart, which the container-keyed event model already supports
- [x] #2 A GTM container on the page that the scenario does not name is reported as a warning naming its id, rather than silently loading production and contributing nothing
- [x] #3 The errors a run produces when no container request arrives name what was expected, so a misconfigured scenario is obvious
- [x] #4 A fixture page loading two GTM containers exists under test/fixtures/site and an integration test covers it

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

A scenario's alsoInstrument lists further GTM containers; each gets its own environment code, from its own authCodeEnv or from the API, and its own debug build. The route now matches any gtm.js request and looks the id up, so a container the scenario does not name is reported as a warning naming its id rather than quietly loading production. The never-requested error names every container expected and the start URL, and a rejected code names which container and environment it was. Verified live rather than in theory: the two new integration tests pass against GTM-WNX8FFXW on a new two-containers fixture page, and a one-off run naming GTM-WNX8FFXW and GTM-5KNSPW9K together reported 27 and 42 records under their own ids plus 114 for the Google tag the second loads, with no errors and all 14 hits aborted in dry mode.
<!-- SECTION:FINAL_SUMMARY:END -->
