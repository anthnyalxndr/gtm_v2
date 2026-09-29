import { describe, it, expect } from "vitest";
import {
  SCHEMAS,
  type ContainerVersion,
  type WebContainer,
  type WebContainerVersion,
  type WebWorkspace,
} from "../src/index.js";

const ids = { accountId: "1", containerId: "2" };

const workspace: WebWorkspace = {
  ...ids,
  workspaceId: "3",
  name: "Default Workspace",
  folder: [{ ...ids, workspaceId: "3", folderId: "10", name: "GA4" }],
  trigger: [{ ...ids, workspaceId: "3", triggerId: "20", name: "Lead", type: "customEvent" }],
  variable: [{ ...ids, workspaceId: "3", variableId: "30", name: "Measurement ID", type: "c" }],
  builtInVariable: [{ ...ids, workspaceId: "3", name: "Page Path", type: "pagePath" }],
  tag: [
    {
      ...ids,
      workspaceId: "3",
      tagId: "40",
      name: "GA4 - Lead",
      type: "gaawe",
      parentFolderId: "10",
      firingTriggerId: ["20"],
    },
  ],
  customTemplate: [{ ...ids, workspaceId: "3", templateId: "50", name: "Consent Mode" }],
  zone: [],
  gtagConfig: [],
};

describe("WebContainer nests a web container the way the Tag Manager API does", () => {
  it("holds environments, destinations, versions and workspaces under the container", () => {
    const container: WebContainer = {
      ...ids,
      name: "Template - Web",
      publicId: "GTM-TPLKC7QP",
      usageContext: ["web"],
      environment: [{ ...ids, environmentId: "1", name: "Live", type: "live" }],
      destination: [{ ...ids, destinationId: "G-XXXXXXX", name: "GA4" }],
      version: [{ ...ids, containerVersionId: "5", name: "v5", tag: workspace.tag }],
      workspace: [workspace],
    };
    expect(container.workspace?.[0].tag?.[0].parentFolderId).toBe(
      container.workspace?.[0].folder?.[0].folderId
    );
    expect(container.version?.[0].tag).toBe(workspace.tag);
  });

  it("takes a ContainerVersion from the API when it has no clients or transformations", () => {
    const fromApi = {
      ...ids,
      containerVersionId: "5",
      tag: workspace.tag,
    } satisfies ContainerVersion;
    const version: WebContainerVersion = fromApi;
    expect(version.containerVersionId).toBe("5");
    expect(SCHEMAS.ContainerVersion.tag).toEqual({ kind: "ref[]", ref: "Tag" });
  });

  it("rejects clients, transformations and a non-web usage context", () => {
    // @ts-expect-error a web workspace cannot hold a client
    const withClient: WebWorkspace = { client: [{ name: "GA4", type: "gaaw_client" }] };
    // @ts-expect-error a web container version cannot hold a transformation
    const withTransformation: WebContainerVersion = { transformation: [{ name: "T" }] };
    // @ts-expect-error a web container's usage context is web
    const server: WebContainer = { usageContext: ["server"] };
    expect([withClient, withTransformation, server]).toHaveLength(3);
  });
});
