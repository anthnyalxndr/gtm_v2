import type {
  BuiltInVariableType,
  Client,
  CustomTemplate,
  Folder,
  Tag,
  Transformation,
  Trigger,
  Variable,
} from "./generated/tagmanager-v2.js";
import type { ContainerType } from "../snapshot/types.js";

/**
 * A ContainerSpec is the shape of a GTM container export (the API's
 * ContainerVersion resource) with server fields removed and id references
 * replaced by name references. See docs/superpowers/plans/2026-09-09-gtm-sdk.md.
 *
 * Entity shapes come from the Tag Manager API Discovery document (see
 * ./generated/tagmanager-v2.ts), so enum-valued fields such as a trigger's
 * type or a parameter's type are string-literal unions.
 */

/** Fields the API owns; a spec never carries them. */
type ServerField =
  | "accountId"
  | "containerId"
  | "workspaceId"
  | "tagId"
  | "triggerId"
  | "variableId"
  | "folderId"
  | "clientId"
  | "transformationId"
  | "fingerprint"
  | "path"
  | "tagManagerUrl";

type WithFolder<T> = Omit<T, ServerField | "parentFolderId"> & { parentFolderName?: string };

export interface FolderSpec extends Pick<Folder, "name"> {
  name: string;
}
export type VariableSpec = WithFolder<Variable>;
/** A custom template, carried by name; server ids are dropped, gallery reference kept. */
export type CustomTemplateSpec = Omit<CustomTemplate, ServerField>;
export type TriggerSpec = WithFolder<Trigger>;
/** Server containers only. */
export type ClientSpec = WithFolder<Client>;
/** Server containers only. */
export type TransformationSpec = WithFolder<Transformation>;
export type TagSpec = Omit<WithFolder<Tag>, "firingTriggerId" | "blockingTriggerId"> & {
  /** Names of the triggers this tag fires on; resolved to firingTriggerId at apply time. */
  firingTriggerName?: string[];
  /** Names of the triggers that block this tag; resolved to blockingTriggerId at apply time. */
  blockingTriggerName?: string[];
};

export interface ContainerSpec {
  /** The kind of container this spec is for. When set, the target container must match. */
  containerType?: ContainerType;
  folder?: FolderSpec[];
  /** Built-in variable API types to enable, e.g. "pagePath". Referenced built-ins are inferred. */
  builtInVariable?: BuiltInVariableType[];
  variable?: VariableSpec[];
  trigger?: TriggerSpec[];
  tag?: TagSpec[];
  /** Server containers only. */
  client?: ClientSpec[];
  /** Server containers only. */
  transformation?: TransformationSpec[];
  /** Custom (including community-gallery) templates, referenced by tags and variables through a cvt:<name> type. */
  customTemplate?: CustomTemplateSpec[];
}

export type EntityKind =
  "folder" | "variable" | "trigger" | "tag" | "client" | "transformation" | "customTemplate";

/** Identity helper so a spec written in a .ts file is inferred and checked without an annotation. */
export function defineContainer(spec: ContainerSpec): ContainerSpec {
  return spec;
}
