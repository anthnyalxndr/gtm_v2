---
id: decision-13
title: >-
  gtm-preview is a package in this workspace, imported with its history, and its
  backlog is retired into a document
date: '2026-10-06 21:55'
status: Accepted
---
## Context

gtm-preview runs a Google Tag Manager preview session with no person in the loop: Playwright loads the container's debug build and the tool reports which dataLayer events happened, which tags fired, and what each sent. From 2026-09-18 it was a standalone repository at ~/gtm-preview, scaffolded from copier-templates, with 63 commits and no remote. It consumed @anthnyalxndr/gtm-client from npm.

On 2026-10-06 the owner asked whether it belonged in this workspace. Three facts decided it. The repository had no remote, so the code existed on one machine. This workspace's plan already needs the tool: TASK-31 runs a verify command after publish and TASK-32 writes a preview workspace per pull request, and gtm-preview is the only tool here that can run a session against that workspace headlessly. And every change to gtm-client's testing fake required a publish, a version bump in gtm-preview, and a second test run, which is the cycle decision-11 refused for gtm-as-code.

Two things argued against. The workspace's gate was weaker than gtm-preview's: Prettier and `pnpm verify` in a pre-commit hook, no ESLint, no commitlint, no CI. And the two Backlog.md backlogs both number tasks from 1, while ids are never renumbered.

## Decision

- gtm-preview is `packages/gtm-preview` (`@anthnyalxndr/gtm-preview`, private, bin `gtm-preview`). It depends on gtm-client with `workspace:^`.
- The history is imported, not copied. The standalone repository was rewritten with `git filter-repo --to-subdirectory-filter packages/gtm-preview` and merged with `--allow-unrelated-histories`, so every one of its commits already lives under the package path and `git log` and `git blame` on any file continue past the merge. `git subtree add` was tried first and rejected because per-file history stopped at the merge commit.
- The gate rises to meet the package rather than the package dropping to the gate. ESLint runs through `pnpm -r run lint` inside root `verify`; lint-staged runs the package's ESLint on its staged files; commitlint runs from a `commit-msg` hook; a GitHub Actions workflow runs the secret scan and `pnpm verify` on Node 22, which is now the workspace's floor. The package keeps its own Prettier style through its nested config.
- The unit suite runs with no browser. The one integration test that drives Chromium is skipped unless its auth environment variable is set, so neither the hook nor CI downloads a browser.
- The gtm-preview backlog is retired into doc-4, which lists every task with its final status. Its two open tasks were recreated here as TASK-51 and TASK-52 with their criteria and notes. Deferred tasks were not recreated; doc-4 says why each was deferred so one can be recreated if picked up. The files remain in the imported history.
- Repository-level files move to the root where the root did not have them (.editorconfig, .gitattributes, .mcp.json, .node-version, .npmrc, commitlint config, dependabot) and are deleted where it did (.husky, .claude, .cursor, LICENSE, lockfile, .copier-answers.yml). The package's license becomes Apache-2.0 with the rest of the workspace. The package's AGENTS.md stays beside it and remains the record of how the debug feed works.
- The standalone repository at ~/gtm-preview is left in place for the owner to archive after this merges. Nothing there is deleted by the move.

## Consequences

`pnpm verify` builds and tests a fifth package and now lints; it took 14 seconds on 2026-10-06. Every commit in the workspace must pass commitlint, which the other packages' history already did by convention. `copier update` no longer applies to gtm-preview; template improvements reach it by hand. The workspace's Plan (doc-2) should pick up the human items from the old Plan that doc-4 records. A GitHub Actions workflow runs on every pull request for the first time in this repository; the workspace's npm publish flow is unchanged because gtm-preview is private.
