---
id: TASK-20
title: >-
  Instrument every tagging container on the page, not only one named GTM
  container
status: To Do
assignee: []
created_date: '2026-09-23 20:25'
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

A scenario names exactly one container and its id must match GTM-XXXXXXX, and the runner rewrites only the request whose id equals it. That covers the common case and, since task-18, every Google tag the page loads, which needs no credentials. Two shapes are not covered. First, a site whose tagging is a Google tag alone (a GT- or G- id loaded through gtag/js with no GTM container): the scenario cannot express it, because the id regex rejects the id, and the runner expects a container request that never comes. Google tags serve their debug build to anyone with gtm_debug=x, so no token is needed for this; only the scenario shape and the runner's expectations are in the way. Second, a page carrying more than one GTM container (a second snippet, or a zone's child container): only the named one is rewritten to its debug build, so the others load production and report nothing, and their tags are invisible. Both were found by reading the code on 2026-09-23 while answering whether the tool can reach any tag on a page; neither has been reproduced against a real site yet, so the first step is to find or build one of each.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A scenario can name a Google tag (GT- or G-) as its container, with no authorization code required, and a run against a site that loads only that tag produces a report with its events and hits
- [ ] #2 A scenario can name more than one GTM container; each named container gets its own environment code and debug build, and the report and Tag Assistant export keep their events and hits apart, which the container-keyed event model already supports
- [ ] #3 A GTM container on the page that the scenario does not name is reported as a warning naming its id, rather than silently loading production and contributing nothing
- [ ] #4 The errors a run produces when no container request arrives name what was expected, so a misconfigured scenario is obvious
- [ ] #5 A fixture page for each shape (Google tag only, two containers) exists under test/fixtures/site and an integration test covers both

<!-- AC:END -->
