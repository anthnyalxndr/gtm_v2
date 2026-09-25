---
id: TASK-20
title: Custom templates are applied from the spec
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Snapshots carry customTemplate but apply never writes templates, and normalize rejects tags whose type starts with cvt_ (packages/gtm-apply/src/spec/normalize.ts, line 97). A container that uses a community gallery template or a custom template cannot be managed from git. Templates should be a spec section applied before variables (variables and tags reference them by type), with name as identity and templateData as the compared body. Gallery templates carry galleryReference; decide whether the spec pins a gallery version or tracks the latest and document the choice. Removes the cvt_ rejection from decision-2 for the case where the template is in the spec or already in the container.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A spec customTemplate section with name and templateData creates the template in the workspace, and a second apply reports it unchanged
- [ ] #2 A changed templateData plans and applies an update that keeps the template id
- [ ] #3 A tag or variable whose type is cvt_<templateId> resolves when the template is in the spec or the container, and is a plan error naming the template otherwise
- [ ] #4 Gallery templates with galleryReference apply, and the README states how gallery versions are pinned
- [ ] #5 export and normalize emit the customTemplate section from a snapshot or UI export
- [ ] #6 Unit tests cover create, update, unchanged, cvt_ resolution, and the missing-template error
<!-- AC:END -->
