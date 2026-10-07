import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { ensureWorkspace, workspaceStatus, workspaceUrl } from "../resources/workspaces.js";
import { checkPublishPermission } from "../resources/permissions.js";
import { matches } from "../resources/entities.js";
import { gtagConfigTagId } from "../resources/gtag-configs.js";
import { ensureBuiltIns } from "../resources/builtins.js";
import {
  ensureClient,
  ensureFolder,
  ensureTag,
  ensureTransformation,
  ensureTrigger,
  ensureVariable,
  type EnsureAction,
} from "../resources/entities.js";
import {
  toApiClient,
  toApiTag,
  toApiTransformation,
  toApiTrigger,
  toApiVariable,
  type Unresolved,
} from "./convert.js";
import {
  environmentChanged,
  planContainerSpec,
  versionName,
  wantsVersion,
  type OpAction,
  type Plan,
  type PlanOptions,
  type PlannedOp,
} from "./plan.js";
import type { ContainerSpec } from "./types.js";

export type ExecuteOptions = PlanOptions;

export interface ApplyResult {
  /** The workspace written to. Tag Manager deletes it once a version is created from it. */
  workspacePath: string;
  ops: PlannedOp[];
  /** Set when a version was created: asked for with `version` or `publish`, and the workspace held changes. */
  versionPath?: string;
  published: boolean;
  /** The workspace's Tag Manager page, set when the workspace is left in place. */
  workspaceUrl?: string;
  /** Checks that could not run, such as a publish permission that could not be read. */
  warnings: string[];
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

  for (const c of plan.spec.client ?? []) {
    const name = c.name ?? "";
    const { body, unresolved } = toApiClient(c, ids);
    assertResolved("client", name, unresolved);
    const r = await ensureClient(client, ws.path, body);
    if (r.entity.clientId) ids.clients.set(name, r.entity.clientId);
    ops.push({ kind: "client", name, action: toOpAction(r.action) });
  }

