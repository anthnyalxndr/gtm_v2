---
id: TASK-50
title: 'gtm-preview lives in this workspace as packages/gtm-preview, with its history'
status: Done
assignee:
  - '@claude'
created_date: '2026-10-06 21:49'
updated_date: '2026-10-07 02:38'
labels:
  - gtm-preview
  - workspace
dependencies: []
priority: high
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
gtm-preview is the headless GTM preview runner (Playwright loads a container's debug build and reports which tags fired and what they sent). It has lived in its own repo at ~/gtm-preview with no remote, consuming @anthnyalxndr/gtm-client from npm. The workspace plan already needs it: TASK-31 runs a verify command after publish and TASK-32 writes a preview workspace per PR, and gtm-preview is the only tool that can run a session against that workspace headlessly. Moving it here removes the publish-then-bump loop between gtm-client and its consumer, gives the code a remote, and puts the verify leg of gtm-as-code in the repo the plan can see. The move must not lower gtm-preview's gate (ESLint, commitlint, CI with secret scan), which the workspace does not have today, so those lift to the workspace root. The two backlogs cannot merge by id without renumbering, so gtm-preview's backlog is retired into a document with an id mapping and its open tasks are recreated here.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 packages/gtm-preview exists and git log on a file inside it shows the commits made in the standalone repo
- [x] #2 The package depends on @anthnyalxndr/gtm-client with workspace:^ and pnpm verify at the root builds, typechecks, lints and tests it alongside the other packages without a Chromium download
- [x] #3 ESLint, commitlint and a GitHub Actions workflow (secret scan, lint, typecheck, test, build) run at the workspace root
- [x] #4 The workspace engines field requires Node 22 and the package's license is Apache-2.0 like the rest of the workspace
- [x] #5 gtm-preview's backlog is retired: a Backlog.md document here lists every task with its final status and new id where one exists, TASK-16 and TASK-17 from that backlog exist as tasks here, and a decision record explains the move
- [x] #6 The workspace README lists the package and the package AGENTS.md commands work from the workspace root
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Branch chore/task-50-package-gtm-preview off main.
2. git subtree add --prefix=packages/gtm-preview /Users/ata/gtm-preview main, so the 63 standalone commits stay reachable.
3. Strip repo-level files from the package that the workspace root owns or replaces: .husky, .github, commitlint.config.mjs, .copier-answers.yml, .cursor, .claude, .mcp.json, .npmrc, .node-version, .gitattributes, .editorconfig, LICENSE (MIT), pnpm-lock.yaml, backlog/. Keep .prettierrc.json (package style differs from root), .gitignore, .env.example, AGENTS.md, CLAUDE.md, docs/, scenarios/, test/.
4. Package.json: name @anthnyalxndr/gtm-preview, license Apache-2.0, gtm-client -> workspace:^, drop husky/commitlint devDeps and the prepare script.
5. Root: engines node >=22 and .node-version; lint script (pnpm -r --if-present lint) folded into verify; commitlint config + devDeps + .husky/commit-msg; .github/workflows/ci.yml (gitleaks, pnpm verify on Node 22) and dependabot; .gitattributes, .editorconfig, .mcp.json lifted from the package; .gitignore gains the package's local-only patterns.
6. pnpm install to rewrite the lockfile; pnpm verify at the root.
7. Backlog: doc 'gtm-preview backlog history' with every task, final status and new id; recreate TASK-16 and TASK-17 here with their notes; decision record for the move; README table row; package AGENTS.md commands and backlog pointer updated.
8. Commit, push, open a PR against main. Leave ~/gtm-preview untouched for the user to archive after merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
git subtree add was tried first and dropped: the 63 commits were reachable through the merge's second parent, but git log and git log --follow on any file inside packages/gtm-preview stopped at the merge. Rewrote a scratch clone with git filter-repo --to-subdirectory-filter packages/gtm-preview and merged it with --allow-unrelated-histories instead; git log -- packages/gtm-preview/package.json now shows 5 commits from the standalone repo. pnpm verify at the root (build, typecheck, lint, test over five packages) passed in 14s with no browser download; the only Chromium-driving test is skipped unless its auth variable is set. commitlint checked from the new commit-msg hook: rejects 'bad message', accepts 'chore(workspace): fine'. The two untracked design docs that disappeared from git status during the work (docs/superpowers/*/2026-10-06-github-issues-task-workflow*) were moved to ~/Projects/gh-task by another session, not by this task.

Merged to main from PR #49 on 2026-10-06. The GitHub Actions workflow added in this PR did not register a run on the pull request; its first run will be on main or the next PR.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
gtm-preview is packages/gtm-preview with its full history (filter-repo rewrite merged with unrelated histories), depending on gtm-client via workspace:^. Root gains ESLint in verify, commitlint (commit-msg hook), dependabot and a CI workflow with secret scan on Node 22; package license is Apache-2.0. Its backlog is retired into doc-4 with the id mapping, TASK-16 and TASK-17 recreated as TASK-51 and TASK-52, and decision-13 records the move. Verified with pnpm verify at the root and a commitlint check. The standalone ~/gtm-preview is untouched for the owner to archive after merge.
<!-- SECTION:FINAL_SUMMARY:END -->
