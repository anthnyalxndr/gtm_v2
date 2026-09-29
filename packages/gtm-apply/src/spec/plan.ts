import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { resolveContainer, type ContainerRef } from "@anthnyalxndr/gtm-client";
import { listEnabledBuiltIns } from "../resources/builtins.js";
import { matches } from "../resources/entities.js";
import { gtagConfigTagId } from "../resources/gtag-configs.js";
import { builtInTypeForName, referencedVariableNames } from "./catalog.js";
import {
  emptyState,
  toApiTag,
  toApiTrigger,
  toApiVariable,
  type Converted,
  type ExistingState,
} from "./convert.js";
import type { ContainerSpec, EnvironmentSpec, VariableSpec } from "./types.js";
import { assertValidSpec } from "./validate.js";
import { SECTIONS_BY_CONTAINER_TYPE } from "./kinds.js";
import { containerTypeOf } from "../snapshot/pull.js";
import type { ContainerType } from "../snapshot/types.js";
import { toApiClient, toApiTransformation } from "./convert.js";

export type OpKind =
  | "workspace"
  | "builtIn"
  | "folder"
  | "variable"
  | "trigger"
  | "tag"
  | "client"
  | "transformation"
  | "environment"
  | "gtagConfig"
  | "version"
  | "publish";
export type OpAction = "create" | "update" | "unchanged";

export interface PlannedOp {
  kind: OpKind;
  name: string;
  action: OpAction;
  /** True when the engine added this itself (workspace, folder, built-in) rather than the spec. */
  implicit?: boolean;
}

export interface PlanTarget {
  container: string;
  workspace: string;
}

export interface PlanOptions {
  publish?: boolean;
  /** Reconcile the workspace and stop before creating a version, so it stays for review. */
  noVersion?: boolean;
}

export interface Plan {
  target: PlanTarget;
  container: ContainerRef;
  /** null when the workspace does not exist yet. */
  workspacePath: string | null;
  /** The input spec plus implicit folders, with variables sorted by reference. */
  spec: ContainerSpec;
  existing: ExistingState;
  /** The container's custom environments by name; container level, outside any workspace. */
  environments: ReadonlyMap<string, tagmanager_v2.Schema$Environment>;
  ops: PlannedOp[];
  errors: string[];
}

interface Named {
  name?: string | null;
}

const has = (list: readonly Named[] | undefined, name: string): boolean =>
  (list ?? []).some((e) => e.name === name);

export async function loadExisting(
  client: GtmClient,
  workspacePath: string,
  containerType: ContainerType = "web",
  withGtagConfigs = false
): Promise<ExistingState> {
  const ws = client.service.accounts.containers.workspaces;
  const parent = workspacePath;
  const serverKinds = SECTIONS_BY_CONTAINER_TYPE[containerType].includes("client");
  const [folders, variables, triggers, tags, builtIns, clients, transformations] =
    await Promise.all([
      client.call(() => ws.folders.list({ parent })),
      client.call(() => ws.variables.list({ parent })),
      client.call(() => ws.triggers.list({ parent })),
      client.call(() => ws.tags.list({ parent })),
      listEnabledBuiltIns(client, workspacePath),
      serverKinds ? client.call(() => ws.clients.list({ parent })) : null,
      serverKinds ? client.call(() => ws.transformations.list({ parent })) : null,
    ]);
  const state = emptyState(containerType);
  state.raw.folder = folders.data.folder ?? [];
  state.raw.variable = variables.data.variable ?? [];
  state.raw.trigger = triggers.data.trigger ?? [];
  state.raw.tag = tags.data.tag ?? [];
  state.raw.client = clients?.data.client ?? [];
  state.raw.transformation = transformations?.data.transformation ?? [];
  if (withGtagConfigs) {
    const gtag = await client.call(() => ws.gtag_config.list({ parent }));
    state.raw.gtagConfig = gtag.data.gtagConfig ?? [];
  }
  indexState(state);
  state.builtIns = builtIns;
  return state;
}

