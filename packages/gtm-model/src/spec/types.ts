import type {
  BuiltInVariableType,
  Client,
  Folder,
  Tag,
  Transformation,
  Trigger,
  Variable,
} from "./generated/tagmanager-v2.js";
import type { ContainerType } from "../container-type.js";
import type { SERVER_CATALOG, WEB_CATALOG } from "./catalog.js";

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
}

export type EntityKind = "folder" | "variable" | "trigger" | "tag" | "client" | "transformation";

type TagSpecNaming<N extends string> = Omit<
  TagSpec,
  "firingTriggerName" | "blockingTriggerName"
> & {
  firingTriggerName?: N[];
  blockingTriggerName?: N[];
};

/** Sections every container type has. */
interface CommonSections<N extends string> {
  folder?: FolderSpec[];
  /** Built-in variable API types to enable, e.g. "pagePath". Referenced built-ins are inferred. */
  builtInVariable?: BuiltInVariableType[];
  variable?: VariableSpec[];
  trigger?: TriggerSpec[];
  tag?: TagSpecNaming<N>[];
}

/** A web container spec. A spec without a containerType is a web spec. */
export interface WebContainerSpec<N extends string = string> extends CommonSections<N> {
  containerType?: "web";
  client?: never;
  transformation?: never;
}

/** A server container spec: the only kind with clients and transformations. */
export interface ServerContainerSpec<N extends string = string> extends CommonSections<N> {
  containerType: "server";
  client?: ClientSpec[];
  transformation?: TransformationSpec[];
}

export interface AmpContainerSpec<N extends string = string> extends CommonSections<N> {
  containerType: "amp";
  client?: never;
  transformation?: never;
}

export interface MobileContainerSpec<N extends string = string> extends CommonSections<N> {
  containerType: "android" | "ios";
  client?: never;
  transformation?: never;
}

/** The spec member for a container type. */
export type TypedContainerSpec<
  T extends ContainerType = ContainerType,
  N extends string = string,
> = {
  web: WebContainerSpec<N>;
  server: ServerContainerSpec<N>;
  amp: AmpContainerSpec<N>;
  android: MobileContainerSpec<N>;
  ios: MobileContainerSpec<N>;
}[T];

/** Built-in trigger display names by container type, as literal types. */
interface BuiltInTriggerNames {
  web: keyof typeof WEB_CATALOG.triggers.builtIn;
  server: keyof typeof SERVER_CATALOG.triggers.builtIn;
  amp: never;
  android: never;
  ios: never;
}

/** A built-in trigger name another container type has and this one does not. */
export type ForeignBuiltInTrigger<T extends ContainerType> = Exclude<
  BuiltInTriggerNames[ContainerType],
  BuiltInTriggerNames[T]
>;

type NoForeignBuiltInTriggers<T extends ContainerType, N extends string> = [
  Extract<N, ForeignBuiltInTrigger<T>>,
] extends [never]
  ? unknown
  : {
      "a tag names a built-in trigger this container type does not have": Extract<
        N,
        ForeignBuiltInTrigger<T>
      >;
    };

/**
 * Identity helper that checks a spec written in TypeScript against its
 * container type: enum fields are string-literal unions, clients and
 * transformations exist only in server specs, and a tag cannot name a
 * built-in trigger that only another container type has. The result is
 * assignable to ContainerSpec, the shape apply takes.
 */
export function defineContainer<T extends ContainerType = "web", N extends string = never>(
  spec: {
    containerType?: T;
    tag?: { firingTriggerName?: N[]; blockingTriggerName?: N[] }[];
  } & TypedContainerSpec<T> &
    NoForeignBuiltInTriggers<T, N>
): TypedContainerSpec<T> {
  return spec;
}
