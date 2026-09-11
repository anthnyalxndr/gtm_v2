import type { tagmanager_v2 } from "@googleapis/tagmanager";

type Tag = tagmanager_v2.Schema$Tag;
type Trigger = tagmanager_v2.Schema$Trigger;
type Variable = tagmanager_v2.Schema$Variable;
type Folder = tagmanager_v2.Schema$Folder;
type Workspace = tagmanager_v2.Schema$Workspace;
type Client = tagmanager_v2.Schema$Client;
type Transformation = tagmanager_v2.Schema$Transformation;
type CustomTemplate = tagmanager_v2.Schema$CustomTemplate;
type GtagConfig = tagmanager_v2.Schema$GtagConfig;
type Environment = tagmanager_v2.Schema$Environment;
type Destination = tagmanager_v2.Schema$Destination;

export interface FakeAccount {
  accountId: string;
  name: string;
}
export interface FakeContainer {
  accountId: string;
  containerId: string;
  publicId: string;
  name: string;
  /** Defaults to ["web"]. */
  usageContext?: string[];
}

export interface FakeSeed {
  accounts?: FakeAccount[];
  containers?: FakeContainer[];
  /** Container-level environments; give each a path under its container. */
  environments?: Environment[];
  /** Linked Google tag destinations; give each a path under its container. */
  destinations?: Destination[];
}

/** Workspace-scoped entity collections, as captured by a version. */
export interface FakeEntities {
  folder: Folder[];
  variable: Variable[];
  trigger: Trigger[];
  tag: Tag[];
  client: Client[];
  transformation: Transformation[];
  template: CustomTemplate[];
  gtagConfig: GtagConfig[];
  builtIns: string[];
}

export interface FakeState {
  accounts: FakeAccount[];
  containers: FakeContainer[];
  workspaces: Workspace[];
  folders: Folder[];
  tags: Tag[];
  triggers: Trigger[];
  variables: Variable[];
  clients: Client[];
  transformations: Transformation[];
  templates: CustomTemplate[];
  gtagConfigs: GtagConfig[];
  environments: Environment[];
  destinations: Destination[];
  builtIns: { workspacePath: string; type: string }[];
  versions: {
    path: string;
    versionId: string;
    name?: string;
    snapshot: FakeEntities;
  }[];
  published: string[];
  calls: string[];
  mergeConflicts: number;
}

let idCounter = 0;
const nextId = (): string => String(++idCounter);

/** Mutates in place: the collections hold references to these arrays. */
function removeWorkspace(state: FakeState, wsPath: string): void {
  const prune = <T>(items: T[], drop: (e: T) => boolean): void => {
    for (let i = items.length - 1; i >= 0; i -= 1) if (drop(items[i])) items.splice(i, 1);
  };
  const inWs = (e: { path?: string | null }) => !!e.path?.startsWith(wsPath + "/");
  prune(state.folders, inWs);
  prune(state.variables, inWs);
  prune(state.triggers, inWs);
  prune(state.tags, inWs);
  prune(state.clients, inWs);
  prune(state.transformations, inWs);
  prune(state.templates, inWs);
  prune(state.gtagConfigs, inWs);
  prune(state.builtIns, (b) => b.workspacePath === wsPath);
  prune(state.workspaces, (w) => w.path === wsPath);
}

/** Entities as captured by the most recent version. */
export function latestSnapshot(state: FakeState): FakeEntities {
  const v = state.versions[state.versions.length - 1];
  if (!v) throw new Error("no version has been created");
  return v.snapshot;
}

interface Named {
  name?: string | null;
  path?: string | null;
  fingerprint?: string | null;
}

export function emptyEntities(): FakeEntities {
  return {
    folder: [],
    variable: [],
    trigger: [],
    tag: [],
    client: [],
    transformation: [],
    template: [],
    gtagConfig: [],
    builtIns: [],
  };
}

