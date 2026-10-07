---
id: decision-4
title: >-
  Version only when something changed; workspaces by name; plan from the latest
  version
date: '2026-09-10 17:06'
status: accepted
---

## Context

Live verification on 2026-09-09 established two Tag Manager behaviors: creating a version deletes the workspace it came from, and a new workspace branches from the container's latest version, not the live one. The original design created a version on every apply and assumed a missing workspace meant an empty container, which made a second apply plan every entity as a create.

## Decision

When the target workspace does not exist, the planner reads the latest version (`version_headers.latest` then `versions.get`) as the existing state, since that is what the new workspace will contain and entity ids are stable across versions. A version is created only when some entity operation is a create or update, or when publish is requested; an unchanged run leaves the workspace in place. Workspaces are addressed by name, never by id. The default workspace is never written to. `export` reads the latest version by default, with `--live` and `--workspace` as alternatives, because a library container is rarely published.

## Consequences

Re-applies are idempotent against the real API (verified: second apply reports all `[=]` and creates no version). No-op runs do not consume versions or delete workspaces. Preview in the UI requires opening a fresh workspace after an apply that cut a version. The `folders.entities` endpoint returned 404 for an existing folder and is not used; membership is read from `parentFolderId` on list calls.
