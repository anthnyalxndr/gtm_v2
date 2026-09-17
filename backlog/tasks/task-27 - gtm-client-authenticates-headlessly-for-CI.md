---
id: TASK-27
title: gtm-client authenticates headlessly for CI
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
labels:
  - gtm-client
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
gtm-client only knows the user OAuth flow that opens a browser and stores a token under ~/.config/gtm-apply. CI cannot run that. Support a service account (a key file path, or Application Default Credentials through GOOGLE_APPLICATION_CREDENTIALS) added as a GTM user with the needed permissions, and a refresh token supplied by environment variable for cases where a service account is not allowed. The client must never open a browser when either is present, and must fail with a clear message instead of a browser prompt when it detects a non-interactive terminal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With a service account key file configured, the client authenticates without a browser and can list accounts
- [ ] #2 With Application Default Credentials present, the client authenticates without a browser
- [ ] #3 With a refresh token in an environment variable, the client authenticates without a browser
- [ ] #4 In a non-interactive terminal with no credentials, the client fails with a message naming the three options instead of opening a browser
- [ ] #5 Unit tests cover credential selection order and the non-interactive failure
- [ ] #6 README documents each option and the GTM permissions the service account needs
<!-- AC:END -->
