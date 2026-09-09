import type { tagmanager_v2 } from "@googleapis/tagmanager";

type Tag = tagmanager_v2.Schema$Tag;
type Trigger = tagmanager_v2.Schema$Trigger;
type Variable = tagmanager_v2.Schema$Variable;
type Folder = tagmanager_v2.Schema$Folder;
type Workspace = tagmanager_v2.Schema$Workspace;

export interface FakeAccount {
  accountId: string;
  name: string;
}
export interface FakeContainer {
  accountId: string;
  containerId: string;
  publicId: string;
  name: string;
}

export interface FakeSeed {
  accounts?: FakeAccount[];
  containers?: FakeContainer[];
}

export interface FakeState {
  accounts: FakeAccount[];
  containers: FakeContainer[];
  workspaces: Workspace[];
  folders: Folder[];
  tags: Tag[];
  triggers: Trigger[];
  variables: Variable[];
  builtIns: { workspacePath: string; type: string }[];
  versions: { path: string; name?: string }[];
  published: string[];
  calls: string[];
  mergeConflicts: number;
}

let idCounter = 0;
const nextId = (): string => String(++idCounter);

interface Named {
  name?: string | null;
  path?: string | null;
  fingerprint?: string | null;
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
                  path: `accounts/${c.accountId}/containers/${c.containerId}`,
                })),
            },
          };
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
          };
          state.containers.push(created);
          return {
            data: { ...created, path: `accounts/${accountId}/containers/${containerId}` },
          };
        },
        versions: {
          publish: async ({ path }: { path: string }) => {
            state.calls.push("versions.publish");
            state.published.push(path);
            return { data: { containerVersion: { path } } };
          },
          live: async ({ parent }: { parent: string }) => {
            state.calls.push("versions.live");
            return {
              data: {
                path: `${parent}/versions/live`,
                tag: state.tags,
                trigger: state.triggers,
                variable: state.variables,
                folder: state.folders,
                builtInVariable: state.builtIns.map((b) => ({ type: b.type })),
              },
            };
          },
        },
        workspaces: {
          ...collection(state, state.workspaces, "workspaceId", "workspace"),
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
            const versionPath = path.replace(/\/workspace\/\d+$/, `/versions/${nextId()}`);
            state.versions.push({ path: versionPath, name: requestBody.name });
            return { data: { containerVersion: { path: versionPath } } };
          },
          folders: collection(state, state.folders, "folderId", "folder"),
          tags: collection(state, state.tags, "tagId", "tag"),
          triggers: collection(state, state.triggers, "triggerId", "trigger"),
          variables: collection(state, state.variables, "variableId", "variable"),
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
