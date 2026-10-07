---
id: TASK-54
title: >-
  gtm-client: a stored token minted with narrower scopes is reused for calls
  that need wider ones and fails with 403 instead of re-authorizing
status: To Do
assignee: []
created_date: '2026-10-07 03:18'
labels:
  - gtm-client
  - auth
dependencies: []
priority: medium
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GtmClient stores access_token, refresh_token, token_type and expiry_date in ~/.config/gtm-apply/token.json and never the scopes the token was granted. loadCredentials reuses whatever is on disk. gtm-preview requests only tagmanager.readonly (src/auth/environment-codes.ts, 'the narrowest scope that works'), so when the shared token expired on 2026-10-06 and gtm-preview drove the re-authorization, the new token carried only that scope. gtm-apply, which constructs the client with TAG_MANAGER_SCOPES, will load that token without complaint and its write calls (workspaces, versions, publish) will fail with 403 insufficient permissions. Nothing points the user at re-authorizing, unlike invalid_grant, which describeAuthError explains. The same happens in reverse order harmlessly (a full-scope token satisfies a readonly caller), so the problem only shows when the narrower caller re-authorizes first. Observed 2026-10-06 while testing gtm-preview's resolver path after the move into this workspace (TASK-50).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The stored credentials record the scopes they were granted, and a client constructed with scopes the stored token does not cover runs the browser flow again, requesting the union, instead of reusing the token
- [ ] #2 A 403 with insufficient permissions from the Tag Manager API is described to the user the way invalid_grant is, naming the token path and the missing scope
- [ ] #3 Unit tests cover reuse when scopes are covered, re-authorization when they are not, and a stored token with no scope record from before this change
<!-- AC:END -->