function indexState(state: ExistingState): void {
  for (const f of state.raw.folder) if (f.name && f.folderId) state.folders.set(f.name, f.folderId);
  for (const v of state.raw.variable) {
    if (v.name && v.variableId) state.variables.set(v.name, v.variableId);
  }
  for (const t of state.raw.trigger) {
    if (t.name && t.triggerId) state.triggers.set(t.name, t.triggerId);
  }
  for (const t of state.raw.tag) if (t.name && t.tagId) state.tags.set(t.name, t.tagId);
  for (const c of state.raw.client) if (c.name && c.clientId) state.clients.set(c.name, c.clientId);
  for (const t of state.raw.transformation) {
    if (t.name && t.transformationId) state.transformations.set(t.name, t.transformationId);
  }
}

/**
 * A new workspace branches from the container's latest version (not the live
 * one), so when the target workspace does not exist yet this is what it will
 * contain. Entity ids are stable across versions and workspaces.
 */
export async function loadExistingFromLatestVersion(
  client: GtmClient,
  containerPath: string,
  containerType: ContainerType = "web"
): Promise<ExistingState> {
  const api = client.service.accounts.containers;
  const header = await client.call(() => api.version_headers.latest({ parent: containerPath }));
  const versionId = header.data.containerVersionId;
  const state = emptyState(containerType);
  if (!versionId) return state;
  const version = await client.call(() =>
    api.versions.get({ path: `${containerPath}/versions/${versionId}` })
  );
  const cv = version.data;
  state.raw.folder = cv.folder ?? [];
  state.raw.variable = cv.variable ?? [];
  state.raw.trigger = cv.trigger ?? [];
  state.raw.tag = cv.tag ?? [];
  state.raw.client = cv.client ?? [];
  state.raw.transformation = cv.transformation ?? [];
  state.raw.gtagConfig = cv.gtagConfig ?? [];
  indexState(state);
  for (const b of cv.builtInVariable ?? []) if (b.type) state.builtIns.add(b.type);
  return state;
}

/** Order variables so that any variable a {{ }} reference points at comes first. */
export function sortVariablesByReference(variables: readonly VariableSpec[]): VariableSpec[] {
  const names = new Set(variables.map((v) => v.name ?? ""));
  const deps = new Map<VariableSpec, string[]>();
  for (const v of variables) {
    deps.set(
      v,
      [...referencedVariableNames(v)].filter((n) => n !== v.name && names.has(n))
    );
  }
  const done = new Set<string>();
  const remaining = [...variables];
  const ordered: VariableSpec[] = [];
  while (remaining.length > 0) {
    const idx = remaining.findIndex((v) => (deps.get(v) ?? []).every((d) => done.has(d)));
    if (idx < 0) {
      throw new Error(
        `Variable references form a cycle: ${remaining.map((v) => `"${v.name}"`).join(", ")}`
      );
    }
    const [next] = remaining.splice(idx, 1);
    ordered.push(next);
    done.add(next.name ?? "");
  }
  return ordered;
}

