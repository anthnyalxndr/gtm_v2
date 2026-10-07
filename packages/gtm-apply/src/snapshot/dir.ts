import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { listContainers, type ContainerRef } from "@anthnyalxndr/gtm-client";
import { stringifySpec } from "../spec/canonical.js";
import { stringifySnapshot } from "./canonical.js";
import { pullSnapshot, snapshotToSpec } from "./pull.js";
import type { ApiSnapshotData, ContainerType, SnapshotSource } from "./types.js";

/**
 * A container directory, as an account repo commits it (decision-11):
 * spec.json is the apply-able part in canonical form and the authority for
 * what it declares; snapshot.json is everything the API exposes, an audit
 * record; container.json is identity plus what was read, with no timestamp,
 * so an unchanged container rewrites it byte for byte.
 */
export const SPEC_FILE = "spec.json";
export const SNAPSHOT_FILE = "snapshot.json";
export const RECORD_FILE = "container.json";

/**
 * The default directory name for a container: its name lowercased, every run
 * of characters outside a-z0-9 replaced by one dash, dashes trimmed, and the
 * lowercased public id when nothing is left. Directories are named for people,
 * so "acme.com" becomes "acme-com" and never "GTM-ABC1234".
 */
export function containerSlug(name: string, publicId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : publicId.toLowerCase();
}

export interface ContainerRecord {
  publicId: string;
  name: string;
  containerType: ContainerType;
  accountId: string;
  containerId: string;
  /** What was read. */
  source: SnapshotSource;
  /** The version read, or the one a workspace branched from. */
  version: { id: string; name: string | null } | null;
  /** The workspace read, when the source names one. */
  workspace: string | null;
  /** Name of the environment serving the version read, when known. */
  environment: string | null;
  /** True when the version read is the published one. */
  published: boolean;
}

export interface PullOutcome {
  dir: string;
  record: ContainerRecord;
  /** Set when snapshot.json and container.json were written but the spec could not be normalized. */
  specError?: string;
}

export function containerRecord(snapshot: ApiSnapshotData): ContainerRecord {
  const header = snapshot.containerVersionHeader;
  return {
    publicId: snapshot.container.publicId ?? snapshot.source.container,
    name: snapshot.container.name ?? "",
    containerType: snapshot.containerType,
    accountId: snapshot.container.accountId ?? "",
    containerId: snapshot.container.containerId ?? "",
    source: snapshot.source,
    version: header?.containerVersionId
      ? { id: header.containerVersionId, name: header.name ?? null }
      : null,
    workspace: snapshot.workspace?.name ?? null,
    environment: snapshot.environment?.name ?? null,
    published: snapshot.published,
  };
}

/**
 * Write the three files. snapshot.json and container.json are always
 * written; spec.json only when the snapshot normalizes, so an earlier spec
 * survives a container that gained something the normalizer rejects.
 */
export async function writeContainerDir(
  snapshot: ApiSnapshotData,
  dir: string
): Promise<PullOutcome> {
  await mkdir(dir, { recursive: true });
  const record = containerRecord(snapshot);
  await writeFile(join(dir, SNAPSHOT_FILE), stringifySnapshot(snapshot));
  await writeFile(join(dir, RECORD_FILE), JSON.stringify(record, null, 2) + "\n");
  let specText: string;
  try {
    specText = stringifySpec(snapshotToSpec(snapshot));
  } catch (err) {
    return { dir, record, specError: err instanceof Error ? err.message : String(err) };
  }
  await writeFile(join(dir, SPEC_FILE), specText);
  return { dir, record };
}

/** Pull one container and write its directory. */
export async function pullContainer(
  client: GtmClient,
  source: SnapshotSource,
  dir: string
): Promise<PullOutcome> {
  return writeContainerDir(await pullSnapshot(client, source), dir);
}

export interface PullAccountOptions {
  /** Keep only the containers this returns true for; default every container in the account. */
  filter?: (ref: ContainerRef) => boolean;
  /** Directory name under outDir for a container; default containerSlug, de-duplicated. */
  dirFor?: (ref: ContainerRef) => string;
}

export interface PullAccountResult {
  /** Containers whose directory was written, in the account's listing order. */
  outcomes: PullOutcome[];
  /** Containers whose pull threw before anything was written. */
  failures: { publicId: string; error: string }[];
}

/** Default directory names: the slug, with the public id appended wherever two refs would share one. */
function defaultDirs(refs: readonly ContainerRef[]): string[] {
  const slugs = refs.map((ref) => containerSlug(ref.name, ref.publicId));
  const counts = new Map<string, number>();
  for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  return slugs.map((slug, i) =>
    (counts.get(slug) ?? 0) > 1 ? `${slug}-${refs[i].publicId.toLowerCase()}` : slug
  );
}

/**
 * Pull every container of an account into `<outDir>/<slug>/`. A container
 * that cannot be pulled (no versions yet, a permission error) is reported and
 * does not stop the others.
 */
export async function pullAccount(
  client: GtmClient,
  accountId: string,
  outDir: string,
  options: PullAccountOptions = {}
): Promise<PullAccountResult> {
  const refs = (await listContainers(client, accountId)).filter(options.filter ?? (() => true));
  const dirs = options.dirFor ? refs.map(options.dirFor) : defaultDirs(refs);
  const settled = await Promise.allSettled(
    refs.map((ref, i) => pullContainer(client, { container: ref.publicId }, join(outDir, dirs[i])))
  );
  const result: PullAccountResult = { outcomes: [], failures: [] };
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      result.outcomes.push(s.value);
      return;
    }
    const error = s.reason instanceof Error ? s.reason.message : String(s.reason);
    result.failures.push({ publicId: refs[i].publicId, error });
  });
  return result;
}
