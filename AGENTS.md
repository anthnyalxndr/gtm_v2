# AGENTS.md

<!-- gh-task:start -->
## Task management

Tasks are GitHub Issues. Leaves (tasks and bugs) live in this repo, flat, one PR to `main` each.
Initiatives and the pinned Plan live in the planning repo `anthnyalxndr/gtm_v2-tasks` (recorded in
`git config gh-task.plan-repo`). The `gh task` extension enforces the conventions; use it for every
write and raw `gh issue view` / `gh issue list` for reads.

- `gh task ready` lists what an agent may start now: open, labeled `agent` by the owner, no open
  blocker or sub-issue, no status label, a Description plus checkbox acceptance criteria, one
  `priority:*` label. Highest priority first, then lowest number. Each line names its initiative.
  `gh task initiatives` lists the open initiatives with open and done leaf counts. The same commands
  work whether this repo plans in itself or in a companion; `gh task` reads the location from git config.
- `gh task create --title … --description … --ac … [--ac …] --priority high|medium|low --parent <n>`
  is the only way to add a task. A bare `--parent` number is an initiative in the planning repo;
  `--standalone` with a reason in the description is the escape hatch. `--kind initiative` creates
  an initiative in the planning repo; initiatives nest at most three deep and are never worked.
- Ordering is `--blocked-by` (any repo; a bare number is an issue in this repo). Integration work is a leaf blocked by the leaves it
  integrates. A leaf has no children. No integration branches.
- `gh task start <n>` claims a ready issue, creates branch `<type>/<n>-<slug>` linked to it, and
  prints the brief (Description, Acceptance criteria, Pointers). `--stack-on <sibling>` bases the
  branch on a sibling leaf's branch when two leaves must land in order. `gh task check <n> --ac <k>`
  ticks a criterion once a test or command proves it. `gh task done <n> --pr <n|url>` refuses while a
  criterion is unchecked (unless `--incomplete "<reason>"`), links the draft PR (`Closes #n`) and
  moves the issue to `review`. A human merges; merge closes the issue.
- Other people file bugs and feature requests through the issue forms; an accepted feature request
  becomes a task via `/task-refine`.
- Skills: `/task-status`, `/task-add`, `/task-next`, `/task-refine`, `/task-plan`, `/task-triage`,
  `/task-autopilot`. Decisions live in `docs/decisions/`, not in issues.
<!-- gh-task:end -->