export async function planContainerSpec(
  client: GtmClient,
  target: PlanTarget,
  input: ContainerSpec,
  options: PlanOptions = {}
): Promise<Plan> {
  assertValidSpec(input);
  if (options.noVersion && options.publish) {
    throw new Error("publish needs a version: drop the no-version option or the publish option");
  }
  const container = await resolveContainer(client, target.container);
  const containerType = containerTypeOf(container.usageContext);
  const ops: PlannedOp[] = [];
  const errors: string[] = [];
  if (input.containerType && input.containerType !== containerType) {
    errors.push(
      `spec is for a ${input.containerType} container but ${target.container} is a ${containerType} container`
    );
  }
  const allowed = SECTIONS_BY_CONTAINER_TYPE[containerType];
  for (const section of ["client", "transformation"] as const) {
    if (input[section]?.length && !allowed.includes(section)) {
      errors.push(`${section} entities are not supported by a ${containerType} container`);
    }
  }
  if (errors.length > 0) {
    return {
      target,
      container,
      workspacePath: null,
      spec: input,
      existing: emptyState(containerType),
      environments: new Map(),
      ops,
      errors,
    };
  }
  const wsApi = client.service.accounts.containers.workspaces;
  const wsList = await client.call(() => wsApi.list({ parent: container.path }));
  const found = (wsList.data.workspace ?? []).find((w) => w.name === target.workspace);
  const workspacePath = found?.path ?? null;
  const withGtagConfigs = (input.gtagConfig?.length ?? 0) > 0;
  const existing = workspacePath
    ? await loadExisting(client, workspacePath, containerType, withGtagConfigs)
    : await loadExistingFromLatestVersion(client, container.path, containerType);

  ops.push({
    kind: "workspace",
    name: target.workspace,
    action: workspacePath ? "unchanged" : "create",
    implicit: !workspacePath,
  });

  let sortedVariables: VariableSpec[] = input.variable ?? [];
  try {
    sortedVariables = sortVariablesByReference(sortedVariables);
  } catch (err) {
    errors.push((err as Error).message);
  }
  const spec: ContainerSpec = {
    ...input,
    folder: [...(input.folder ?? [])],
    variable: sortedVariables,
    trigger: input.trigger ?? [],
    tag: input.tag ?? [],
    client: input.client ?? [],
    transformation: input.transformation ?? [],
  };

  // Duplicate names within a kind.
  for (const kind of [
    "folder",
    "variable",
    "trigger",
    "tag",
    "client",
    "transformation",
  ] as const) {
    const seen = new Set<string>();
    for (const e of spec[kind] ?? []) {
      if (!e.name) {
        errors.push(`${kind} entry without a name`);
        continue;
      }
      if (seen.has(e.name)) errors.push(`duplicate ${kind} name "${e.name}" in spec`);
      if (e.name.includes(":")) {
        errors.push(`${kind} name "${e.name}" contains ":", which Tag Manager rejects`);
      }
      seen.add(e.name);
    }
  }

  // Folders: declared plus referenced (implicit).
  const declaredFolders = new Set((input.folder ?? []).map((f) => f.name));
  for (const e of [
    ...spec.variable!,
    ...spec.trigger!,
    ...spec.tag!,
    ...spec.client!,
    ...spec.transformation!,
  ]) {
    const f = e.parentFolderName;
    if (f && !has(spec.folder, f) && !existing.folders.has(f)) spec.folder!.push({ name: f });
  }
  for (const f of spec.folder!) {
    ops.push({
      kind: "folder",
      name: f.name,
      action: existing.folders.has(f.name) ? "unchanged" : "create",
      implicit: !declaredFolders.has(f.name),
    });
  }

  // Built-ins: declared plus inferred from {{ }} references (implicit).
  const declaredBuiltIns = new Set(input.builtInVariable ?? []);
  const builtIns = new Set(declaredBuiltIns);
  for (const name of referencedVariableNames([
    spec.variable,
    spec.trigger,
    spec.tag,
    spec.client,
    spec.transformation,
  ])) {
    if (name.startsWith("_")) continue;
    if (has(spec.variable, name) || existing.variables.has(name)) continue;
    const type = builtInTypeForName(name, containerType);
    if (type) {
      builtIns.add(type);
      continue;
    }
    errors.push(
      `{{${name}}} is referenced but is not in the spec, the container, or the built-in catalog`
    );
  }
  for (const type of builtIns) {
    ops.push({
      kind: "builtIn",
      name: type,
      action: existing.builtIns.has(type) ? "unchanged" : "create",
      implicit: !declaredBuiltIns.has(type),
    });
  }
  spec.builtInVariable = [...builtIns];

  // Tag trigger references.
  for (const tag of spec.tag!) {
    for (const ref of [...(tag.firingTriggerName ?? []), ...(tag.blockingTriggerName ?? [])]) {
      if (!has(spec.trigger, ref) && !existing.triggers.has(ref)) {
        errors.push(
          `tag "${tag.name}" fires on trigger "${ref}", which is not in the spec or the container`
        );
      }
    }
  }

  const planEntities = <S extends Named, A extends Named>(
    kind: "variable" | "trigger" | "tag" | "client" | "transformation",
    items: readonly S[],
    current: readonly A[],
    convert: (item: S) => Converted<unknown>
  ): void => {
    for (const item of items) {
      if (!item.name) continue;
      const cur = current.find((c) => c.name === item.name);
      if (!cur) {
        ops.push({ kind, name: item.name, action: "create" });
        continue;
      }
      const { body, unresolved } = convert(item);
      ops.push({
        kind,
        name: item.name,
        action: unresolved.length === 0 && matches(cur, body) ? "unchanged" : "update",
      });
    }
  };
  planEntities("variable", spec.variable!, existing.raw.variable, (v) =>
    toApiVariable(v, existing)
  );
  planEntities("client", spec.client!, existing.raw.client, (c) => toApiClient(c, existing));
  planEntities("transformation", spec.transformation!, existing.raw.transformation, (t) =>
    toApiTransformation(t, existing)
  );
  planEntities("trigger", spec.trigger!, existing.raw.trigger, (t) => toApiTrigger(t, existing));
  planEntities("tag", spec.tag!, existing.raw.tag, (t) => toApiTag(t, existing));

  // A version is only created when something changed or a publish was requested;
  // creating one deletes the workspace, so an unchanged run leaves it in place.
  // Gtag configs have no name; their tagId parameter identifies them.
  for (const config of input.gtagConfig ?? []) {
    const tagId = gtagConfigTagId(config) ?? "";
    const current = existing.raw.gtagConfig.find((c) => gtagConfigTagId(c) === tagId);
    ops.push({
      kind: "gtagConfig",
      name: tagId,
      action: !current ? "create" : matches(current, config) ? "unchanged" : "update",
    });
  }

  // Environments are container level: applied outside the workspace, never in a version.
  const environments = await loadCustomEnvironments(client, container.path);
  for (const env of input.environment ?? []) {
    const current = environments.get(env.name);
    ops.push({
      kind: "environment",
      name: env.name,
      action: !current ? "create" : environmentChanged(current, env) ? "update" : "unchanged",
    });
  }

  const changed = ops.some(
    (o) => o.action !== "unchanged" && o.kind !== "workspace" && o.kind !== "environment"
  );
  if (!options.noVersion && (changed || options.publish)) {
    ops.push({ kind: "version", name: target.workspace, action: "create" });
  }
  if (options.publish) ops.push({ kind: "publish", name: target.workspace, action: "create" });

  return { target, container, workspacePath, spec, existing, environments, ops, errors };
}

