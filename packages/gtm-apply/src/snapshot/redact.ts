import type { tagmanager_v2 } from "@googleapis/tagmanager";
import type { ApiSnapshotData } from "./types.js";

type Environment = tagmanager_v2.Schema$Environment;

/** An environment without its authorization code (the gtm_auth token that grants preview access). */
function withoutAuthorization(env: Environment): Environment {
  const { authorizationCode: _secret, ...rest } = env;
  return rest;
}

/**
 * A copy of a snapshot that is safe to commit: every environment, the serving
 * one included, loses its authorization code. The pull keeps reading
 * everything; apply this wherever a snapshot is written to a file.
 */
export function redactSnapshotSecrets<T extends ApiSnapshotData>(data: T): T {
  return {
    ...data,
    environments: data.environments.map(withoutAuthorization),
    environment: data.environment ? withoutAuthorization(data.environment) : data.environment,
  };
}
