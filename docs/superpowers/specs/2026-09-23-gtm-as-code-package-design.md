# GTM account repos: design for the gtm-as-code package

Written 2026-09-23. Records the design behind decision-11 and tasks TASK-34 to TASK-38 in milestone m-0. It extends the GTM as code plan (`backlog/docs/doc-1`), which lists what gtm-apply still lacks for a git repo to be the source of truth for a container. This document says how such a repo is created, what it holds, and how it stays aligned with Tag Manager.

Reader: whoever implements one of those tasks, or TASK-30 and TASK-32, which share files with them.

## Goal

One command turns a Tag Manager account into a git repo. After that, every change to a managed container is a pull request, and every edit made in the GTM UI shows up as a pull request too. A client engineer with Node and a browser can run the first command; nothing else is on the path.

## What exists

gtm-apply plans and applies a single container from a spec in the export shape (decision-2, decision-3), pulls a snapshot of everything the API exposes (TASK-4), compiles a tracking plan against a recipe library (TASK-1), and merges spec fragments (`mergeSpecs`). gtm-client authenticates, throttles, lists accounts, and resolves a container by public id (TASK-33). gtm-web-recipes shows the pattern of a package whose `pnpm pull` regenerates a committed module from a container. Nothing yet writes files for more than one container, orders output deterministically, or scaffolds anything.

## The model in one paragraph

The repo is the authority for the entities its specs declare. Tag Manager is the authority for everything else, including entity kinds apply cannot write yet. Import once, then two loops: forward (a merged PR becomes a GTM version), reverse (a scheduled pull diffs against the committed specs and opens a drift PR). There is no state file. Names are identity in the engine (decision-2), so a committed spec and a name-keyed planner reconcile without tracking ids; the identity decision for renames is TASK-23.

## Account repo layout

```
acme-gtm/
  package.json              pins @anthnyalxndr/gtm-as-code, gtm-apply, gtm-web-recipes; scripts: pull, diff, plan, apply, publish, verify
  gtm.config.json           the repo config file TASK-30 defines (see below)
  gtm/
    containers/
      GTM-ABC1234/
        container.json      identity and what was read; no timestamp
        spec.json           the apply-able part, canonical; the authority
        snapshot.json       everything the API exposes, canonical; an audit record
        plan.ts             optional: a tracking plan against the recipe library
        custom.ts           optional: bespoke entities as defineContainer()
      GTM-XYZ5678/
        ...
  .github/workflows/        the three jobs TASK-32 defines: PR plan, merge apply, scheduled drift
  .husky/pre-commit         pnpm exec lint-staged && pnpm verify
  .prettierrc, .gitignore, README.md
```

The shell (everything outside `gtm/containers/`) is owned by the scaffold and rewritten by `gtm update`. The container directories are owned by the user and by `gtm pull`, and are never touched by update.

### The files in a container directory

`spec.json` is the apply-able part of the container as `snapshotToSpec` returns it, serialized canonically. It is what `gtm apply` reconciles the container against when there is no `plan.ts` or `custom.ts`. It is stable across pulls of an unchanged container, so a git diff of it shows only content changes.

`snapshot.json` is the `ApiSnapshotData` of the same pull, serialized canonically. It carries fingerprints, ids, environments, destinations, and the kinds apply cannot write yet (gtag configs, custom templates until TASK-10). It churns on every pull and is committed anyway, as the audit record of what the container held when it was last read. It is never the input to apply.

`container.json` is a `ContainerRecord`:

```json
{
  "publicId": "GTM-ABC1234",
  "name": "acme.com",
  "containerType": "web",
  "accountId": "6012345678",
  "containerId": "12345678",
  "source": { "container": "GTM-ABC1234" },
  "version": { "id": "42", "name": "feat(ads): lead conversion (#12)" },
  "workspace": null,
  "environment": "Latest"
}
```

It has no timestamp so a re-pull of an unchanged container rewrites it byte for byte. `source` is the `SnapshotSource` read. `version` is the header of the version read, or the version a workspace branched from. `environment` is the name of the environment serving that version when it can be resolved (TASK-18 makes this reliable for Live and Latest), else null. After `gtm apply` creates a version, the command updates `version` here so `gtm publish` knows what to publish.

`plan.ts` and `custom.ts` are the authored form. When either exists, the desired state is `mergeSpecs(compilePlan(library, plan).spec, custom)`, and `spec.json` is what the container held at the last pull, not the desired state. When neither exists, `spec.json` is the desired state and is edited by hand. A container directory therefore starts in one of two ways: imported (spec.json only, from `gtm init`) or authored (plan.ts and custom.ts, for a container born from the repo). The scaffold ships an example of each.

### Coverage is stated, not implied

