import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { resolveContainer } from "@anthnyalxndr/gtm-client";
import type { tagmanager_v2 } from "@googleapis/tagmanager";
import { normalizeExport } from "../spec/normalize.js";
import type { ContainerSpec } from "../spec/types.js";
import type { ApiSnapshotData, ContainerType, SnapshotSource } from "./types.js";

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
  ApiSnapshotData,
  | "folder"
  | "variable"
  | "trigger"
  | "tag"
  | "builtInVariable"
  | "gtagConfig"
  | "customTemplate"
  | "client"
  | "transformation"
> {
  return {
    folder: cv.folder ?? [],
    variable: cv.variable ?? [],
    trigger: cv.trigger ?? [],
    tag: cv.tag ?? [],
    builtInVariable: cv.builtInVariable ?? [],
    gtagConfig: cv.gtagConfig ?? [],
    customTemplate: cv.customTemplate ?? [],
    client: cv.client ?? [],
    transformation: cv.transformation ?? [],
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
): Promise<ApiSnapshotData> {
  if (source.workspace && source.version) {
    throw new Error("A snapshot source names a workspace or a version, not both");
  }
  const ref = await resolveContainer(client, source.container);
  const api = client.service.accounts.containers;
  const [containerRes, envRes, destRes, headersRes, liveRes] = await Promise.all([
    client.call(() => api.get({ path: ref.path })),
    client.call(() => api.environments.list({ parent: ref.path })),
    client.call(() => api.destinations.list({ parent: ref.path })),
    client.call(() => api.version_headers.list({ parent: ref.path })),
    client.call(() => api.versions.live({ parent: ref.path })),
  ]);
  const container = containerRes.data;
  const environments = envRes.data.environment ?? [];
  const headers = headersRes.data.containerVersionHeader ?? [];
  const headerFor = (id: string | null | undefined) =>
    headers.find((h) => h.containerVersionId === id) ?? null;
  // Version 0 is the empty version every container starts with; live at 0 means nothing was published.
  const liveVersionId =
    liveRes.data.containerVersionId && liveRes.data.containerVersionId !== "0"
      ? liveRes.data.containerVersionId
      : null;
  const byType = (type: string) => environments.find((e) => e.type === type) ?? null;
  const base = {
    pulledAt: new Date().toISOString(),
    source,
    container,
    containerType: containerTypeOf(container.usageContext),
    liveVersionId,
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
    const [folder, variable, trigger, tag, builtIn, gtag, template, clientRes, transformation] =
      await Promise.all([
        client.call(() => ws.folders.list({ parent })),
        client.call(() => ws.variables.list({ parent })),
        client.call(() => ws.triggers.list({ parent })),
        client.call(() => ws.tags.list({ parent })),
        client.call(() => ws.built_in_variables.list({ parent })),
        client.call(() => ws.gtag_config.list({ parent })),
        client.call(() => ws.templates.list({ parent })),
        client.call(() => ws.clients.list({ parent })),
        client.call(() => ws.transformations.list({ parent })),
      ]);
    const latest = await client.call(() => api.version_headers.latest({ parent: ref.path }));
    return {
      ...base,
      workspace,
      containerVersionHeader: headerFor(latest.data.containerVersionId),
      environment: null,
      published: false,
      folder: folder.data.folder ?? [],
      variable: variable.data.variable ?? [],
      trigger: trigger.data.trigger ?? [],
      tag: tag.data.tag ?? [],
      builtInVariable: builtIn.data.builtInVariable ?? [],
      gtagConfig: gtag.data.gtagConfig ?? [],
      customTemplate: template.data.template ?? [],
      client: clientRes.data.client ?? [],
      transformation: transformation.data.transformation ?? [],
    };
  }

  let version: Version;
  let environment: tagmanager_v2.Schema$Environment | null;
  if (source.version === "live") {
    version = liveRes.data;
    environment = byType("live");
  } else if (!source.version || source.version === "latest") {
    const latest = await client.call(() => api.version_headers.latest({ parent: ref.path }));
    const id = latest.data.containerVersionId;
    if (!id) throw new Error(`Container ${source.container} has no versions yet`);
    version = (await client.call(() => api.versions.get({ path: `${ref.path}/versions/${id}` })))
      .data;
    environment = byType("latest");
  } else {
    const id = source.version;
    version = (await client.call(() => api.versions.get({ path: `${ref.path}/versions/${id}` })))
      .data;
    const latest = await client.call(() => api.version_headers.latest({ parent: ref.path }));
    // Only custom environments carry a version id; Live and Latest are matched by what they serve.
    environment =
      environments.find(
        (e) => e.type !== "live" && e.type !== "latest" && e.containerVersionId === id
      ) ??
      (id === liveVersionId ? byType("live") : null) ??
      (id === latest.data.containerVersionId ? byType("latest") : null);
  }
  const versionId = version.containerVersionId ?? null;
  return {
    ...base,
    workspace: null,
    containerVersionHeader: headerFor(versionId),
    environment,
    published: versionId !== null && versionId === liveVersionId,
    ...entities(version),
  };
}

/** The apply-able part of a snapshot, normalized like an export, tagged with its container type. */
export function snapshotToSpec(snapshot: ApiSnapshotData): ContainerSpec {
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
