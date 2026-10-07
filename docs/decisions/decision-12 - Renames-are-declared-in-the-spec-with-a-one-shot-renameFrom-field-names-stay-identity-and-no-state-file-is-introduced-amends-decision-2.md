---
id: decision-12
title: >-
  Renames are declared in the spec with a one-shot renameFrom field; names stay
  identity and no state file is introduced (amends decision-2)
date: '2026-09-25 10:19'
status: proposed
---
## Context

Decision-2 made names the identity of every entity, which is what lets the planner reconcile a container against a spec with no state file: an entity that exists by name is compared and updated, one that does not is created. The cost shows up on a rename. Editing `name` in the spec plans as a create of the new name (and, once prune exists, a delete of the old one), every entity that referenced the old name errors, and the GTM id changes, which loses the entity's version history in the UI and breaks any external reference to the id. An author who edits a name means "update", not "replace".

TASK-23 asked for a decision on how the tool tells a rename from a delete plus create, weighing four options. TASK-24 implements it; TASK-25 (prune) depends on it because prune must never mistake a rename for a removal.

## Options considered

1. **A stable key in each entity's notes trailer.** The library metadata trailer (decision-10) could carry `{"id": "…"}` and the planner would match on it before matching on name. It works only for the kinds that have notes (variable, trigger, tag, client, transformation), not for folders, templates, environments or gtag configs. It puts an invisible identity into every customer container, which the author must never edit and which a UI user can delete by clearing the notes. It also has to be minted at create time and stays forever, so every spec carries keys nobody reads.
2. **A one-shot `renameFrom` field in the spec.** The author writes `{ "name": "New", "renameFrom": "Old" }`. The planner matches the existing entity named `Old`, plans an update that changes the name and keeps the id, and reports it as a rename. After the apply the field is inert (nothing named `Old` exists) and the author deletes it on the next edit. Identity is only ambiguous at the moment of the rename, and this names it exactly then, for every kind that has a name.
3. **A committed per-container state file** mapping spec keys to GTM ids, as Terraform does. It makes every rename automatic but adds a machine-maintained file to every container directory that must be merged, kept in step with the container, and rebuilt when it drifts. It reintroduces exactly what decision-2 avoided, and it does nothing for an entity created in the UI until the next import.
4. **GTM's own ids in the spec.** Not portable: a staging and a prod container have different ids for the same entity, and the point of a spec is to apply to more than one container.

## Decision

- Names stay identity (decision-2 stands). No state file and no minted keys are introduced. A rename is declared by the author, in the spec, at the moment it happens, with a one-shot `renameFrom` field on the entity being renamed.
- The planner resolves an entity with `renameFrom` as follows. If an entity named `renameFrom` exists in the container and none named `name` does, it plans `[~] <kind> "Old" -> "New"` as an update of the existing entity that keeps its id. If `name` already exists and `renameFrom` does not, the rename already happened: the field is ignored with an informational line so the author removes it. If both exist, it is a plan error naming both, because the intent is ambiguous. If neither exists, it is an ordinary create with a warning that `renameFrom` matched nothing.
- References in the same spec use the new name. A reference to the old name (`firingTriggerName`, `blockingTriggerName`, `parentFolderName`, `{{Old}}` in any string) resolves to the renamed entity with a warning telling the author to update it, so a half-edited spec still applies and never errors on its own rename.
- Prune (TASK-25) treats the entity with `renameFrom: "Old"` as the owner of `Old`, so a rename is never planned as a delete plus a create.
- A change of type in place (a tag from `html` to `awct`, a trigger from `pageview` to `customEvent`) is an update by name that keeps the id; nothing new is needed for it. Whether Tag Manager accepts a type change on update for every kind is verified live in TASK-24 and recorded there; a kind that rejects it falls back to the two-step below.
- `renameFrom` is a spec-only field: `normalizeExport` and `pull` never emit it, validation accepts it on every named kind, and the canonical form writes it right after `name`.

How each kind is identified across a rename:

| Kind | Identity | Rename |
| --- | --- | --- |
| folder | name | `renameFrom`; entities keep `parentFolderName` by the new name |
| variable | name | `renameFrom`; `{{Old}}` references resolve with a warning |
| trigger | name | `renameFrom`; `firingTriggerName` and `blockingTriggerName` by the new name |
| tag | name | `renameFrom` |
| client, transformation (server) | name | `renameFrom` |
| custom template (TASK-10) | name | `renameFrom`; the `cvt_` type of tags built on it follows the template id, which does not change |
| environment (TASK-22) | name | `renameFrom`; Live and Latest cannot be renamed |
| gtag config (TASK-21) | the `tagId` parameter, no name | two-step: a changed `tagId` is a new config, so delete the old one under prune and create the new one; documented, not declared |
| built-in variable | type | not renamable |

## Consequences

The spec gains one optional field that is only ever present transiently, so a pull never round-trips it and a drift PR never shows it. A rename made in the GTM UI is not detected as a rename: the next pull shows the old name gone and the new name added, which is the honest description of what the repo knows, and the reconcile PR imports it. Reviewers can tell a rename from a replacement in the plan output (`"Old" -> "New"`), which TASK-24 must print. TASK-25 depends on the owner rule above. Decision-2's "names are entity identity" is amended to "names are entity identity, and a rename names its old name for one apply".

This decision is proposed by the agent for the owner to accept or amend; TASK-24 starts when it is accepted.
