---
id: TASK-30
title: A repo config file maps environments to containers and CI settings
status: Review
assignee:
  - '@claude'
created_date: '2026-09-17 15:57'
updated_date: '2026-09-25 10:18'
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
- [x] #1 A config file declares named environments, each with a container public id and a spec path, plus defaults for workspace name, prune, and policy
- [x] #2 apply, plan and export accept --env <name> and resolve container and spec from the config
- [x] #3 Explicit --container and --spec flags override the config
- [x] #4 A missing or invalid config produces an error that names the file and the field
- [x] #5 Unit tests cover resolution, override, and validation errors
- [x] #6 README documents the file with an example that has staging and prod
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. src/config.ts: RepoConfig type (account, containers keyed by slug with publicId, env, dir, spec; defaults.workspace template, prune, policy), findConfigFile, loadRepoConfig (JSON or a module via loadSpecFile), validation errors naming file and field, resolveEnv (env value first, then slug key), renderWorkspace with ${slug} ${env} ${date} ${commit}. 2. CLI: --config and --env on apply, export, snapshot and pull; explicit --container, --spec, --workspace win. 3. Tests: config.test.ts (resolution, override, validation) and cli.test.ts (apply --env --dry-run through a temp config). 4. README section with a staging and prod example. Branch cut from feat/task-18-serving-environment; PR base main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-23: the account repo that gtm init (TASK-36) scaffolds writes this config file with the account id and one entry per managed container (gtm/containers/<publicId>/), and the gtm loop commands (TASK-37) read it. Shape proposed in docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md, section 'Repo config file'.

2026-09-24: the account repo keys config entries by a human slug (directory gtm/containers/<slug>/), each entry carrying publicId and optional env and dir; see the spec's 'Repo config file' and 'Directories are named by a slug' sections.

2026-09-25: src/config.ts (gtm.config.json or a gtm.config.{ts,js,mjs} module): entries keyed by slug with publicId, env, dir, spec; defaults.workspace template with ${slug} ${env} ${commit} ${date}, prune and policy reserved; validation errors name file and field; resolveEnv matches env then slug. --env and --config on every command through withRepoConfig: container for all, spec and rendered workspace for apply, out for pull; explicit flags win. AC #2 names a plan command, which does not exist yet (TASK-28); export, snapshot and pull are wired instead, and plan should read the same helper when it lands. Branch cut from feat/task-18-serving-environment; merge after PRs #19 to #22.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
A repo config file (gtm.config.json or module) declares containers keyed by slug with public id, env, dir and spec, plus defaults for the workspace template, prune and policy. Every command takes --env <name> (env value or slug) and --config <file>; apply also gets its spec and a rendered workspace name, pull its output directory; explicit flags override. Errors name the file and field. README documents it with a staging and prod example. pnpm verify green: 21 + 182 + 6 tests.
<!-- SECTION:FINAL_SUMMARY:END -->
