---
id: TASK-22.5
title: 'Order messages by arrival, and match the abstractModel that follows'
status: Done
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-25 09:39'
labels:
  - export
dependencies:
  - TASK-22.1
parent_task_id: TASK-22
priority: medium
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A native export numbers messages in the order Tag Assistant received them, not by GTM event id. In the captured page view gtm.js is index 5 while gtm.dom is 12 and gtm.load is 13, because they fired late on that page; this tool ordered by capture time and put gtm.dom at 3. The ordering matters beyond the index, because abstractModel accumulates dataLayer state and its contents depend on where in the sequence a message sits, so part of the abstractModel difference is this and not a separate problem. Settle how much of it is ordering before treating the rest as its own gap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 How much of the abstractModel difference the ordering accounted for is measured and recorded, and whatever remains is either fixed or written up as its own finding
- [x] #2 Messages are numbered in the order the records arrived, with the feed's own push order as the tie break rather than an event id, and the ordering difference against each captured native export is measured and attributed

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Ordering was already by arrival; the tie break is now the feed's own push order rather than an event id, which a gtag command and the event it raises do not share and which restarts on every page load. That changed no output in either captured session but the id was the wrong key. The orders still differ from the native files because the feeds differ: in the headless run GTM raised gtm.dom and gtm.load before gtm.js and the site's consent default ran before GTM booted. All 33 contact-flow messages and all 13 page-view messages pair with one of ours by name; 3 and 1 respectively sit at the same position. The abstractModel difference is entirely that: every key missing from one of our models is one a message sitting later in the native order had already accumulated, shown message by message in the research doc. There is no separate abstractModel defect. Settling it needs a native capture of the same page load as one of ours.
<!-- SECTION:FINAL_SUMMARY:END -->
