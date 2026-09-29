---
id: TASK-31
title: Publish can be followed by a verification step
status: Done
assignee:
  - '@claude'
created_date: '2026-09-17 15:57'
updated_date: '2026-09-29 00:30'
labels:
  - gtm-apply
  - gtm-as-code
milestone: m-0
dependencies: []
documentation:
  - backlog/docs/doc-1 - GTM-as-code-plan.md
priority: low
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Publishing proves that a version is live, not that tags fire. Add a post-publish step: the tool confirms the live version id equals the version it just created, and can run a user-supplied command (for example a gtm_audit run against the site) whose nonzero exit fails the job. Keep the built-in check small; the runtime check belongs to the audit tool.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After --publish the tool reads the live version and fails if its id differs from the version just created
- [x] #2 A --verify <command> option runs the command after a successful publish and propagates its exit code
- [x] #3 Unit tests cover the id check and the command exit propagation
- [x] #4 README shows an example wiring gtm_audit as the verify command
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. executePlan: after versions.publish, read versions.live for the container and throw unless its containerVersionId is the created version's.
2. CLI: --verify <command> (needs --publish) runs after a successful publish through runShellCommand (shell, inherited stdio) and returns its exit code; runCli takes an injectable runner for tests. Both the spec and the plan apply paths use it.
3. Tests: live check passes and fails, verify exit propagation, no run on dry run, --verify without --publish, and the real shell runner on exit 3 and true.
4. README: a section on checking a publish with a gtm_audit example.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Acceptance criteria unchanged by the plan. The live check sits in executePlan, so library callers get it too, not only the CLI. The README example runs gtm_audit as 'pnpm --dir ../gtm_audit dev audit -c <config>'; whether it exits non-zero on findings is gtm_audit's behavior and is not asserted here. pnpm verify: 19 + 23 + 163 + 23.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
A publish is now checked: executePlan confirms the live version is the one it just created and fails otherwise, and gtm-apply apply --publish --verify <command> runs a command afterwards (for example a gtm_audit run) and exits with its code. --verify needs --publish and never runs on a dry run. Tested with the gtm-client fake and the real shell runner; the README shows the gtm_audit wiring.
<!-- SECTION:FINAL_SUMMARY:END -->
