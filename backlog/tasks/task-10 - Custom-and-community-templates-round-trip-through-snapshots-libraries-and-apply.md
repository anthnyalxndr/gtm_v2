---
id: TASK-10
title: >-
  Custom and community templates round-trip through snapshots, libraries and
  apply
status: Done
assignee: []
created_date: '2026-09-11 15:27'
updated_date: '2026-09-11 22:51'
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
- [x] #1 A spec may declare a template section (name, templateData, galleryReference); normalizeExport converts a cvt_<container>_<id> type on tags and variables to a name reference, and the planner and executor create or update templates before the entities that use them and resolve the reference back to the target container's template id
- [x] #2 Reference closure includes the template a tag or variable is built on, so select() brings templates along and lint() reports a cvt_ type whose template is missing
- [x] #3 A gallery-backed template is created through import_from_gallery when the target lacks it, and compared by galleryReference plus templateData on later runs
- [x] #4 The gtm-client fake serves templates with templateData and import_from_gallery; tests cover normalize, plan, execute, closure, and a library round trip with a custom template tag
- [x] #5 README removes the cvt_ limitation
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Custom templates are first-class: CustomTemplateSpec + customTemplate section; cvt.ts resolves the two live cvt_ formats (gallery cvt_<galleryId>, local cvt_<containerId>_<templateId>); normalize rewrites cvt_ types to a cvt:<name> sentinel and carries templates by name; plan/execute create templates first (gallery via import_from_gallery + reconcile) and rewrite the tag/variable type to the target's cvt_ id; closure + select bring templates along; lint reports a cvt whose template is missing. Verified the cvt_ formats against live containers (GTM-KK24CHH gallery, GTM-W5XBLRZ local). Found an orthogonal blocker (reserved built-in trigger ids) filed as its own task. 148 gtm-apply tests pass.
<!-- SECTION:NOTES:END -->
