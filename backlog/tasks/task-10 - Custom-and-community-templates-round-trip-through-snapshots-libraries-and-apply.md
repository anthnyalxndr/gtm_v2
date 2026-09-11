---
id: TASK-10
title: >-
  Custom and community templates round-trip through snapshots, libraries and
  apply
status: To Do
assignee: []
created_date: '2026-09-11 15:27'
labels:
  - sdk
  - templates
dependencies:
  - TASK-8
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A real template container will use community templates within days, and today the normalizer rejects any tag or variable whose type is cvt_*, so the library cannot hold them and apply cannot create them. Templates are workspace entities (accounts.containers.workspaces.templates, with templateData and an optional galleryReference) and a cvt_ type embeds the template id of the source container, which differs per container. Make templates first-class: carry them in the spec, resolve cvt_ types by template name rather than id at apply time, create or update templates before the tags and variables that use them, include them in reference closure so a recipe brings its templates along, and let import_from_gallery satisfy a gallery-backed template. This is the first blocker for using the Web Template container as the library.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A spec may declare a template section (name, templateData, galleryReference); normalizeExport converts a cvt_<container>_<id> type on tags and variables to a name reference, and the planner and executor create or update templates before the entities that use them and resolve the reference back to the target container's template id
- [ ] #2 Reference closure includes the template a tag or variable is built on, so select() brings templates along and lint() reports a cvt_ type whose template is missing
- [ ] #3 A gallery-backed template is created through import_from_gallery when the target lacks it, and compared by galleryReference plus templateData on later runs
- [ ] #4 The gtm-client fake serves templates with templateData and import_from_gallery; tests cover normalize, plan, execute, closure, and a library round trip with a custom template tag
- [ ] #5 README removes the cvt_ limitation
<!-- AC:END -->
