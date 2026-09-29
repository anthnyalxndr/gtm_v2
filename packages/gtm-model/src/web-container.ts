import type {
  BuiltInVariable,
  Container,
  ContainerVersion,
  CustomTemplate,
  Destination,
  Environment,
  Folder,
  GtagConfig,
  Tag,
  Trigger,
  Variable,
  Workspace,
  Zone,
} from "./spec/generated/tagmanager-v2.js";

/**
 * A web container and everything the Tag Manager API nests under it, one
 * level per path segment:
 *
 *   accounts/{a}/containers/{c}                     WebContainer
 *     environments/{e}                              environment
 *     destinations/{d}                              destination
 *     versions/{v}                                  version (WebContainerVersion)
 *     workspaces/{w}                                workspace (WebWorkspace)
 *       tags, triggers, variables, built_in_variables,
 *       folders, templates, zones, gtag_config      WebContainerEntities
 *
 * Entity shapes are the Discovery types, ids and all. Folders do not contain
 * entities in the API: a tag, trigger or variable points at its folder through
 * parentFolderId, so folders stay a flat list beside the entities.
 */

/**
 * The entities a web workspace or version holds. Field names follow the
 * ContainerVersion resource, so a version and a workspace read the same way.
 * Clients and transformations exist only in server containers.
 */
export interface WebContainerEntities {
  tag?: Tag[];
  trigger?: Trigger[];
  variable?: Variable[];
  /** The built-in variables enabled in this workspace or version. */
  builtInVariable?: BuiltInVariable[];
  folder?: Folder[];
  /** Custom and community templates; the API's workspace path calls them templates. */
  customTemplate?: CustomTemplate[];
  zone?: Zone[];
  /** Google tag configs. */
  gtagConfig?: GtagConfig[];
  client?: never;
  transformation?: never;
}

/** A workspace of a web container, with the entities it holds. */
export interface WebWorkspace extends Workspace, WebContainerEntities {}

/**
 * A version of a web container. The API returns its entities inline, and
 * `container` is a copy of the container's settings when the version was made.
 */
export interface WebContainerVersion
  extends Omit<ContainerVersion, keyof WebContainerEntities>, WebContainerEntities {}

/** A web container with its environments, destinations, versions and workspaces. */
export interface WebContainer extends Container {
  usageContext: ["web"];
  /** Live, Latest, workspace previews and custom environments. Container level; never versioned. */
  environment?: Environment[];
  /** Google tag destinations linked to the container. */
  destination?: Destination[];
  version?: WebContainerVersion[];
  workspace?: WebWorkspace[];
}
