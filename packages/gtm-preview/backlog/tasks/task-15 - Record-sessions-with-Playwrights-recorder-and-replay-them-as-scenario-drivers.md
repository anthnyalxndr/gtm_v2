---
id: TASK-15
title: Record sessions with Playwright's recorder and replay them as scenario drivers
status: To Do
assignee: []
created_date: '2026-09-19 18:50'
labels:
  - cli
  - scenario
dependencies:
  - TASK-13
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

JSON steps cover simple flows but real sessions are easier to record than to write. Playwright's recorder (playwright codegen, and the Record button in the Playwright Inspector that page.pause() opens) emits page calls such as page.getByRole(...).click(). Our runner installs its routes and init script before the first navigation, so any code that drives the same page object records the debug feed automatically. Two additions make recording first-class: a scenario may name a driver module instead of steps, and a record command opens the instrumented page headed and paused so the person clicks around while the Inspector generates the driver code and the session itself produces a report and Tag Assistant file. The driver is arbitrary code the CLI executes, which is acceptable for a local tool and must be stated in the docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 The scenario schema accepts an optional driver path (a module whose default export is an async function receiving the Playwright page) as an alternative to steps; a scenario with both is rejected with a clear message
- [ ] #2 run executes the driver against the instrumented page after the start URL loads, with the same routes, hit policy, and record capture as JSON steps, and a driver that throws exits non-zero naming the driver file
- [ ] #3 A driver written by pasting the body of playwright codegen output (getByRole, getByText, fill, click, waitForURL) runs unchanged against the fixture site in an integration test
- [ ] #4 gtm-preview record <scenario.json> opens the page headed, instruments it, calls page.pause() so the Inspector's Record button is available, and on resume writes the report and, when requested, the raw session and Tag Assistant file for the recorded session
- [ ] #5 The docs explain the record flow: record, copy the generated code from the Inspector into a driver file, reference it from the scenario, replay headless; and state that drivers are executed code

<!-- AC:END -->
