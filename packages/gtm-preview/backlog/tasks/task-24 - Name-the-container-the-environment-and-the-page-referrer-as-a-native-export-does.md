---
id: TASK-24
title: >-
  Name the container, the environment and the page referrer as a native export
  does
status: To Do
assignee: []
created_date: '2026-09-25 09:29'
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

- [ ] #1 containerName defaults to the start URL host and neither the run nor the export command overrides it with the scenario name
- [ ] #2 A saved raw session records the environment name and type, and the export command uses them, so a rebuilt document names the environment as the run did
- [ ] #3 pageSummaries referrer is the previous page in the session, and empty for the first page
- [ ] #4 The three values match the native contact-flow export, except the first page referrer, which a native session inherits from Tag Assistant's own launcher

<!-- AC:END -->
