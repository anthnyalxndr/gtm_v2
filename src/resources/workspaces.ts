import type { GtmClient } from "../gtm_v2.js";

export interface WorkspaceRef {
  path: string;
  workspaceId: string;
  name: string;
  created: boolean;
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
    throw new Error("Refusing to use the Default Workspace. Pass a dedicated workspace name.");
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
