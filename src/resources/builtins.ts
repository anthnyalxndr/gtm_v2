import type { GtmClient } from "../gtm_v2.js";

/** Return the API types of the built-in variables enabled in a workspace. */
export async function listEnabledBuiltIns(
  client: GtmClient,
  workspacePath: string
): Promise<Set<string>> {
  const api = client.service.accounts.containers.workspaces.built_in_variables;
  const res = await client.call(() => api.list({ parent: workspacePath }));
  return new Set(
    (res.data.builtInVariable ?? []).map((b) => b.type).filter((t): t is string => !!t)
  );
}

/** Enable the built-in variables in `types` that are not already enabled. Returns the ones enabled. */
export async function ensureBuiltIns(
  client: GtmClient,
  workspacePath: string,
  types: readonly string[]
): Promise<string[]> {
  if (types.length === 0) return [];
  const api = client.service.accounts.containers.workspaces.built_in_variables;
  const enabled = await listEnabledBuiltIns(client, workspacePath);
  const missing = [...new Set(types)].filter((t) => !enabled.has(t));
  if (missing.length === 0) return [];
  await client.call(() => api.create({ parent: workspacePath, type: missing }));
  return missing;
}
