import type { tagmanager_v2 } from "@googleapis/tagmanager";

/**
 * A ContainerSpec is the shape of a GTM container export (the API's
 * ContainerVersion resource) with server fields removed and id references
 * replaced by name references. See docs/superpowers/plans/2026-09-09-gtm-sdk.md.
 */

type WithFolder<T> = Omit<T, "parentFolderId"> & { parentFolderName?: string };

export interface FolderSpec {
  name: string;
}
export type VariableSpec = WithFolder<tagmanager_v2.Schema$Variable>;
export type TriggerSpec = WithFolder<tagmanager_v2.Schema$Trigger>;
export type TagSpec = Omit<
  WithFolder<tagmanager_v2.Schema$Tag>,
  "firingTriggerId" | "blockingTriggerId"
> & {
  firingTriggerName?: string[];
  blockingTriggerName?: string[];
};

export interface ContainerSpec {
  folder?: FolderSpec[];
  /** Built-in variable API types to enable, e.g. "pagePath". Referenced built-ins are inferred. */
  builtInVariable?: string[];
  variable?: VariableSpec[];
  trigger?: TriggerSpec[];
  tag?: TagSpec[];
}

export type EntityKind = "folder" | "variable" | "trigger" | "tag";
