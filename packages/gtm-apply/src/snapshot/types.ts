import type { tagmanager_v2 } from "@googleapis/tagmanager";

/** The kind of container, derived from Container.usageContext. */
export type ContainerType = "web" | "server" | "amp" | "android" | "ios";

/** What to pull. Exactly one of workspace or version applies; neither means the latest version. */
export interface SnapshotSource {
  /** Public id, e.g. GTM-XXXXXXX. */
  container: string;
  /** Read work in progress from this workspace instead of a version. */
  workspace?: string;
  /** "latest" (default), "live", or a container version id. */
  version?: string;
}

/**
 * Everything the Tag Manager API exposes for one container, as returned by the
 * API (server fields and ids included). Entity collections are keyed the way a
 * ContainerVersion keys them. Use snapshotToSpec() to get a ContainerSpec.
 */
export interface ApiSnapshotData {
  /** ISO timestamp of the pull. */
  pulledAt: string;
  source: SnapshotSource;
  container: tagmanager_v2.Schema$Container;
  containerType: ContainerType;
  /** The workspace read, when the source names one. */
  workspace: tagmanager_v2.Schema$Workspace | null;
  /** Header of the version read; for a workspace source, the version it branched from. */
  containerVersionHeader: tagmanager_v2.Schema$ContainerVersionHeader | null;
  /** Id of the published (live) version, or null when nothing is published. */
  liveVersionId: string | null;
  /** Every environment of the container. */
  environments: tagmanager_v2.Schema$Environment[];
  /**
   * The environment that serves the version read: Live for a live source,
   * Latest for the default source, and for a version id the custom environment
   * whose containerVersionId matches, else Live or Latest when the id is
   * theirs. The API does not report a version id on the built-in Live and
   * Latest environments, so they are resolved by type, not by id. Null for a
   * workspace source.
   */
  environment: tagmanager_v2.Schema$Environment | null;
  /** True when the version read is the published one. False for a workspace source. */
  published: boolean;
  /** Google tag ids linked to this container. */
  destinations: tagmanager_v2.Schema$Destination[];
  folder: tagmanager_v2.Schema$Folder[];
  variable: tagmanager_v2.Schema$Variable[];
  trigger: tagmanager_v2.Schema$Trigger[];
  tag: tagmanager_v2.Schema$Tag[];
  builtInVariable: tagmanager_v2.Schema$BuiltInVariable[];
  gtagConfig: tagmanager_v2.Schema$GtagConfig[];
  customTemplate: tagmanager_v2.Schema$CustomTemplate[];
  client: tagmanager_v2.Schema$Client[];
  transformation: tagmanager_v2.Schema$Transformation[];
}
