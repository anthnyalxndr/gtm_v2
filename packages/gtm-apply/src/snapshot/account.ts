import type { GtmClient } from "@anthnyalxndr/gtm-client";
import { listContainers } from "@anthnyalxndr/gtm-client";
import { pullSnapshot } from "./pull.js";
import type { ApiSnapshotData, SnapshotSource } from "./types.js";

/**
 * Pull several containers. Results are in `sources` order. Every call goes
 * through the client's limiter, so running the pulls concurrently costs
 * nothing extra and lets the limiter interleave them.
 */
export function pullSnapshots(
  client: GtmClient,
  sources: readonly SnapshotSource[]
): Promise<ApiSnapshotData[]> {
  return Promise.all(sources.map((source) => pullSnapshot(client, source)));
}

/** The latest version of every container in an account, in the API's listing order. */
export async function snapshotAccount(
  client: GtmClient,
  accountId: string
): Promise<ApiSnapshotData[]> {
  const refs = await listContainers(client, accountId);
  return pullSnapshots(
    client,
    refs.map((ref) => ({ container: ref.publicId }))
  );
}
