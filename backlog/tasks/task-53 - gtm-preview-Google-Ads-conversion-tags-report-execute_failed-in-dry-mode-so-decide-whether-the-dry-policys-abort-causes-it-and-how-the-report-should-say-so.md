---
id: TASK-53
title: >-
  gtm-preview: Google Ads conversion tags report execute_failed in dry mode, so
  decide whether the dry policy's abort causes it and how the report should say
  so
status: To Do
assignee: []
created_date: '2026-10-07 02:47'
labels:
  - gtm-preview
  - report
dependencies: []
priority: medium
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In the first live runs of gtm-preview from this workspace (2026-10-06, www.drsamanthamunson.com, GTM-52ZLPX7 Live, hits dry, two-page contact flow) GTM reported execute_failed for all three Google Ads conversion tags (Contact Page View, Click to Call, Email Link Clicked) while every GA4 tag and the Google tag reported succeeded. The sjpools dry runs on 2026-09-20 showed the same: 3 Ads tags failed, GA4 fine. In the raw session each failure follows the abort of that tag's own conversion requests (www.googleadservices.com/pagead/conversion/N/ and www.google.com/pagead/1p-conversion/N/) by 1 to 33 ms, and the TAG_STARTED record precedes the failure by 27 to 387 ms. The working hypothesis is that the Ads conversion template reports failure when its request does not load, so the dry policy, which aborts every vendor hit in the browser, makes these tags look failed. packages/gtm-preview/AGENTS.md states that the debug stream is unchanged under dry because GTM reports success when tag code finishes, not when the network call lands; that is true of GA4 tags and apparently not of Ads conversion tags. The report's summary counts these as tagsFailed with no indication that the policy may be the cause. Only GA4 has a debug flag, so the hypothesis cannot be tested on a client container without recording real conversions; the test container GTM-WNX8FFXW has no Ads tag today.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The cause is established on the test container GTM-WNX8FFXW: with a Google Ads conversion tag added to its workspace, the same scenario reports the tag failed under hits dry and succeeded under hits debug or live, or the runs show a different cause, and the result is written in this task's notes
- [ ] #2 packages/gtm-preview/AGENTS.md and the hits policy text in scenarios/README.md describe what dry does to Google Ads conversion verdicts, replacing the claim that the debug stream is unchanged
- [ ] #3 A report from a dry run marks a tag whose failure follows the abort of its own hit so a reader can tell it from a tag that failed on its own, with a unit test on captured records from the 2026-10-06 Munson session
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Evidence: packages/gtm-preview/reports/munson-contact.raw.json (local, not committed; 312 records, 21 hits all aborted). Failed tags and the aborted Ads hits that precede each by a few ms are listed in TASK-50's session summary of 2026-10-06. The scenario and driver are scenarios/munson-contact.json and scenarios/flows/munson-contact.mjs.
<!-- SECTION:NOTES:END -->
