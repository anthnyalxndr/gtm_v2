export { GtmClient, TAG_MANAGER_SCOPES } from "./gtm_v2.js";
export type { GtmClientOptions } from "./gtm_v2.js";
export { resolveConfigPaths } from "./config.js";
export type { ConfigPaths } from "./config.js";
export { withRetry, createLimiter, isRetryable } from "./throttle.js";
export type { RetryOptions } from "./throttle.js";
export type { tagmanager_v2 } from "@googleapis/tagmanager";
export { resolveContainer, createContainer } from "./resources/containers.js";
export type { ContainerRef } from "./resources/containers.js";
export { ensureWorkspace, isDefaultWorkspaceName } from "./resources/workspaces.js";
export type { WorkspaceRef } from "./resources/workspaces.js";
export {
  ensureFolder,
  ensureVariable,
  ensureTrigger,
  ensureTag,
  matches,
  SERVER_FIELDS,
} from "./resources/entities.js";
export type { EnsureResult, EnsureAction } from "./resources/entities.js";
export { ensureBuiltIns, listEnabledBuiltIns } from "./resources/builtins.js";
