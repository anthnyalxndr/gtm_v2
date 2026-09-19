---
id: TASK-15
title: Record sessions with Playwright's recorder and replay them as scenario drivers
status: Done
assignee: []
created_date: '2026-09-19 18:50'
updated_date: '2026-09-19 19:52'
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

- [x] #1 The scenario schema accepts an optional driver path (a module whose default export is an async function receiving the Playwright page) as an alternative to steps; a scenario with both is rejected with a clear message
- [x] #2 run executes the driver against the instrumented page after the start URL loads, with the same routes, hit policy, and record capture as JSON steps, and a driver that throws exits non-zero naming the driver file
- [x] #3 A driver written by pasting the body of playwright codegen output (getByRole, getByText, fill, click, waitForURL) runs unchanged against the fixture site in an integration test
- [x] #4 gtm-preview record <scenario.json> opens the page headed, instruments it, calls page.pause() so the Inspector's Record button is available, and on resume writes the report and, when requested, the raw session and Tag Assistant file for the recorded session
- [x] #5 The docs explain the record flow: record, copy the generated code from the Inspector into a driver file, reference it from the scenario, replay headless; and state that drivers are executed code

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Schema: optional driver path (relative to the scenario file), exclusive with steps.
2. Driver loader: dynamic import, default export must be a function; clear errors.
3. Runner: pause option for record; driver executes after start URL loads with a ctx exposing waitForEvent.
4. CLI: record command sharing run's output flags.
5. Tests: schema, loader, and a gated integration test with a codegen-shaped driver against the fixture site.
6. Docs: scenarios/README and AGENTS.md.

<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Scenario gains an optional driver path (exclusive with steps), resolved relative to the scenario file. src/session/driver.ts loads the module, checks the default export, and wraps failures in DriverError naming the file. run executes the driver after the start URL loads with ctx.waitForEvent; record runs headed and calls page.pause() so the Inspector's Record button is available, then writes the usual outputs. Records now stream to Node through an exposed binding, which the two-page driver test exposed as necessary: reading the page's array at the end lost everything before a navigation. Integration tests run a codegen-shaped driver unchanged across both fixture pages and check the throwing case. scenarios/README.md documents the record flow and that drivers are executed code.
<!-- SECTION:FINAL_SUMMARY:END -->
