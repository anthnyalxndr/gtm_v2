---
id: TASK-36
title: >-
  gtm-as-code scaffolds an account repo and imports its containers in one
  command
status: To Do
assignee: []
created_date: '2026-09-23 21:28'
labels:
  - gtm-as-code
milestone: m-0
dependencies:
  - TASK-35
  - TASK-30
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: high
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A new workspace package, packages/gtm-as-code (@anthnyalxndr/gtm-as-code, bin gtm), owns the multi-container repo workflow on top of gtm-apply's single-container engine (decision-11; design in docs/superpowers/specs/2026-09-23-gtm-as-code-package-design.md). gtm init <dir> --account <id>, run through pnpm dlx before the repo exists, writes the repo shell from files bundled under the package's templates/ directory (package.json pinning gtm-apply and gtm-web-recipes, pnpm scripts, a husky pre-commit running prettier and verify, .prettierrc, a .gitignore that excludes credentials and tokens, a README, the CI workflows TASK-32 defines, and an example plan.ts and custom.ts), then imports every chosen container with gtm-apply pull (TASK-35) into gtm/containers/<publicId>/, writes the repo config file in the shape TASK-30 defines with the account id and every managed container, runs pnpm install and git init, and makes the import commit.

It prompts for OAuth when no token exists and lists the account's containers so the user picks which to manage; --all takes every container and is required in a non-interactive terminal. The base layer is bundled rather than delegated to copier-templates so a client engineer with only Node can run it; TASK-38 keeps the bundle honest against the copier base.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm dlx @anthnyalxndr/gtm-as-code init acme-gtm --account <id> --all on an empty path produces a git repo with one import commit, a config file listing the account and every managed container, and gtm/containers/<publicId>/ holding spec.json, snapshot.json and container.json for each
- [ ] #2 init refuses to run on a non-empty directory and on a path inside an existing git work tree, naming the reason
- [ ] #3 Without --all, init lists the account's containers and asks which to manage; in a non-interactive terminal it exits 1 and names --all and --container as the options
- [ ] #4 Scaffold files come from the package's templates/ directory; a test renders the scaffold into a temp directory against the fake service and checks the file set, that no credential or token file is written, and that .gitignore excludes them
- [ ] #5 pnpm verify passes inside a generated repo, exercised by a test that links the workspace packages into the scaffold
- [ ] #6 The package has a README, the root README lists it, and it builds and tests with pnpm -r build and pnpm -r test
<!-- AC:END -->
