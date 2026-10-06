---
id: TASK-24
title: >-
  Name the container, the environment and the page referrer as a native export
  does
status: Done
assignee: []
created_date: '2026-09-25 09:29'
updated_date: '2026-09-25 09:46'
labels: []
dependencies:
  - TASK-22.6
priority: medium
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Three small fidelity gaps that only became visible once the comparator stopped reporting false differences for maps keyed by group id. containerName is written from the scenario name, so the captured contact flow reads sjpools-contact where a native export reads www.sjpools.com; the option's own default, the start URL host, is the better guess and the two CLI call sites should stop overriding it. environmentName reads env-8 because the export command rebuilds a document from a saved raw session and the raw session does not record the environment name the resolver already looked up. And pageSummaries carries an empty referrer where a native export carries the page the visitor came from, which for the second page of a flow is the first page's URL.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 containerName defaults to the start URL host and neither the run nor the export command overrides it with the scenario name
- [x] #2 A saved raw session records the environment name and type, and the export command uses them, so a rebuilt document names the environment as the run did
- [x] #3 pageSummaries referrer is the previous page in the session, and empty for the first page
- [x] #4 containerName and the page referrers match the native contact-flow export, except the first page referrer, which a native session inherits from Tag Assistant's own launcher; environmentName matches once a raw session saved after this change is exported, which the existing capture predates

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

containerName no longer takes the scenario name: both CLI call sites let it default to the start URL host, which is what Tag Manager calls these containers and what the native export shows. A saved raw session now records the environment name and type the resolver looked up, and the export command passes them on, so a rebuilt document names the environment as the run did rather than env-8; the captured raw session predates the field, so its rebuilt export still reads env-8 until a session is recorded again. pageSummaries carries the previous page in the session as its referrer, empty for the first page, which matches the native file for the second page. The first page differs because a native session is launched from tagassistant.google.com and inherits that as its referrer.
<!-- SECTION:FINAL_SUMMARY:END -->
