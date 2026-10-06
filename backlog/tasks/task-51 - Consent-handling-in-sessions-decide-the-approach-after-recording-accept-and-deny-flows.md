---
id: TASK-51
title: >-
  Consent handling in sessions: decide the approach after recording accept and
  deny flows
status: To Do
assignee: []
created_date: '2026-10-06 21:55'
labels:
  - gtm-preview
  - consent
  - scenario
dependencies: []
priority: medium
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
NOTHING IS DECIDED YET. This task exists so the question is tracked, not because an approach was chosen. The research (packages/gtm-preview/docs/spikes/consent/, 2026-09-19) established two workable routes and their trade-offs. Injecting Consent Mode signals ourselves is deterministic, needs no rule library, and ignores region gating, but does not test the site's own consent wiring and would show tags a real consenting visitor never triggers (the Munson banner keeps ad_personalization denied by design). Clicking the real banner (DuckDuckGo autoconsent proved this headless on a Squarespace banner, and GTM recorded the resulting consent update) validates the CMP and handles CMPs that block scripts outright, but depends on rules and on the region Google assigns the browser. Proposed way to reach a decision cheaply: use gtm-preview's record command to capture a few short sessions on a client site, one that clicks accept and one that clicks deny, and keep the generated code as reusable consent driver snippets. Those snippets can then be composed with tag-test recordings (consent snippet first, then the flow under test) so a scenario states which consent path it exercises. Whether injection is also offered, and which mode is the default, is decided after those sessions and recorded here and in an ADR. Carried over from the gtm-preview backlog (its TASK-16, created 2026-09-19) when the package joined this workspace (TASK-50); its dependency there, TASK-15 record and replay, is done.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two recorded driver snippets exist for at least one client site's banner, one accepting and one denying, saved under packages/gtm-preview/scenarios/flows/consent/ and runnable through the driver mechanism
- [ ] #2 A scenario can compose a consent snippet with a separately recorded tag-test flow (mechanism to be chosen: driver array, an import in the flow, or a scenario field), with an integration test showing the consent update appears in GTM's records before the flow's events
- [ ] #3 The report and Tag Assistant export state which consent path a session used (none, recorded accept, recorded deny, or injected if that mode is added), so an injected update can never be mistaken for a recorded click
- [ ] #4 The decision on the default mode and on whether signal injection is offered is written as an ADR that cites the recorded sessions, and this task's notes say the question was open until then
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Status of the decision as of 2026-09-19: open. Neither injection nor banner clicking has been chosen as the default. The spike scripts and their README under docs/spikes/consent/ are the only artefacts so far; @duckduckgo/autoconsent is installed but unused by product code. The contact-flow driver (scenarios/flows) already clicks Accept All on a Usercentrics banner, so half the recording exists; the deny half and the decision do not.
<!-- SECTION:NOTES:END -->
