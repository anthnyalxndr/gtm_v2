# Backlog.md migration

Each line below records one step as `gh task migrate` took it, written the moment it happened.
`gh task migrate --resume` reads these lines and skips every task, initiative and step listed here.

- initiative GTM as code -> anthnyalxndr/gtm_v2-tasks#1
- initiative Recipe libraries -> anthnyalxndr/gtm_v2-tasks#2
- initiative Headless preview sessions -> anthnyalxndr/gtm_v2-tasks#3
- task TASK-9 -> anthnyalxndr/gtm_v2#53
- task TASK-10 -> anthnyalxndr/gtm_v2#54
- task TASK-11 -> anthnyalxndr/gtm_v2#55
- task TASK-18 -> anthnyalxndr/gtm_v2#56
- task TASK-19 -> anthnyalxndr/gtm_v2#57
- task TASK-23 -> anthnyalxndr/gtm_v2#58
- task TASK-24 -> anthnyalxndr/gtm_v2#59
- task TASK-25 -> anthnyalxndr/gtm_v2#60
- task TASK-27 -> anthnyalxndr/gtm_v2#61
- task TASK-28 -> anthnyalxndr/gtm_v2#62
- task TASK-29 -> anthnyalxndr/gtm_v2#63
- task TASK-30 -> anthnyalxndr/gtm_v2#64
- task TASK-32 -> anthnyalxndr/gtm_v2#65
- task TASK-34 -> anthnyalxndr/gtm_v2#66
- task TASK-35 -> anthnyalxndr/gtm_v2#67
- task TASK-36 -> anthnyalxndr/gtm_v2#68
- task TASK-37 -> anthnyalxndr/gtm_v2#69
- task TASK-38 -> anthnyalxndr/gtm_v2#70
- task TASK-46 -> anthnyalxndr/gtm_v2#71
- task TASK-47 -> anthnyalxndr/gtm_v2#72
- task TASK-49 -> anthnyalxndr/gtm_v2#73
- task TASK-51 -> anthnyalxndr/gtm_v2#74
- task TASK-52 -> anthnyalxndr/gtm_v2#75
- task TASK-53 -> anthnyalxndr/gtm_v2#76
- task TASK-54 -> anthnyalxndr/gtm_v2#77
- step blocked-by TASK-24 TASK-23
- step blocked-by TASK-25 TASK-10
- step blocked-by TASK-25 TASK-24
- step blocked-by TASK-28 TASK-25
- step blocked-by TASK-29 TASK-28
- step blocked-by TASK-32 TASK-27
- step blocked-by TASK-32 TASK-25
- step blocked-by TASK-32 TASK-28
- step blocked-by TASK-32 TASK-29
- step blocked-by TASK-32 TASK-30
- step blocked-by TASK-32 TASK-36
- step blocked-by TASK-35 TASK-34
- step blocked-by TASK-35 TASK-19
- step blocked-by TASK-36 TASK-35
- step blocked-by TASK-36 TASK-30
- step blocked-by TASK-37 TASK-36
- step blocked-by TASK-37 TASK-28
- step blocked-by TASK-38 TASK-36
- step blocked-by TASK-46 TASK-30
- step blocked-by TASK-46 TASK-11
- step pr 25 TASK-27
- step pr 24 TASK-23
- step pr 23 TASK-30
- step pr 22 TASK-18
- step pr 21 TASK-35
- step pr 20 TASK-19
- step pr 19 TASK-34
- step pr 16 TASK-9
- step pr 14 TASK-10

## Report

Created 25 issues in anthnyalxndr/gtm_v2; initiatives in anthnyalxndr/gtm_v2-tasks; skipped 23 Done or Cancelled tasks.

| Initiative | Issue |
| --- | --- |
| GTM as code | anthnyalxndr/gtm_v2-tasks#1 |
| Recipe libraries | anthnyalxndr/gtm_v2-tasks#2 |
| Headless preview sessions | anthnyalxndr/gtm_v2-tasks#3 |

| Task | Issue | Title |
| --- | --- | --- |
| TASK-9 | #53 | Apply produces a change report that describes and visualizes every change to a container |
| TASK-10 | #54 | Custom and community templates round-trip through snapshots, libraries and apply |
| TASK-11 | #55 | Recipe dependencies are verified against GA4 and Google Ads, GA4 first |
| TASK-18 | #56 | A snapshot names the environment serving the version it read, including Live and Latest |
| TASK-19 | #57 | Many containers, or a whole account, can be snapshotted in one call |
| TASK-23 | #58 | Decision: how an entity is renamed or mutated in place without delete plus create |
| TASK-24 | #59 | Entities can be renamed in place from the spec |
| TASK-25 | #60 | Apply can prune entities and built-ins that are not in the spec |
| TASK-27 | #61 | gtm-client authenticates headlessly for CI |
| TASK-28 | #62 | A plan against the live version is available as machine-readable output with a drift exit code |
| TASK-29 | #63 | Policy rules are evaluated on a plan and fail CI on violations |
| TASK-30 | #64 | A repo config file maps environments to containers and CI settings |
| TASK-32 | #65 | The repo ships the GTM as code workflow: docs, CI templates and runbook |
| TASK-34 | #66 | Specs serialize canonically, so pulling an unchanged container produces no git diff |
| TASK-35 | #67 | gtm-apply pull writes a container directory with a canonical spec, a snapshot and a container record |
| TASK-36 | #68 | gtm-as-code scaffolds an account repo and imports its containers in one command |
| TASK-37 | #69 | gtm runs the repo loop over every managed container: pull, diff, plan, apply and publish |
| TASK-38 | #70 | gtm update refreshes an account repo's scaffold, and the bundled base layer is checked against the copier base |
| TASK-46 | #71 | Paired web and server containers are checked against each other before publishing |
| TASK-47 | #72 | A recipe library can grow past a handful of recipes without hitting Tag Manager's 1024-character constant limit |
| TASK-49 | #73 | apply leaves changes in the workspace; creating a version is opt-in |
| TASK-51 | #74 | Consent handling in sessions: decide the approach after recording accept and deny flows |
| TASK-52 | #75 | Verify the three paths that need a person or a real write |
| TASK-53 | #76 | gtm-preview: Google Ads conversion tags report execute_failed in dry mode, so decide whether the dry policy's abort causes it and how the report should say so |
| TASK-54 | #77 | gtm-client: a stored token minted with narrower scopes is reused for calls that need wider ones and fails with 403 instead of re-authorizing |

Dropped edges (blocker was Done and not migrated):
- TASK-9 blocked by TASK-8
- TASK-10 blocked by TASK-8
- TASK-11 blocked by TASK-8
- TASK-25 blocked by TASK-21
- TASK-25 blocked by TASK-22
- TASK-32 blocked by TASK-26
- TASK-32 blocked by TASK-31
- TASK-46 blocked by TASK-40
- TASK-47 blocked by TASK-40