Apply writes folders, variables, triggers, tags, clients, transformations, and, once TASK-10 lands, custom templates. It does not write gtag configs (TASK-21), environments (TASK-22), or destinations. `container.json` does not claim otherwise: the README the scaffold writes lists the managed kinds and says the rest live in `snapshot.json` as a record only. Prune (TASK-25) must never delete a kind apply cannot recreate.

## Repo config file

TASK-30 owns the file and gtm-apply's `--env` resolution. The account repo needs it to carry, at minimum:

```json
{
  "account": { "id": "6012345678", "name": "Acme" },
  "containers": {
    "GTM-ABC1234": { "dir": "gtm/containers/GTM-ABC1234", "env": "prod" },
    "GTM-STG5678": { "dir": "gtm/containers/GTM-STG5678", "env": "staging" }
  },
  "defaults": { "workspace": "${commit}", "prune": false }
}
```

`gtm init` writes it with every managed container and `env` unset; the user assigns environments. The loop commands iterate `containers` in key order. If TASK-30 chooses a TypeScript module instead of JSON, init writes that module; the shape above is the contract, not the file type.

## Canonical serialization (TASK-34)

A pure function of content, so the same container serializes to the same bytes on any machine:

- Sections in the order `containerType`, `folder`, `builtInVariable`, `variable`, `trigger`, `tag`, `client`, `transformation`. Absent sections are omitted, never written empty.
- Entities within a section sorted by `name` using code-unit comparison (not locale-aware, so every machine agrees).
- `builtInVariable`, `firingTriggerName` and `blockingTriggerName` sorted and deduplicated.
- A `parameter` array, and a map parameter's `map` array, sorted by `key`. A list parameter's `list` array keeps its order: list order is meaning in Tag Manager (for example the ordered event parameters of a GA4 tag).
- Object keys written `name`, `type`, `parentFolderName`, `notes` first when present, then the rest alphabetically, at every depth.
- Two-space JSON with a trailing newline.

Canonical form applies where a spec is written: `stringifySpec` in the `normalize`, `export` and `pull` commands and in the pull directory. It does not apply inside `normalizeExport`. A `GtmSnapshot` keeps the order the API returned, because `select()` documents that it returns entities in library order and recipe order follows tag order; sorting there would reorder every library. `canonicalSnapshot` and `stringifySnapshot` apply the same rules to an `ApiSnapshotData`: each entity collection sorted by name (`gtagConfig` by `gtagConfigId`, `destinations` by `destinationId`, `environments` by `name`), keys ordered the same way, `pulledAt` kept.

The planner compares a desired body to an existing entity with `matches()`, which walks arrays positionally. A canonical spec applied to a container whose parameters are stored in another order would plan `[~]` on every run. `matches()` therefore compares an array whose items all carry a unique string `key` as a map by key, and every other array positionally. Whether Tag Manager returns parameters in the order they were sent is unverified; the task records what a live probe shows.

## Pull (TASK-35) and account listing (TASK-19)

`gtm-apply pull --container GTM-X --out <dir>` writes the three files above into `<dir>`. `--account <id> --out <dir>` lists the account's containers and writes `<dir>/<publicId>/` for each, pulling concurrently through the client's throttle. `--live`, `--version` and `--workspace` mean what they mean for `snapshot`.

A container whose spec cannot be normalized (a custom-template tag until TASK-10, a trigger group) still gets `snapshot.json` and `container.json`. An existing `spec.json` is left untouched. The error names the container, and the exit code is nonzero once every container has been attempted, so one odd container does not stop an account import.

From code: `writeContainerDir(snapshot, dir)`, `pullContainer(client, source, dir)`, `pullAccount(client, accountId, outDir, { filter })`, and from TASK-19 `listContainers(client, accountId)` in gtm-client, `pullSnapshots(client, sources)` and `snapshotAccount(client, accountId)` in gtm-apply, plus `Gtm.snapshotAccount(accountId)` memoized per container.

## The gtm-as-code package

`packages/gtm-as-code`, published as `@anthnyalxndr/gtm-as-code`, bin `gtm`. Depends on gtm-apply (`workspace:^`) and, for `gtm plan`, on the recipe library the account repo pins. gtm-apply never imports it.

```
packages/gtm-as-code/
  src/
    bin.ts                 entry: parse argv, build a GtmClient, run
    cli.ts                 parseArgs and dispatch; every command takes (args, client, io)
    config.ts              read and validate the repo config file (delegates to gtm-apply once TASK-30 lands)
    commands/
      init.ts              scaffold + import + git init + first commit
      pull.ts              loop pullContainer over the config
      diff.ts              pull to a temp dir, compare canonical spec.json, exit 0 or 2
      plan.ts              desired state per container, gtm-apply plan output
      apply.ts             desired state into a workspace, record the version
      publish.ts           publish the recorded or named version
      update.ts            rewrite scaffold-owned files from templates, diff first
    desired.ts             desired state of a container directory: plan.ts + custom.ts merged, or spec.json
    scaffold.ts            render templates/ into a directory; the scaffold manifest
    git.ts                 thin wrappers over git for init, commit, diff --name-only
  templates/               plain files copied into a new repo; see the manifest
    package.json.tmpl
    gtm.config.json.tmpl
    README.md.tmpl
    .gitignore
    .prettierrc
    .husky/pre-commit
    .github/workflows/{pr-plan,merge-apply,drift}.yml
    gtm/containers/EXAMPLE/{plan.example.ts,custom.example.ts}
  test/
    fixtures/copier-base/  pinned copies of the copier-templates base files
```

