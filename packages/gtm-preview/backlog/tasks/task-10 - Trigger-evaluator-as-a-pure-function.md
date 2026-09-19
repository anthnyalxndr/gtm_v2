---
id: TASK-10
title: Trigger evaluator as a pure function
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 04:21'
labels:
  - predict
dependencies:
  - TASK-9
priority: medium
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Predict which tags GTM should fire for an event by evaluating trigger conditions against the event and resolved variable values. No browser, no network. This is where most unit tests belong.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Custom Event, Page View, DOM Ready, Window Loaded, Click, and Link Click trigger types are evaluated
- [ ] #2 Filter operators equals, contains, starts with, ends with, matches regex, and their negations are supported
- [ ] #3 Blocking triggers suppress a tag whose firing trigger matched
- [ ] #4 Fixtures captured from at least one real container drive the tests
- [ ] #5 Output labels every result as predicted, never as fired

<!-- AC:END -->
