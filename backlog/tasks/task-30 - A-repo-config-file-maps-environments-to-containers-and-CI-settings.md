---
id: TASK-30
title: A repo config file maps environments to containers and CI settings
status: To Do
assignee: []
created_date: '2026-09-17 15:57'
updated_date: '2026-09-23 21:29'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: medium
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every command takes --container and --workspace flags. A repo managing containers needs one place that says which container is staging and which is prod, the spec file for each, the workspace naming convention, whether prune is required, and policy configuration. Add a config file (gtm.config.ts or json, name to be chosen) that the CLI reads so commands can take --env prod instead of raw ids. TASK-19's account snapshot can consume the same file later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A config file declares named environments, each with a container public id and a spec path, plus defaults for workspace name, prune, and policy
- [ ] #2 apply, plan and export accept --env <name> and resolve container and spec from the config
- [ ] #3 Explicit --container and --spec flags override the config
- [ ] #4 A missing or invalid config produces an error that names the file and the field
- [ ] #5 Unit tests cover resolution, override, and validation errors
- [ ] #6 README documents the file with an example that has staging and prod
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-23: the account repo that gtm init (TASK-36) scaffolds writes this config file with the account id and one entry per managed container (gtm/containers/<publicId>/), and the gtm loop commands (TASK-37) read it. Shape proposed in docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md, section 'Repo config file'.
<!-- SECTION:NOTES:END -->
