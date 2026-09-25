---
id: TASK-27
title: gtm-client authenticates headlessly for CI
status: Review
assignee:
  - '@claude'
created_date: '2026-09-17 15:57'
updated_date: '2026-09-25 10:23'
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
- [x] #1 With a service account key file configured, the client authenticates without a browser and can list accounts
- [x] #2 With Application Default Credentials present, the client authenticates without a browser
- [x] #3 With a refresh token in an environment variable, the client authenticates without a browser
- [x] #4 In a non-interactive terminal with no credentials, the client fails with a message naming the three options instead of opening a browser
- [x] #5 Unit tests cover credential selection order and the non-interactive failure
- [x] #6 README documents each option and the GTM permissions the service account needs
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. client.ts: selectCredentials(options, env) picks, in order, a service account key file (serviceAccountKeyPath or GTM_SERVICE_ACCOUNT_KEY), Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS or useAdc), a refresh token (refreshToken or GTM_REFRESH_TOKEN with client id and secret from options, GTM_CLIENT_ID/GTM_CLIENT_SECRET or client_secrets.json), else the user OAuth flow; the user flow reuses a stored token headlessly and refuses to open a browser when not interactive, naming the three options. 2. A createService option so tests can capture the auth client and inject the fake service. 3. Tests for selection order, each headless client type, and the non-interactive failure. 4. gtm-client README: each option and the Tag Manager permissions a service account needs; gtm-apply README pointer. Branch cut from docs/task-23-rename-identity; PR base main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-25: selectCredentials(options, env) orders service account key (serviceAccountKeyPath / GTM_SERVICE_ACCOUNT_KEY, a JWT with the Tag Manager scopes), ADC (useAdc / GOOGLE_APPLICATION_CREDENTIALS, a GoogleAuth), refresh token (refreshToken / GTM_REFRESH_TOKEN with client id and secret from options, GTM_CLIENT_ID/GTM_CLIENT_SECRET or client_secrets.json, a UserRefreshClient), then the user flow, which reuses a stored token headlessly and throws HEADLESS_HELP naming the three options when not interactive (interactive option, else stdin and stdout TTY). createService option lets tests capture the auth client and inject the fake service. Not verified live against a real service account; the JWT and GoogleAuth objects are built the way googleapis documents. Branch cut from docs/task-23-rename-identity; merge after PRs #19 to #24.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
gtm-client authenticates headlessly: a service account key file, Application Default Credentials, or a refresh token, chosen in that order before the user OAuth flow; the user flow reuses a stored token without a terminal and, with none, fails naming the three options instead of opening a browser. Six new tests cover selection order, each client type and the failure. Both READMEs document the options and the Tag Manager permissions a service account needs. pnpm verify green: 27 + 182 + 6 tests.
<!-- SECTION:FINAL_SUMMARY:END -->
