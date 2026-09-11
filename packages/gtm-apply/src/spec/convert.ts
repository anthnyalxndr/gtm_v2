import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type {
  ClientSpec,
  CustomTemplateSpec,
  TagSpec,
  TransformationSpec,
  TriggerSpec,
  VariableSpec,
} from "./types.js";
import { templateNameOf } from "./cvt.js";

/** Name-to-id maps and raw entities for a workspace, used to resolve spec references. */
export interface ExistingState {
  folders: Map<string, string>;
  variables: Map<string, string>;
  triggers: Map<string, string>;
  tags: Map<string, string>;
  clients: Map<string, string>;
  transformations: Map<string, string>;
  /** Template name to the cvt_ type it has in this container. */
  templates: Map<string, string>;
  builtIns: Set<string>;
  raw: {
    folder: tagmanager_v2.Schema$Folder[];
    variable: tagmanager_v2.Schema$Variable[];
    trigger: tagmanager_v2.Schema$Trigger[];
    tag: tagmanager_v2.Schema$Tag[];
    client: tagmanager_v2.Schema$Client[];
    transformation: tagmanager_v2.Schema$Transformation[];
    customTemplate: tagmanager_v2.Schema$CustomTemplate[];
  };
}

export function emptyState(): ExistingState {
  return {
    folders: new Map(),
    variables: new Map(),
    triggers: new Map(),
    tags: new Map(),
    clients: new Map(),
    transformations: new Map(),
    templates: new Map(),
    builtIns: new Set(),
    raw: {
      folder: [],
      variable: [],
      trigger: [],
      tag: [],
      client: [],
      transformation: [],
      customTemplate: [],
    },
  };
}

export interface Unresolved {
  kind: "folder" | "trigger" | "customTemplate";
  name: string;
}

/** Rewrite a cvt:<name> sentinel type to the target container's cvt_ type, or record it unresolved. */
function resolveTemplate(
  type: string | null | undefined,
  ids: ExistingState,
  unresolved: Unresolved[]
): string | null | undefined {
  const name = templateNameOf(type);
  if (name === undefined) return type;
  const cvt = ids.templates.get(name);
  if (!cvt) {
    unresolved.push({ kind: "customTemplate", name });
    return type;
  }
  return cvt;
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
  body.type = resolveTemplate(body.type, ids, unresolved) ?? body.type;
  return { body, unresolved };
}

/** A template body for the API: the spec as is (name, templateData, galleryReference). */
export function toApiTemplate(spec: CustomTemplateSpec): tagmanager_v2.Schema$CustomTemplate {
  return { ...spec };
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

export function toApiClient(
  spec: ClientSpec,
  ids: ExistingState
): Converted<tagmanager_v2.Schema$Client> {
  const { parentFolderName, ...rest } = spec;
  const unresolved: Unresolved[] = [];
  const body: tagmanager_v2.Schema$Client = { ...rest };
  const folderId = resolveFolder(parentFolderName, ids, unresolved);
  if (folderId) body.parentFolderId = folderId;
  return { body, unresolved };
}

export function toApiTransformation(
  spec: TransformationSpec,
  ids: ExistingState
): Converted<tagmanager_v2.Schema$Transformation> {
  const { parentFolderName, ...rest } = spec;
  const unresolved: Unresolved[] = [];
  const body: tagmanager_v2.Schema$Transformation = { ...rest };
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
  body.type = resolveTemplate(body.type, ids, unresolved) ?? body.type;
  return { body, unresolved };
}
