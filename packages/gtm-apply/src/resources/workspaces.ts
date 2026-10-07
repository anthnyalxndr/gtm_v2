import type { GtmClient } from "@anthnyalxndr/gtm-client";

export interface WorkspaceRef {
  path: string;
  workspaceId: string;
  name: string;
  created: boolean;
}

/** A workspace's page in the Tag Manager interface, e.g. to link from a pull request. */
export function workspaceUrl(workspacePath: string): string {
  return `https://tagmanager.google.com/#/container/${workspacePath}`;
}

export interface WorkspaceStatus {
  /** Entities changed in the workspace against the version it branched from. */
  changes: number;
  /** Conflicts with versions created since; Tag Manager refuses a version until they are resolved. */
  mergeConflicts: number;
}

/** What the workspace holds against the latest version, from the status endpoint. */
export async function workspaceStatus(
  client: GtmClient,
  workspacePath: string
): Promise<WorkspaceStatus> {
  const ws = client.service.accounts.containers.workspaces;
  const res = await client.call(() => ws.getStatus({ path: workspacePath }));
  return {
    changes: res.data.workspaceChange?.length ?? 0,
    mergeConflicts: res.data.mergeConflict?.length ?? 0,
  };
}

export function isDefaultWorkspaceName(name: string): boolean {
  return name.trim().toLowerCase() === "default workspace";
}

/** Create or reuse a workspace by name. Refuses the default workspace. */
export async function ensureWorkspace(
  client: GtmClient,
  containerPath: string,
  name: string
): Promise<WorkspaceRef> {
  if (isDefaultWorkspaceName(name)) {
    throw new Error(
      "Refusing to use the Default Workspace (decision-4): people edit there by hand. " +
        "Make interface edits in a named workspace and push into that workspace instead."
    );
  }
  const ws = client.service.accounts.containers.workspaces;
  const listRes = await client.call(() => ws.list({ parent: containerPath }));
  const existing = (listRes.data.workspace ?? []).find((w) => w.name === name);
  if (existing?.path && existing.workspaceId) {
    return { path: existing.path, workspaceId: existing.workspaceId, name, created: false };
  }
  const createRes = await client.call(() =>
    ws.create({ parent: containerPath, requestBody: { name } })
  );
  const created = createRes.data;
  if (!created.path || !created.workspaceId) {
    throw new Error(`Workspace create returned no path for "${name}"`);
  }
  return { path: created.path, workspaceId: created.workspaceId, name, created: true };
}

/**
 * Delete a workspace by name, e.g. a review workspace when its pull request
 * closes. Refuses the Default Workspace. Returns false when no workspace has
 * the name, so cleanup can run more than once.
 */
export async function deleteWorkspace(
  client: GtmClient,
  containerPath: string,
  name: string
): Promise<boolean> {
  if (isDefaultWorkspaceName(name)) {
    throw new Error("Refusing to delete the Default Workspace (decision-4).");
  }
  const ws = client.service.accounts.containers.workspaces;
  const listRes = await client.call(() => ws.list({ parent: containerPath }));
  const found = (listRes.data.workspace ?? []).find((w) => w.name === name);
  if (!found?.path) return false;
  await client.call(() => ws.delete({ path: found.path! }));
  return true;
}