/** The entity fields of a ContainerVersion response, keyed as the API keys them. */
function versionBody(e: FakeEntities) {
  return {
    tag: e.tag,
    trigger: e.trigger,
    variable: e.variable,
    folder: e.folder,
    client: e.client,
    transformation: e.transformation,
    customTemplate: e.template,
    gtagConfig: e.gtagConfig,
    builtInVariable: e.builtIns.map((t) => ({ type: t })),
  };
}

function collection<T extends Named>(state: FakeState, store: T[], idKey: string, kind: string) {
  return {
    list: async ({ parent }: { parent: string }) => {
      state.calls.push(`${kind}.list`);
      const items = store.filter((e) => e.path?.startsWith(parent + "/"));
      return { data: { [kind]: items } };
    },
    create: async ({ parent, requestBody }: { parent: string; requestBody: T }) => {
      state.calls.push(`${kind}.create`);
      const id = nextId();
      const entity = {
        ...requestBody,
        [idKey]: id,
        path: `${parent}/${kind}/${id}`,
        fingerprint: "1",
      } as T;
      store.push(entity);
      return { data: entity };
    },
    update: async ({
      path,
      fingerprint,
      requestBody,
    }: {
      path: string;
      fingerprint?: string;
      requestBody: T;
    }) => {
      state.calls.push(`${kind}.update`);
      const idx = store.findIndex((e) => e.path === path);
      if (idx < 0) throw Object.assign(new Error("not found"), { code: 404 });
      const current = store[idx];
      if (fingerprint !== current.fingerprint) {
        throw Object.assign(new Error("fingerprint mismatch"), { code: 412 });
      }
      const idValue = (current as Record<string, unknown>)[idKey];
      const updated = {
        ...requestBody,
        [idKey]: idValue,
        path,
        fingerprint: String(Number(fingerprint) + 1),
      } as T;
      store[idx] = updated;
      return { data: updated };
    },
  };
}

