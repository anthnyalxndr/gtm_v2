---
id: TASK-5
title: Capture tag hits on the wire
status: To Do
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 04:21'
labels:
  - capture
dependencies:
  - TASK-1
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Observed hits are the ground truth. A request listener matches outbound requests against known tag endpoint patterns and parses payloads into key-value pairs. The matcher is a pure function so it is unit tested without a browser.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 GA4 /g/collect, Google Ads conversion, and Floodlight requests from the fixture site are recorded as hits with vendor, URL, and parsed parameters
- [ ] #2 Requests that match no pattern are ignored
- [ ] #3 The URL matcher and payload parser have unit tests that run with no browser
- [ ] #4 A hit records the page URL and timestamp at which it was sent

<!-- AC:END -->
