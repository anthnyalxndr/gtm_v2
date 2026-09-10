import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { TagSpec, TriggerSpec, VariableSpec } from "./types.js";

/** Name-to-id maps and raw entities for a workspace, used to resolve spec references. */
export interface ExistingState {
  folders: Map<string, string>;
  variables: Map<string, string>;
  triggers: Map<string, string>;
  tags: Map<string, string>;
  builtIns: Set<string>;
  raw: {
    folder: tagmanager_v2.Schema$Folder[];
    variable: tagmanager_v2.Schema$Variable[];
    trigger: tagmanager_v2.Schema$Trigger[];
    tag: tagmanager_v2.Schema$Tag[];
  };
}

export function emptyState(): ExistingState {
  return {
    folders: new Map(),
    variables: new Map(),
    triggers: new Map(),
    tags: new Map(),
    builtIns: new Set(),
    raw: { folder: [], variable: [], trigger: [], tag: [] },
  };
}

export interface Unresolved {
  kind: "folder" | "trigger";
  name: string;
}

export interface Converted<T> {
  body: T;
  unresolved: Unresolved[];
}

function resolveFolder(
  parentFolderName: string | undefined,
  ids: ExistingState,
  unresolved: Unresolved[]
): string | undefined {
  if (!parentFolderName) return undefined;
  const id = ids.folders.get(parentFolderName);
  if (!id) unresolved.push({ kind: "folder", name: parentFolderName });
  return id;
}

export function toApiVariable(
  spec: VariableSpec,
  ids: ExistingState
): Converted<tagmanager_v2.Schema$Variable> {
  const { parentFolderName, ...rest } = spec;
  const unresolved: Unresolved[] = [];
  const body: tagmanager_v2.Schema$Variable = { ...rest };
  const folderId = resolveFolder(parentFolderName, ids, unresolved);
  if (folderId) body.parentFolderId = folderId;
  return { body, unresolved };
}

export function toApiTrigger(
  spec: TriggerSpec,
  ids: ExistingState
): Converted<tagmanager_v2.Schema$Trigger> {
  const { parentFolderName, ...rest } = spec;
  const unresolved: Unresolved[] = [];
  const body: tagmanager_v2.Schema$Trigger = { ...rest };
  const folderId = resolveFolder(parentFolderName, ids, unresolved);
  if (folderId) body.parentFolderId = folderId;
  return { body, unresolved };
}

export function toApiTag(spec: TagSpec, ids: ExistingState): Converted<tagmanager_v2.Schema$Tag> {
  const { parentFolderName, firingTriggerName, blockingTriggerName, ...rest } = spec;
  const unresolved: Unresolved[] = [];
  const body: tagmanager_v2.Schema$Tag = { ...rest };
  const folderId = resolveFolder(parentFolderName, ids, unresolved);
  if (folderId) body.parentFolderId = folderId;
  const resolveTriggers = (names: string[] | undefined): string[] | undefined => {
    if (!names) return undefined;
    const out: string[] = [];
    for (const name of names) {
      const id = ids.triggers.get(name);
      if (id) out.push(id);
      else unresolved.push({ kind: "trigger", name });
    }
    return out;
  };
  const firing = resolveTriggers(firingTriggerName);
  if (firing) body.firingTriggerId = firing;
  const blocking = resolveTriggers(blockingTriggerName);
  if (blocking) body.blockingTriggerId = blocking;
  return { body, unresolved };
}
