import { access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { loadSpecFile } from "./spec/load.js";

/**
 * The repo config file: one place that says which containers a repo manages,
 * which of them is staging and which is prod, and the defaults every command
 * uses. Entries are keyed by a human slug, which is also the directory name
 * under gtm/containers/ (decision-11).
 *
 *   {
 *     "account": { "id": "6012345678", "name": "Acme" },
 *     "containers": {
 *       "acme-com": { "publicId": "GTM-ABC1234", "env": "prod" },
 *       "acme-com-staging": { "publicId": "GTM-STG5678", "env": "staging" }
 *     },
 *     "defaults": { "workspace": "${slug}-${commit}", "prune": false }
 *   }
 */

/** File names looked for in the working directory, in this order. */
export const CONFIG_FILE_NAMES: readonly string[] = [
  "gtm.config.json",
  "gtm.config.ts",
  "gtm.config.js",
  "gtm.config.mjs",
];

export interface ContainerEntry {
  publicId: string;
  /** The environment name, e.g. "prod" or "staging". Unique across entries when set. */
  env?: string;
  /** Absolute path of the container directory. Defaults to gtm/containers/<slug> beside the config. */
  dir: string;
  /** Absolute path of the spec file. Defaults to <dir>/spec.json. */
  spec: string;
}

export interface RepoConfigDefaults {
  /** Workspace name template for apply: ${slug}, ${env}, ${commit} and ${date} are replaced. */
  workspace: string;
  /** Reserved for the prune mode (TASK-25); stored and validated, not yet read. */
  prune: boolean;
  /** Reserved for policy rules (TASK-29); stored and validated, not yet read. */
  policy: Record<string, unknown>;
}

export interface RepoConfig {
  /** Absolute path of the file this config was read from. */
  path: string;
  account?: { id: string; name?: string };
  containers: Record<string, ContainerEntry>;
  defaults: RepoConfigDefaults;
}

export const DEFAULT_WORKSPACE_TEMPLATE = "${slug}-${commit}";

/** A problem with the config file. `file` and `field` say where. */
export class RepoConfigError extends Error {
  constructor(
    public readonly file: string,
    public readonly field: string,
    message: string
  ) {
    super(`${file}: ${field}: ${message}`);
    this.name = "RepoConfigError";
  }
}

const PUBLIC_ID = /^GTM-[A-Z0-9]+$/;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** The first config file that exists in `cwd`, or null. */
export async function findConfigFile(cwd = process.cwd()): Promise<string | null> {
  for (const name of CONFIG_FILE_NAMES) {
    const candidate = join(cwd, name);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

/** Read and validate the config at `path`, or the first one found in `cwd`. */
export async function loadRepoConfig(path?: string, cwd = process.cwd()): Promise<RepoConfig> {
  const file = path ? resolve(cwd, path) : await findConfigFile(cwd);
  if (!file) {
    throw new RepoConfigError(
      join(cwd, CONFIG_FILE_NAMES[0]),
      "(file)",
      `no config file in ${cwd}; looked for ${CONFIG_FILE_NAMES.join(", ")}`
    );
  }
  let raw: unknown;
  try {
    raw = await loadSpecFile(file);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const reason = code === "ENOENT" ? "file not found" : (err as Error).message;
    throw new RepoConfigError(file, "(file)", reason);
  }
  return parseRepoConfig(raw, file);
}

/** Validate a parsed config object. Relative dir and spec paths resolve against the file's directory. */
export function parseRepoConfig(raw: unknown, file: string): RepoConfig {
  const fail: (field: string, message: string) => never = (field, message) => {
    throw new RepoConfigError(file, field, message);
  };
  if (!isRecord(raw)) fail("(root)", "must be a JSON object");
  const root = raw as Record<string, unknown>;
  for (const key of Object.keys(root)) {
    if (!["account", "containers", "defaults"].includes(key)) {
      fail(key, "unknown field; expected account, containers or defaults");
    }
  }

  let account: RepoConfig["account"];
  if (root.account !== undefined) {
    if (!isRecord(root.account)) fail("account", "must be an object");
    const a = root.account as Record<string, unknown>;
    if (typeof a.id !== "string" || a.id.length === 0)
      fail("account.id", "must be a non-empty string");
    if (a.name !== undefined && typeof a.name !== "string")
      fail("account.name", "must be a string");
    for (const key of Object.keys(a)) {
      if (!["id", "name"].includes(key))
        fail(`account.${key}`, "unknown field; expected id or name");
    }
    account = { id: a.id as string, ...(typeof a.name === "string" ? { name: a.name } : {}) };
  }

  if (!isRecord(root.containers)) fail("containers", "must be an object keyed by slug");
  const base = dirname(file);
  const abs = (p: string) => (isAbsolute(p) ? p : resolve(base, p));
  const containers: Record<string, ContainerEntry> = {};
  const envs = new Map<string, string>();
  for (const [slug, value] of Object.entries(root.containers as Record<string, unknown>)) {
    const at = `containers.${slug}`;
    if (!SLUG.test(slug))
      fail(
        at,
        "slug must be lowercase letters, digits and dashes, starting with a letter or digit"
      );
    if (!isRecord(value)) fail(at, "must be an object");
    const e = value as Record<string, unknown>;
    for (const key of Object.keys(e)) {
      if (!["publicId", "env", "dir", "spec"].includes(key)) {
        fail(`${at}.${key}`, "unknown field; expected publicId, env, dir or spec");
      }
    }
    if (typeof e.publicId !== "string" || !PUBLIC_ID.test(e.publicId)) {
      fail(`${at}.publicId`, "must be a container public id like GTM-XXXXXXX");
    }
    if (e.env !== undefined && (typeof e.env !== "string" || e.env.length === 0)) {
      fail(`${at}.env`, "must be a non-empty string");
    }
    if (typeof e.env === "string") {
      const other = envs.get(e.env);
      if (other) fail(`${at}.env`, `"${e.env}" is already the env of containers.${other}`);
      envs.set(e.env, slug);
    }
    if (e.dir !== undefined && typeof e.dir !== "string") fail(`${at}.dir`, "must be a path");
    if (e.spec !== undefined && typeof e.spec !== "string") fail(`${at}.spec`, "must be a path");
    const dir = abs(typeof e.dir === "string" ? e.dir : join("gtm", "containers", slug));
    const spec = typeof e.spec === "string" ? abs(e.spec) : join(dir, "spec.json");
    containers[slug] = {
      publicId: e.publicId as string,
      ...(typeof e.env === "string" ? { env: e.env } : {}),
      dir,
      spec,
    };
  }

  const defaults: RepoConfigDefaults = {
    workspace: DEFAULT_WORKSPACE_TEMPLATE,
    prune: false,
    policy: {},
  };
  if (root.defaults !== undefined) {
    if (!isRecord(root.defaults)) fail("defaults", "must be an object");
    const d = root.defaults as Record<string, unknown>;
    for (const key of Object.keys(d)) {
      if (!["workspace", "prune", "policy"].includes(key)) {
        fail(`defaults.${key}`, "unknown field; expected workspace, prune or policy");
      }
    }
    if (d.workspace !== undefined) {
      if (typeof d.workspace !== "string" || d.workspace.length === 0) {
        fail("defaults.workspace", "must be a non-empty template string");
      }
      defaults.workspace = d.workspace;
    }
    if (d.prune !== undefined) {
      if (typeof d.prune !== "boolean") fail("defaults.prune", "must be true or false");
      defaults.prune = d.prune;
    }
    if (d.policy !== undefined) {
      if (!isRecord(d.policy)) fail("defaults.policy", "must be an object");
      defaults.policy = d.policy as Record<string, unknown>;
    }
  }

  return { path: file, ...(account ? { account } : {}), containers, defaults };
}

/** The entry whose env is `name`, else the entry keyed by `name`. */
export function resolveEnv(
  config: RepoConfig,
  name: string
): { slug: string; entry: ContainerEntry } {
  for (const [slug, entry] of Object.entries(config.containers)) {
    if (entry.env === name) return { slug, entry };
  }
  const bySlug = config.containers[name];
  if (bySlug) return { slug: name, entry: bySlug };
  const known = Object.entries(config.containers)
    .map(([slug, e]) => (e.env ? `${slug} (${e.env})` : slug))
    .join(", ");
  throw new RepoConfigError(
    config.path,
    "containers",
    `no container with env or slug "${name}"; known: ${known || "none"}`
  );
}

export interface WorkspaceVars {
  slug: string;
  env?: string;
  commit?: string;
  date?: string;
}

/** Fill ${slug}, ${env}, ${commit} and ${date} in a workspace template. */
export function renderWorkspace(template: string, vars: WorkspaceVars): string {
  const values: Record<string, string | undefined> = {
    slug: vars.slug,
    env: vars.env,
    commit: vars.commit,
    date: vars.date ?? new Date().toISOString().slice(0, 10),
  };
  return template.replace(/\$\{([a-zA-Z]+)\}/g, (_, name: string) => {
    if (!(name in values)) {
      throw new Error(`workspace template "${template}": unknown placeholder \${${name}}`);
    }
    const value = values[name];
    if (value === undefined) {
      throw new Error(`workspace template "${template}": \${${name}} has no value here`);
    }
    return value;
  });
}

/** The short hash of HEAD in `cwd`, or "nogit" when there is no repository. */
export function gitShortSha(cwd: string): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "nogit";
  }
}
