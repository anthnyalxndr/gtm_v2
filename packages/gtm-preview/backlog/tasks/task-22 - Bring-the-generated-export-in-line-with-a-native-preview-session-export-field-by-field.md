---
id: TASK-22
title: >-
  Bring the generated export in line with a native preview session export, field
  by field
status: To Do
assignee: []
created_date: '2026-09-23 20:53'
labels:
  - export
dependencies:
  - TASK-14
priority: high
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The Tag Assistant import file is a product deliverable: people open it in Google's own UI, so every divergence from what a native preview session produces is a defect a user sees rather than one a test catches. Two have already been found by eye, one fixed (GTM's _implicit_ listener tags appeared in Tags Fired; a real export omits them, db78ad3) and one open (the Google tag panel's Source line reads 'Tag in container Undefined parameter - CONTAINER_ID'), which suggests there are more. Replace spot-checking with a systematic comparison.

Method: capture the same session twice, once natively and once with this tool, against the same container and the same flow, then diff. Start with the smallest case, a single page load with no interaction, and get the two files structurally identical before adding anything. Then repeat with a flow that exercises clicks, a navigation, and a consent choice, which is where ordering, grouping, and per-event state are most likely to diverge.

Capturing the native side needs a signed-in Tag Assistant session and the export done by hand, so each round is manual; automating it is what task-12 (deferred) was about, and this task may make reviving it worthwhile. A genuine export is already available for reference at preview_mode_export.json in anthnyalxndr/affogato-dr_samantha_munson-conversion_tracking.

Differences already suspected, as a starting list rather than the whole of it: the container entry's version field (a native export used QUICK_PREVIEW for the GTM container where this tool writes env-N); vendorTemplates, where this tool writes empty vendorTemplateTypes and paramMaps while a native export carries the full template definitions with display names and parameter labels; the Google tag container's containerDetails.container fields; pageSummaries.referrer, empty here and the Tag Assistant URL natively; numTaggedPages against numPages; tag index numbering after entries are filtered; and the ordering of tagsFired.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A script compares two export files structurally and prints differences by path, normalising the fields that cannot match (timestamps, groupIds, nonces, page ids, random ids, and the authorization code) so the output is only meaningful divergence
- [ ] #2 Phase one, a single page load with no interaction on one container captured both ways: every difference the script reports is either eliminated in the exporter or recorded in a findings document with the reason it cannot be matched
- [ ] #3 Phase two, a flow with clicks, a navigation, and a consent choice captured both ways, given the same treatment; event ordering, page grouping, and per-event consent state are compared explicitly because they are the most likely to diverge
- [ ] #4 Every difference that is fixed gains a regression test pinning the behaviour, so the exporter cannot drift back
- [ ] #5 The findings document lists the accepted differences with reasons, and the shape signature fixture is regenerated from a native export so it covers the fields the comparison checks
- [ ] #6 The Google tag panel's Source line no longer reads 'Undefined parameter - CONTAINER_ID' when the file is imported, confirmed in the Tag Assistant UI

<!-- AC:END -->
