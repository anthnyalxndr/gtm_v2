---
id: TASK-6
title: Build preview URL from environment parameters
status: Done
assignee: []
created_date: '2026-09-19 04:21'
updated_date: '2026-09-19 17:01'
labels:
  - core
dependencies:
  - TASK-2
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Loading the draft container version without a Google login works through gtm_auth, gtm_preview, and gtm_cookies_win query parameters. The builder must preserve any existing query string on the start URL.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Given a start URL and environment settings, the builder appends gtm_auth, gtm_preview=env-N, and gtm_cookies_win=x
- [ ] #2 Existing query parameters and the fragment on the start URL are preserved
- [ ] #3 The gtm_auth value comes from the resolved scenario environment and never appears in log output

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Delivered by task-13 (feat/debug-feed-capture) on 2026-09-19; the acceptance criteria that still applied are met there.
<!-- SECTION:NOTES:END -->
