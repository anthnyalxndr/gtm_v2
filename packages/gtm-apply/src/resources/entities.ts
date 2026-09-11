import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { GtmClient } from "@anthnyalxndr/gtm-client";

export type EnsureAction = "created" | "updated" | "unchanged";
export interface EnsureResult<T> {
  entity: T;
  action: EnsureAction;
}

/** Fields the API owns. Ignored when comparing a desired body to an existing entity. */
export const SERVER_FIELDS: readonly string[] = [
  "accountId",
  "containerId",
  "workspaceId",
  "tagId",
  "triggerId",
  "variableId",
  "folderId",
  "clientId",
  "transformationId",
  "fingerprint",
  "path",
  "tagManagerUrl",
];

interface Named {
  name?: string | null;
  path?: string | null;
  fingerprint?: string | null;
}

interface Collection<T extends Named> {
  list(params: { parent: string }): Promise<{ data: Record<string, T[] | undefined> }>;
  create(params: { parent: string; requestBody: T }): Promise<{ data: T }>;
  update(params: { path: string; fingerprint?: string; requestBody: T }): Promise<{ data: T }>;
}

/**
 * True when every key in `desired` deep-equals the same key in `existing`.
 * Keys only present on `existing` (server fields, UI defaults) are ignored.
 */
export function matches(existing: unknown, desired: unknown): boolean {
  if (typeof desired !== "object" || desired === null) return existing === desired;
  if (Array.isArray(desired)) {
    return (
      Array.isArray(existing) &&
      existing.length === desired.length &&
      desired.every((d, i) => matches(existing[i], d))
    );
  }
  if (typeof existing !== "object" || existing === null) return false;
  const e = existing as Record<string, unknown>;
  return Object.entries(desired as Record<string, unknown>).every(
    ([k, v]) => SERVER_FIELDS.includes(k) || matches(e[k], v)
  );
}

async function ensureEntity<T extends Named>(
  client: GtmClient,
  collection: Collection<T>,
  listKey: string,
  workspacePath: string,
  body: T
): Promise<EnsureResult<T>> {
  if (!body.name) {
    throw new Error(`${listKey} body must have a name; name is the identity of an entity.`);
  }
  const listRes = await client.call(() => collection.list({ parent: workspacePath }));
  const existing = (listRes.data[listKey] ?? []).find((e) => e.name === body.name);
  if (!existing) {
    const created = await client.call(() =>
      collection.create({ parent: workspacePath, requestBody: body })
    );
    return { entity: created.data, action: "created" };
  }
  if (matches(existing, body)) {
    return { entity: existing, action: "unchanged" };
  }
  const path = existing.path;
  if (!path) {
    throw new Error(`Existing ${listKey} "${body.name}" has no path`);
  }
  const updated = await client.call(() =>
    collection.update({ path, fingerprint: existing.fingerprint ?? undefined, requestBody: body })
  );
  return { entity: updated.data, action: "updated" };
}

type Workspaces = tagmanager_v2.Tagmanager["accounts"]["containers"]["workspaces"];

function col<T extends Named>(client: GtmClient, pick: (ws: Workspaces) => unknown): Collection<T> {
  return pick(client.service.accounts.containers.workspaces) as Collection<T>;
}

export function ensureFolder(
  client: GtmClient,
  workspacePath: string,
  body: tagmanager_v2.Schema$Folder
): Promise<EnsureResult<tagmanager_v2.Schema$Folder>> {
  return ensureEntity(
    client,
    col(client, (ws) => ws.folders),
    "folder",
    workspacePath,
    body
  );
}

export function ensureVariable(
  client: GtmClient,
  workspacePath: string,
  body: tagmanager_v2.Schema$Variable
): Promise<EnsureResult<tagmanager_v2.Schema$Variable>> {
  return ensureEntity(
    client,
    col(client, (ws) => ws.variables),
    "variable",
    workspacePath,
    body
  );
}

export function ensureTrigger(
  client: GtmClient,
  workspacePath: string,
  body: tagmanager_v2.Schema$Trigger
): Promise<EnsureResult<tagmanager_v2.Schema$Trigger>> {
  return ensureEntity(
    client,
    col(client, (ws) => ws.triggers),
    "trigger",
    workspacePath,
    body
  );
}

export function ensureClient(
  client: GtmClient,
  workspacePath: string,
  body: tagmanager_v2.Schema$Client
): Promise<EnsureResult<tagmanager_v2.Schema$Client>> {
  return ensureEntity(
    client,
    col(client, (ws) => ws.clients),
    "client",
    workspacePath,
    body
  );
}

export function ensureTransformation(
  client: GtmClient,
  workspacePath: string,
  body: tagmanager_v2.Schema$Transformation
): Promise<EnsureResult<tagmanager_v2.Schema$Transformation>> {
  return ensureEntity(
    client,
    col(client, (ws) => ws.transformations),
    "transformation",
    workspacePath,
    body
  );
}

export function ensureTag(
  client: GtmClient,
  workspacePath: string,
  body: tagmanager_v2.Schema$Tag
): Promise<EnsureResult<tagmanager_v2.Schema$Tag>> {
  return ensureEntity(
    client,
    col(client, (ws) => ws.tags),
    "tag",
    workspacePath,
    body
  );
}