  for (const t of plan.spec.transformation ?? []) {
    const name = t.name ?? "";
    const { body, unresolved } = toApiTransformation(t, ids);
    assertResolved("transformation", name, unresolved);
    const r = await ensureTransformation(client, ws.path, body);
    if (r.entity.transformationId) ids.transformations.set(name, r.entity.transformationId);
    ops.push({ kind: "transformation", name, action: toOpAction(r.action) });
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

  // Gtag configs, by tagId, after variables (their parameters may reference them). Read
  // from the workspace itself: a new workspace holds the latest version's configs.
  const gtagConfigs = plan.spec.gtagConfig ?? [];
  if (gtagConfigs.length > 0) {
    const gtagApi = client.service.accounts.containers.workspaces.gtag_config;
    const listed = await client.call(() => gtagApi.list({ parent: ws.path }));
    const inWorkspace = listed.data.gtagConfig ?? [];
    for (const config of gtagConfigs) {
      const tagId = gtagConfigTagId(config) ?? "";
      const current = inWorkspace.find((c) => gtagConfigTagId(c) === tagId);
      if (!current) {
        await client.call(() => gtagApi.create({ parent: ws.path, requestBody: config }));
        ops.push({ kind: "gtagConfig", name: tagId, action: "create" });
      } else if (!matches(current, config)) {
        await client.call(() =>
          gtagApi.update({
            path: current.path!,
            fingerprint: current.fingerprint ?? undefined,
            requestBody: config,
          })
        );
        ops.push({ kind: "gtagConfig", name: tagId, action: "update" });
      } else {
        ops.push({ kind: "gtagConfig", name: tagId, action: "unchanged" });
      }
    }
  }

  // Container level: environments are written outside the workspace and never versioned.
  const envApi = client.service.accounts.containers.environments;
  for (const env of plan.spec.environment ?? []) {
    const current = plan.environments.get(env.name);
    const body = { ...env, type: "user" };
    if (!current) {
      await client.call(() => envApi.create({ parent: plan.container.path, requestBody: body }));
      ops.push({ kind: "environment", name: env.name, action: "create" });
    } else if (environmentChanged(current, env)) {
      await client.call(() =>
        envApi.update({
          path: current.path!,
          fingerprint: current.fingerprint ?? undefined,
          requestBody: { ...current, ...body },
        })
      );
      ops.push({ kind: "environment", name: env.name, action: "update" });
    } else {
      ops.push({ kind: "environment", name: env.name, action: "unchanged" });
    }
  }

  const warnings: string[] = [];
  const kept: ApplyResult = {
    workspacePath: ws.path,
    ops,
    published: false,
    workspaceUrl: workspaceUrl(ws.path),
    warnings,
  };
  if (!wantsVersion(options)) return kept;

  const status = await workspaceStatus(client, ws.path);
  if (status.mergeConflicts > 0) {
    throw new Error(
      `Workspace "${ws.name}" has ${status.mergeConflicts} merge conflict(s). Resolve them in the GTM UI before creating a version.`
    );
  }

  // Creating a version deletes the workspace, and a fresh workspace branches
  // from the latest version, so a version is only worth creating when the
  // workspace differs from it: this run changed something, or an earlier apply
  // left changes behind. A publish always versions.
  const changed = ops.some(
    (o) => o.action !== "unchanged" && o.kind !== "workspace" && o.kind !== "environment"
  );
  if (!changed && status.changes === 0 && !options.publish) return kept;

  // Publishing a version the caller may not publish would leave an unpublished
  // version and no workspace, so check first, while the workspace is still here.
  if (options.publish) {
    const permission = await checkPublishPermission(client, plan.container);
    if (permission.outcome === "missing") {
      const holders =
        permission.holders.length > 0
          ? `Publish is held by: ${permission.holders.join(", ")}.`
          : "No user holds Publish on it.";
      throw new Error(
        `${permission.email} does not hold Publish on container ${plan.container.publicId} (${plan.container.name}), so no version was created. ${holders} ` +
          `The workspace "${ws.name}" keeps the applied changes: ${workspaceUrl(ws.path)}`
      );
    }
    if (permission.outcome === "unknown") {
      warnings.push(`Publish permission not checked: ${permission.reason}`);
    }
  }

  const name = versionName(options, plan.target.workspace);
  const wsApi = client.service.accounts.containers.workspaces;
  const versionRes = await client.call(() =>
    wsApi.create_version({ path: ws.path, requestBody: versionRequest(name, options) })
  );
  const versionPath = versionRes.data.containerVersion?.path ?? undefined;
  if (!versionPath) throw new Error("create_version returned no container version path");
  ops.push({ kind: "version", name, action: "create" });

  let published = false;
  if (options.publish) {
    await client.call(() =>
      client.service.accounts.containers.versions.publish({ path: versionPath })
    );
    ops.push({ kind: "publish", name, action: "create" });
    published = true;
    // Publishing returns before anything else is known; confirm the live version is ours.
    const createdId =
      versionRes.data.containerVersion?.containerVersionId ?? versionPath.split("/").pop();
    const live = await client.call(() =>
      client.service.accounts.containers.versions.live({ parent: plan.container.path })
    );
    if (live.data.containerVersionId !== createdId) {
      throw new Error(
        `Published version ${createdId}, but the live version is ${live.data.containerVersionId ?? "unknown"}`
      );
    }
  }

  return { workspacePath: ws.path, ops, versionPath, published, warnings };
}

/**
 * The create_version request body. The API reads only name and notes, and
 * stores notes as the version's description; typed so an unknown field fails.
 */
function versionRequest(
  name: string,
  options: ExecuteOptions
): tagmanager_v2.Schema$CreateContainerVersionRequestVersionOptions {
  const notes = typeof options.version === "object" ? options.version.notes : undefined;
  return notes === undefined ? { name } : { name, notes };
}

export interface ApplySpecOptions extends PlanOptions {
  container: string;
  workspace: string;
  spec: ContainerSpec;
  dryRun?: boolean;
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
  const planOptions: PlanOptions = { version: options.version, publish: options.publish };
  const plan = await planContainerSpec(
    client,
    { container: options.container, workspace: options.workspace },
    options.spec,
    planOptions
  );
  if (options.dryRun) return { plan };
  const result = await executePlan(client, plan, planOptions);
  return { plan, result };
}
