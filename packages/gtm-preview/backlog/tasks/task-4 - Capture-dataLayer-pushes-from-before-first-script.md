---
id: TASK-4
title: Capture dataLayer pushes from before first script
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 04:21'
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
