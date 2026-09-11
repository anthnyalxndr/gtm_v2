import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { resolveContainer } from "@anthnyalxndr/gtm-client";
import type { tagmanager_v2 } from "@googleapis/tagmanager";
import { normalizeExport } from "../spec/normalize.js";
import type { ContainerSpec } from "../spec/types.js";
import type { ContainerSnapshot, ContainerType, SnapshotSource } from "./types.js";

/** Map the API's usageContext values onto one container type. */
export function containerTypeOf(usageContext: readonly string[] | null | undefined): ContainerType {
  const ctx = new Set(usageContext ?? []);
  if (ctx.has("server")) return "server";
  if (ctx.has("web")) return "web";
  if (ctx.has("amp")) return "amp";
  if (ctx.has("android") || ctx.has("androidSdk5")) return "android";
  if (ctx.has("ios") || ctx.has("iosSdk5")) return "ios";
  throw new Error(`Container has no recognised usageContext: ${JSON.stringify(usageContext)}`);
}

type Version = tagmanager_v2.Schema$ContainerVersion;

function entities(
  cv: Version
): Pick<
  ContainerSnapshot,
  | "folder"
  | "variable"
  | "trigger"
  | "tag"
  | "builtInVariable"
  | "gtagConfig"
  | "template"
  | "client"
  | "transformation"
  | "zone"
> {
  return {
    folder: cv.folder ?? [],
    variable: cv.variable ?? [],
    trigger: cv.trigger ?? [],
    tag: cv.tag ?? [],
    builtInVariable: cv.builtInVariable ?? [],
    gtagConfig: cv.gtagConfig ?? [],
    template: cv.customTemplate ?? [],
    client: cv.client ?? [],
    transformation: cv.transformation ?? [],
    zone: cv.zone ?? [],
  };
}

/**
 * Read everything the API exposes for a container: the container, its
 * environments, destinations and version headers, plus the entity collections
 * of one workspace or one version.
 */
export async function pullSnapshot(
  client: GtmClient,
  source: SnapshotSource
): Promise<ContainerSnapshot> {
  if (source.workspace && source.version) {
    throw new Error("A snapshot source names a workspace or a version, not both");
  }
  const ref = await resolveContainer(client, source.container);
  const api = client.service.accounts.containers;
  const [containerRes, envRes, destRes, headersRes] = await Promise.all([
    client.call(() => api.get({ path: ref.path })),
    client.call(() => api.environments.list({ parent: ref.path })),
    client.call(() => api.destinations.list({ parent: ref.path })),
    client.call(() => api.version_headers.list({ parent: ref.path })),
  ]);
  const container = containerRes.data;
  const environments = envRes.data.environment ?? [];
  const headers = headersRes.data.containerVersionHeader ?? [];
  const headerFor = (id: string | null | undefined) =>
    headers.find((h) => h.containerVersionId === id) ?? null;
  const base = {
    pulledAt: new Date().toISOString(),
    source,
    container,
    containerType: containerTypeOf(container.usageContext),
    environments,
    destinations: destRes.data.destination ?? [],
  };

  if (source.workspace) {
    const wsList = await client.call(() => api.workspaces.list({ parent: ref.path }));
    const workspace = (wsList.data.workspace ?? []).find((w) => w.name === source.workspace);
    if (!workspace?.path) {
      throw new Error(`Workspace "${source.workspace}" not found in ${source.container}`);
    }
    const parent = workspace.path;
    const ws = api.workspaces;
    const [
      folder,
      variable,
      trigger,
      tag,
      builtIn,
      gtag,
      template,
      clientRes,
      transformation,
      zone,
    ] = await Promise.all([
      client.call(() => ws.folders.list({ parent })),
      client.call(() => ws.variables.list({ parent })),
      client.call(() => ws.triggers.list({ parent })),
      client.call(() => ws.tags.list({ parent })),
      client.call(() => ws.built_in_variables.list({ parent })),
      client.call(() => ws.gtag_config.list({ parent })),
      client.call(() => ws.templates.list({ parent })),
      client.call(() => ws.clients.list({ parent })),
      client.call(() => ws.transformations.list({ parent })),
      client.call(() => ws.zones.list({ parent })),
    ]);
    const latest = await client.call(() => api.version_headers.latest({ parent: ref.path }));
    return {
      ...base,
      workspace,
      versionHeader: headerFor(latest.data.containerVersionId),
      environment: null,
      folder: folder.data.folder ?? [],
      variable: variable.data.variable ?? [],
      trigger: trigger.data.trigger ?? [],
      tag: tag.data.tag ?? [],
      builtInVariable: builtIn.data.builtInVariable ?? [],
      gtagConfig: gtag.data.gtagConfig ?? [],
      template: template.data.template ?? [],
      client: clientRes.data.client ?? [],
      transformation: transformation.data.transformation ?? [],
      zone: zone.data.zone ?? [],
    };
  }

  let version: Version;
  if (source.version === "live") {
    version = (await client.call(() => api.versions.live({ parent: ref.path }))).data;
  } else {
    let id = source.version;
    if (!id || id === "latest") {
      const latest = await client.call(() => api.version_headers.latest({ parent: ref.path }));
      id = latest.data.containerVersionId ?? undefined;
      if (!id) throw new Error(`Container ${source.container} has no versions yet`);
    }
    version = (await client.call(() => api.versions.get({ path: `${ref.path}/versions/${id}` })))
      .data;
  }
  const versionId = version.containerVersionId ?? null;
  return {
    ...base,
    workspace: null,
    versionHeader: headerFor(versionId),
    environment: environments.find((e) => e.containerVersionId === versionId) ?? null,
    ...entities(version),
  };
}

/** The apply-able part of a snapshot, normalized like an export, tagged with its container type. */
export function snapshotToSpec(snapshot: ContainerSnapshot): ContainerSpec {
  return normalizeExport({
    containerType: snapshot.containerType,
    folder: snapshot.folder,
    variable: snapshot.variable,
    trigger: snapshot.trigger,
    tag: snapshot.tag,
    builtInVariable: snapshot.builtInVariable,
    client: snapshot.client,
    transformation: snapshot.transformation,
  });
}