/** A container's custom (type user) environments by name. */
async function loadCustomEnvironments(
  client: GtmClient,
  containerPath: string
): Promise<Map<string, tagmanager_v2.Schema$Environment>> {
  const api = client.service.accounts.containers.environments;
  const res = await client.call(() => api.list({ parent: containerPath }));
  return new Map(
    (res.data.environment ?? [])
      .filter((e) => e.type === "user" && e.name)
      .map((e) => [e.name as string, e])
  );
}

/** Whether a spec environment differs from the container's, treating absent as empty or false. */
export function environmentChanged(
  current: tagmanager_v2.Schema$Environment,
  env: EnvironmentSpec
): boolean {
  return (
    (current.description ?? "") !== (env.description ?? "") ||
    (current.url ?? "") !== (env.url ?? "") ||
    Boolean(current.enableDebug) !== Boolean(env.enableDebug)
  );
}

const LABEL: Record<OpAction, string> = { create: "[+]", update: "[~]", unchanged: "[=]" };

export function formatPlan(plan: Plan): string {
  const lines = [
    `Container ${plan.target.container} (${plan.container.name}), workspace "${plan.target.workspace}"`,
  ];
  const line = (op: PlannedOp) =>
    `${LABEL[op.action]} ${op.kind} "${op.name}"${op.implicit ? " (implicit)" : ""}`;
  const environmentOps = plan.ops.filter((op) => op.kind === "environment");
  for (const op of plan.ops) if (op.kind !== "environment") lines.push(line(op));
  if (environmentOps.length > 0) {
    lines.push("Environments (container level, not versioned):");
    for (const op of environmentOps) lines.push(line(op));
  }
  if (plan.errors.length > 0) {
    lines.push(`Plan has ${plan.errors.length} error(s):`);
    for (const e of plan.errors) lines.push(`[!] ${e}`);
  }
  return lines.join("\n");
}
