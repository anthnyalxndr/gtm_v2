import type { GtmClient } from "../gtm_v2.js";
import { ensureWorkspace } from "../resources/workspaces.js";
import { ensureBuiltIns } from "../resources/builtins.js";
import {
  ensureFolder,
  ensureTag,
  ensureTrigger,
  ensureVariable,
  type EnsureAction,
} from "../resources/entities.js";
import { toApiTag, toApiTrigger, toApiVariable, type Unresolved } from "./convert.js";
import { planContainerSpec, type OpAction, type Plan, type PlannedOp } from "./plan.js";
import type { ContainerSpec } from "./types.js";

export interface ExecuteOptions {
  publish?: boolean;
  versionName?: string;
}

export interface ApplyResult {
  workspacePath: string;
  ops: PlannedOp[];
  versionPath?: string;
  published: boolean;
}

const toOpAction = (action: EnsureAction): OpAction =>
  action === "created" ? "create" : action === "updated" ? "update" : "unchanged";

function assertResolved(kind: string, name: string, unresolved: Unresolved[]): void {
  if (unresolved.length === 0) return;
  const list = unresolved.map((u) => `${u.kind} "${u.name}"`).join(", ");
  throw new Error(`${kind} "${name}" references ${list} which could not be resolved`);
}

/** Apply a plan in dependency order. Refuses to run while the plan has errors. */
export async function executePlan(
  client: GtmClient,
  plan: Plan,
  options: ExecuteOptions = {}
): Promise<ApplyResult> {
  if (plan.errors.length > 0) {
    throw new Error(
      `Plan has ${plan.errors.length} error(s):\n${plan.errors.map((e) => `- ${e}`).join("\n")}`
    );
  }

  const ws = await ensureWorkspace(client, plan.container.path, plan.target.workspace);
  const ids = plan.existing;
  const ops: PlannedOp[] = [
    { kind: "workspace", name: ws.name, action: ws.created ? "create" : "unchanged" },
  ];

  const builtIns = plan.spec.builtInVariable ?? [];
  const enabled = new Set(await ensureBuiltIns(client, ws.path, builtIns));
  for (const t of builtIns) {
    ops.push({ kind: "builtIn", name: t, action: enabled.has(t) ? "create" : "unchanged" });
    ids.builtIns.add(t);
  }

  for (const f of plan.spec.folder ?? []) {
    const r = await ensureFolder(client, ws.path, { name: f.name });
    if (r.entity.folderId) ids.folders.set(f.name, r.entity.folderId);
    ops.push({ kind: "folder", name: f.name, action: toOpAction(r.action) });
  }

  for (const v of plan.spec.variable ?? []) {
    const name = v.name ?? "";
    const { body, unresolved } = toApiVariable(v, ids);
    assertResolved("variable", name, unresolved);
    const r = await ensureVariable(client, ws.path, body);
    if (r.entity.variableId) ids.variables.set(name, r.entity.variableId);
    ops.push({ kind: "variable", name, action: toOpAction(r.action) });
  }

  for (const t of plan.spec.trigger ?? []) {
    const name = t.name ?? "";
    const { body, unresolved } = toApiTrigger(t, ids);
    assertResolved("trigger", name, unresolved);
    const r = await ensureTrigger(client, ws.path, body);
    if (r.entity.triggerId) ids.triggers.set(name, r.entity.triggerId);
    ops.push({ kind: "trigger", name, action: toOpAction(r.action) });
  }

  for (const t of plan.spec.tag ?? []) {
    const name = t.name ?? "";
    const { body, unresolved } = toApiTag(t, ids);
    assertResolved("tag", name, unresolved);
    const r = await ensureTag(client, ws.path, body);
    if (r.entity.tagId) ids.tags.set(name, r.entity.tagId);
    ops.push({ kind: "tag", name, action: toOpAction(r.action) });
  }

  const wsApi = client.service.accounts.containers.workspaces;
  const status = await client.call(() => wsApi.getStatus({ path: ws.path }));
  const conflicts = status.data.mergeConflict ?? [];
  if (conflicts.length > 0) {
    throw new Error(
      `Workspace "${ws.name}" has ${conflicts.length} merge conflict(s). Resolve them in the GTM UI before creating a version.`
    );
  }

  const versionName = options.versionName ?? plan.target.workspace;
  const versionRes = await client.call(() =>
    wsApi.create_version({ path: ws.path, requestBody: { name: versionName } })
  );
  const versionPath = versionRes.data.containerVersion?.path ?? undefined;
  if (!versionPath) throw new Error("create_version returned no container version path");
  ops.push({ kind: "version", name: versionName, action: "create" });

  let published = false;
  if (options.publish) {
    await client.call(() =>
      client.service.accounts.containers.versions.publish({ path: versionPath })
    );
    ops.push({ kind: "publish", name: versionName, action: "create" });
    published = true;
  }

  return { workspacePath: ws.path, ops, versionPath, published };
}

export interface ApplySpecOptions {
  container: string;
  workspace: string;
  spec: ContainerSpec;
  dryRun?: boolean;
  publish?: boolean;
  versionName?: string;
}

export interface ApplySpecOutcome {
  plan: Plan;
  result?: ApplyResult;
}

/** Plan, then execute unless dryRun. The plan is returned either way. */
export async function applySpec(
  client: GtmClient,
  options: ApplySpecOptions
): Promise<ApplySpecOutcome> {
  const plan = await planContainerSpec(
    client,
    { container: options.container, workspace: options.workspace },
    options.spec,
    { publish: options.publish }
  );
  if (options.dryRun) return { plan };
  const result = await executePlan(client, plan, {
    publish: options.publish,
    versionName: options.versionName,
  });
  return { plan, result };
}
