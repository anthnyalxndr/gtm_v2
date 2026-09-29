---
id: TASK-49
title: >-
  gtm-model has a WebContainer type that nests a web container's resources the
  way the Tag Manager API does
status: Done
assignee: []
created_date: '2026-09-29 00:46'
updated_date: '2026-09-29 00:48'
labels: []
dependencies: []
priority: medium
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Callers that hold a whole web container (pulls, audits, fixtures) have only flat, unrelated entity interfaces today. A single nested type makes the parent-child structure of the API explicit: a container holds workspaces, versions, environments and destinations, and a workspace or version holds tags, triggers, variables, built-in variables, folders, custom templates, zones and Google tag configs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WebContainer nests workspaces, versions, environments and destinations under the container, and each workspace and version holds its tags, triggers, variables, built-in variables, folders, custom templates, zones and Google tag configs
- [x] #2 A WebContainer cannot hold clients or transformations, which exist only in server containers, and a type test proves it
- [x] #3 The ContainerVersion shape comes from the Tag Manager Discovery document, not a hand-written copy
- [x] #4 The type is exported from gtm-model and listed in its README
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added WebContainer, WebWorkspace, WebContainerVersion and WebContainerEntities to gtm-model (src/web-container.ts). ContainerVersion joins the Discovery generator's roots; the committed schema copy gains only that schema (Google's refetch reorders properties, so the old ordering was kept) and the revision moves to 20260924. Type tests cover nesting, API ContainerVersion assignability, and rejection of clients, transformations and non-web usage contexts; each rejection was mutation-checked. pnpm verify passes.
<!-- SECTION:FINAL_SUMMARY:END -->
