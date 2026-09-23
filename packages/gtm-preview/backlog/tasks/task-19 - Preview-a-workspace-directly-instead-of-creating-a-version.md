---
id: TASK-19
title: Preview a workspace directly instead of creating a version
status: To Do
assignee: []
created_date: '2026-09-23 20:02'
labels:
  - auth
  - capture
dependencies:
  - TASK-9
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

run --version-from-workspace creates a container version to make unpublished work reachable through the Latest environment. Testing on 2026-09-23 showed that is unnecessary and worse than the alternative. The Tag Manager API's workspaces.quick_preview creates (or reuses) an environment of type workspace pointing at the workspace itself, with its own authorization code, and creates no version. Verified on GTM-WNX8FFXW: the workspace held G-GVG5MC89MH while version 3 held G-PLACEHOLDER; environment 8 (type workspace) served G-GVG5MC89MH, Latest served G-PLACEHOLDER, and the version list stayed at 1, 2, 3 throughout. Calling quick_preview twice reused environment 8 with the same code rather than creating a second one. The environment is a snapshot, not a live pointer: after editing the workspace it kept serving the previous content until quick_preview was called again, which refreshed it. So the tool should quick-preview the named workspace immediately before the run and use that environment. This also avoids two side effects of version creation: burning a version number, and GTM replacing the workspace with a fresh one of the same name (its id changes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A scenario or flag names a workspace; the runner calls workspaces.quick_preview for it immediately before launching the browser and uses the resulting workspace-type environment's code, so unsaved workspace changes are what the session exercises
- [ ] #2 The quick-preview environment is looked up by its workspaceId rather than by name, since GTM names it Preview Environment <n> <timestamp>, and repeated runs reuse it without creating more environments
- [ ] #3 Its code is cached like any other environment code and refreshed on a 403, and the scope requested is the narrowest that works (tagmanager.edit.containers was enough in testing; readonly is not, because quick_preview writes)
- [ ] #4 --version-from-workspace is removed, or kept only with a note in the help text saying it burns a version and replaces the workspace, and the docs explain when each is right
- [ ] #5 Unit tests cover the quick-preview path against createFakeService, including the reuse of an existing workspace environment; the fake gains quick_preview if it lacks it

<!-- AC:END -->
