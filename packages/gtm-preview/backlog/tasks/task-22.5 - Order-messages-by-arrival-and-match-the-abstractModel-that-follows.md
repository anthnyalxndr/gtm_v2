---
id: TASK-22.5
title: 'Order messages by arrival, and match the abstractModel that follows'
status: To Do
assignee: []
created_date: '2026-09-24 21:10'
updated_date: '2026-09-24 21:10'
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

- [ ] #1 Message ordering matches the native export for both captured sessions, page view and contact flow
- [ ] #2 How much of the abstractModel difference the ordering accounted for is measured and recorded, and whatever remains is either fixed or written up as its own finding

<!-- AC:END -->