export function createFakeService(seed: FakeSeed = {}): {
  service: tagmanager_v2.Tagmanager;
  state: FakeState;
} {
  const state: FakeState = {
    accounts: seed.accounts ?? [{ accountId: "1", name: "Acme" }],
    containers: seed.containers ?? [
      { accountId: "1", containerId: "10", publicId: "GTM-ABC123", name: "acme.com" },
    ],
    workspaces: [],
    folders: [],
    tags: [],
    triggers: [],
    variables: [],
    clients: [],
    transformations: [],
    templates: [],
    gtagConfigs: [],
    environments: seed.environments ?? [],
    destinations: seed.destinations ?? [],
    builtIns: [],
    versions: [],
    published: [],
    calls: [],
    mergeConflicts: 0,
  };

  const service = {
    accounts: {
      list: async () => {
        state.calls.push("accounts.list");
        return {
          data: { account: state.accounts.map((a) => ({ ...a, path: `accounts/${a.accountId}` })) },
        };
      },
      containers: {
        list: async ({ parent }: { parent: string }) => {
          state.calls.push("containers.list");
          const accountId = parent.split("/")[1];
          return {
            data: {
              container: state.containers
                .filter((c) => c.accountId === accountId)
                .map((c) => ({
                  ...c,
                  usageContext: c.usageContext ?? ["web"],
                  path: `accounts/${c.accountId}/containers/${c.containerId}`,
                })),
            },
          };
        },
        get: async ({ path }: { path: string }) => {
          state.calls.push("containers.get");
          const c = state.containers.find(
            (x) => `accounts/${x.accountId}/containers/${x.containerId}` === path
          );
          if (!c) throw Object.assign(new Error("container not found"), { code: 404 });
          return { data: { ...c, usageContext: c.usageContext ?? ["web"], path } };
        },
        environments: {
          list: async ({ parent }: { parent: string }) => {
            state.calls.push("environments.list");
            return {
              data: {
                environment: state.environments.filter((e) => e.path?.startsWith(parent + "/")),
              },
            };
          },
        },
        destinations: {
          list: async ({ parent }: { parent: string }) => {
            state.calls.push("destinations.list");
            return {
              data: {
                destination: state.destinations.filter((d) => d.path?.startsWith(parent + "/")),
              },
            };
          },
        },
        create: async ({
          parent,
          requestBody,
        }: {
          parent: string;
          requestBody: { name?: string | null; usageContext?: string[] | null };
        }) => {
          state.calls.push("containers.create");
          const accountId = parent.split("/")[1];
          const containerId = nextId();
          const created: FakeContainer = {
            accountId,
            containerId,
            publicId: `GTM-NEW${containerId}`,
            name: requestBody.name ?? "",
            usageContext: requestBody.usageContext ?? ["web"],
          };
          state.containers.push(created);
          return {
            data: { ...created, path: `accounts/${accountId}/containers/${containerId}` },
          };
        },
        version_headers: {
          list: async ({ parent }: { parent: string }) => {
            state.calls.push("version_headers.list");
            return {
              data: {
                containerVersionHeader: state.versions
                  .filter((v) => v.path.startsWith(parent + "/"))
                  .map((v) => ({
                    containerVersionId: v.versionId,
                    path: v.path,
                    name: v.name,
                    numTags: String(v.snapshot.tag.length),
                    numClients: String(v.snapshot.client.length),
                  })),
              },
            };
          },
          latest: async ({ parent }: { parent: string }) => {
            state.calls.push("version_headers.latest");
            const mine = state.versions.filter((v) => v.path.startsWith(parent + "/"));
            const latest = mine[mine.length - 1];
            return {
              data: latest
                ? { containerVersionId: latest.versionId, path: latest.path, name: latest.name }
                : { path: `${parent}/versions/0` },
            };
          },
        },
        versions: {
          publish: async ({ path }: { path: string }) => {
            state.calls.push("versions.publish");
            state.published.push(path);
            return { data: { containerVersion: { path } } };
          },
          get: async ({ path }: { path: string }) => {
            state.calls.push("versions.get");
            const v = state.versions.find((x) => x.path === path);
            if (!v) throw Object.assign(new Error("version not found"), { code: 404 });
            return {
              data: {
                path: v.path,
                containerVersionId: v.versionId,
                name: v.name,
                ...versionBody(v.snapshot),
              },
            };
          },
          live: async ({ parent }: { parent: string }) => {
            state.calls.push("versions.live");
            const livePath = [...state.published].reverse().find((p) => p.startsWith(parent + "/"));
            const v = state.versions.find((x) => x.path === livePath);
            return {
              data: {
                path: v?.path ?? `${parent}/versions/0`,
                containerVersionId: v?.versionId ?? "0",
                name: v?.name,
                ...versionBody(v?.snapshot ?? emptyEntities()),
              },
            };
          },
        },
        workspaces: {
          ...collection(state, state.workspaces, "workspaceId", "workspace"),
          // A new workspace branches from the latest version: clone its entities in.
          create: async ({ parent, requestBody }: { parent: string; requestBody: Workspace }) => {
            state.calls.push("workspace.create");
            const id = nextId();
            const wsPath = `${parent}/workspace/${id}`;
            const ws = { ...requestBody, workspaceId: id, path: wsPath, fingerprint: "1" };
            state.workspaces.push(ws);
            const mine = state.versions.filter((v) => v.path.startsWith(parent + "/"));
            const latest = mine[mine.length - 1];
            if (latest) {
              const clone = <T extends Named>(
                items: T[],
                idKey: string,
                kind: string,
                store: T[]
              ) => {
                for (const e of items) {
                  const idValue = (e as Record<string, unknown>)[idKey];
                  store.push({ ...e, path: `${wsPath}/${kind}/${idValue}`, fingerprint: "1" });
                }
              };
              clone(latest.snapshot.folder, "folderId", "folder", state.folders);
              clone(latest.snapshot.variable, "variableId", "variable", state.variables);
              clone(latest.snapshot.trigger, "triggerId", "trigger", state.triggers);
              clone(latest.snapshot.tag, "tagId", "tag", state.tags);
              clone(latest.snapshot.client, "clientId", "client", state.clients);
              clone(
                latest.snapshot.transformation,
                "transformationId",
                "transformation",
                state.transformations
              );
              clone(latest.snapshot.template, "templateId", "template", state.templates);
              clone(latest.snapshot.gtagConfig, "gtagConfigId", "gtagConfig", state.gtagConfigs);
              for (const t of latest.snapshot.builtIns)
                state.builtIns.push({ workspacePath: wsPath, type: t });
            }
            return { data: ws };
          },
          delete: async ({ path }: { path: string }) => {
            state.calls.push("workspace.delete");
            removeWorkspace(state, path);
            return { data: {} };
          },
          getStatus: async () => {
            state.calls.push("workspaces.getStatus");
            return {
              data: {
                mergeConflict: Array.from({ length: state.mergeConflicts }, () => ({})),
                workspaceChange: [],
              },
            };
          },
          create_version: async ({
            path,
            requestBody,
          }: {
            path: string;
            requestBody: { name?: string };
          }) => {
            state.calls.push("workspaces.create_version");
            const versionId = nextId();
            const versionPath = path.replace(/\/workspace\/\d+$/, `/versions/${versionId}`);
            const inWs = <T extends Named>(items: T[]): T[] =>
              items.filter((e) => e.path?.startsWith(path + "/")).map((e) => ({ ...e }));
            state.versions.push({
              path: versionPath,
              versionId,
              name: requestBody.name,
              snapshot: {
                folder: inWs(state.folders),
                variable: inWs(state.variables),
                trigger: inWs(state.triggers),
                tag: inWs(state.tags),
                client: inWs(state.clients),
                transformation: inWs(state.transformations),
                template: inWs(state.templates),
                gtagConfig: inWs(state.gtagConfigs),
                builtIns: state.builtIns.filter((b) => b.workspacePath === path).map((b) => b.type),
              },
            });
            // Tag Manager deletes the workspace once a version is created from it.
            removeWorkspace(state, path);
            return { data: { containerVersion: { path: versionPath } } };
          },
          folders: collection(state, state.folders, "folderId", "folder"),
          tags: collection(state, state.tags, "tagId", "tag"),
          triggers: collection(state, state.triggers, "triggerId", "trigger"),
          variables: collection(state, state.variables, "variableId", "variable"),
          clients: collection(state, state.clients, "clientId", "client"),
          transformations: collection(
            state,
            state.transformations,
            "transformationId",
            "transformation"
          ),
          templates: {
            ...collection(state, state.templates, "templateId", "template"),
            import_from_gallery: async ({ parent }: { parent: string }) => {
              // Installs a bare template from the gallery; the caller reconciles
              // templateData and the gallery reference with a follow-up update.
              state.calls.push("template.import_from_gallery");
              const id = nextId();
              const entity: CustomTemplate = {
                templateId: id,
                path: `${parent}/template/${id}`,
                fingerprint: "1",
              };
              state.templates.push(entity);
              return { data: entity };
            },
          },
          gtag_config: collection(state, state.gtagConfigs, "gtagConfigId", "gtagConfig"),
          built_in_variables: {
            list: async ({ parent }: { parent: string }) => {
              state.calls.push("built_in_variables.list");
              return {
                data: {
                  builtInVariable: state.builtIns
                    .filter((b) => b.workspacePath === parent)
                    .map((b) => ({ type: b.type })),
                },
              };
            },
            create: async ({ parent, type }: { parent: string; type: string[] }) => {
              state.calls.push("built_in_variables.create");
              for (const t of type) state.builtIns.push({ workspacePath: parent, type: t });
              return { data: { builtInVariable: type.map((t) => ({ type: t })) } };
            },
          },
        },
      },
    },
  };

  return { service: service as unknown as tagmanager_v2.Tagmanager, state };
}