Templates with a `.tmpl` suffix have `{{name}}`, `{{account.id}}` and similar placeholders replaced by a small string substitution; everything else is copied verbatim. No template engine. The scaffold manifest is the list of published paths the scaffold owns; `gtm update` rewrites exactly those and nothing else.

### Commands

- `gtm init <dir> --account <id> [--all | --container <id>...]`. Refuses a non-empty directory or a path inside an existing git work tree. Authenticates (browser OAuth if no token). Lists the account's containers and, unless `--all` or `--container` was given, asks which to manage; a non-interactive terminal without either exits 1 naming both flags. Renders the scaffold, runs `pullAccount` filtered to the chosen containers, writes the config file, runs `pnpm install` and `git init`, and commits `feat(gtm): import account <id>`. The first version of this command has no interactive picker beyond a numbered list on stdin.
- `gtm pull [id]`. Re-pulls every managed container, or one.
- `gtm diff [id]`. Pulls into a temporary directory and compares canonical `spec.json` files. Exit 0 when all equal, 2 when any differ, 1 on error. Prints, per drifted container, the entity names whose canonical JSON differs. This is git-side drift: what changed in GTM since the last pull. A plan against the live version (TASK-28) is GTM-side drift: what the repo would change; `gtm plan` reuses it.
- `gtm plan [id] [--changed <ref>]`. Computes the desired state per container and prints gtm-apply's plan (JSON per TASK-28 when available, text otherwise).
- `gtm apply [id] [--changed <ref>] [--workspace <name>]`. Applies the desired state into a workspace named `--workspace` or the short commit hash, then records the created version in `container.json`. Never publishes.
- `gtm publish <id> [--version <id>]`. Publishes the recorded version or the named one. Refuses when neither exists.
- `gtm update [--yes]`. Diffs scaffold-owned files against the installed templates, asks, writes.

`--changed <ref>` restricts a command to containers whose directory differs from that git ref, which is how the merge job applies only what a PR touched.

### The two loops in CI

The workflows TASK-32 defines are the files the scaffold bundles. In terms of the commands above: on pull request, `gtm plan --changed origin/main` posts its output as a PR comment and, with TASK-26, writes a preview workspace named after the PR; on merge, `gtm apply --changed <merge-base>` inside a concurrency group, then `gtm publish` for containers configured to publish on merge; on a schedule, `gtm diff` and, on exit 2, `gtm pull` on a branch and a pull request titled `chore(gtm): drift from <ids>`. Headless auth is TASK-27.

### Why bundled files, and how they stay honest

The base layer for an account repo is about eight files: the husky hook, prettier config, the verify script, `.gitignore`, and three workflow files. `anthnyalxndr/copier-templates` is where those standards are maintained for every other repo, but copier needs `uvx`, cannot call the API, and re-runs on update over content that must never be re-imported. So the package carries its own copies, and a test in the package compares them to pinned copies of the copier base's equivalents under `test/fixtures/copier-base/`. When the copier base changes, the pinned copy is updated by hand, the test fails, and the bundled template is updated to match. Divergence is visible, never silent.

## Sequencing

Two implementation plans:

1. `docs/superpowers/plans/2026-09-23-gtm-as-code-foundations.md`: TASK-34 (canonical serialization), TASK-19 (account listing and multi-container snapshots) and TASK-35 (pull directories). All in gtm-apply and gtm-client, no dependency on unfinished work, ready now.
2. A second plan for TASK-36, TASK-37 and TASK-38 once TASK-30 (config file) and TASK-28 (plan against live, JSON, drift exit code) have landed, since init writes TASK-30's file and the loop commands consume TASK-28's output. Their interfaces are not known yet, so writing bite-sized steps for them now would invent them.

## Open questions

- Does Tag Manager preserve parameter order on write? If it does, the by-key comparison in `matches()` is still correct, only less necessary. TASK-34 probes it.
- Should `snapshot.json` be committed at all, given that it churns? This design says yes, as the audit record, because the drift job diffs `spec.json` and the noise stays out of that diff. Revisit if repos become large.
- Should gtm-web-recipes become public before the first external account repo pins it? An account repo that uses `plan.ts` needs to install it.
