---
id: TASK-4
title: Capture dataLayer pushes from before first script
status: Done
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 17:01'
labels:
  - capture
dependencies:
  - TASK-1
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The runner must see every dataLayer event, including pushes that happen before GTM loads and pushes after same-origin navigation. Playwright addInitScript installs a wrapper before any page script runs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Against the fixture site, all events pushed on the home page are captured in order, including the pre-snippet push
- [ ] #2 Each captured event carries a timestamp and the page URL it was pushed on
- [ ] #3 After clicking the fixture link to the second page, the second page's events are captured too
- [ ] #4 The capture code touching the Page returns plain serialisable objects only

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Delivered by task-13 (feat/debug-feed-capture) on 2026-09-19; the acceptance criteria that still applied are met there.
<!-- SECTION:NOTES:END -->
