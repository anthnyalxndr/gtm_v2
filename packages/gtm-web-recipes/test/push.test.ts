import { describe, it, expect } from "vitest";
import { GtmClient } from "@anthnyalxndr/gtm-client";
import { createFakeService, latestSnapshot } from "@anthnyalxndr/gtm-client/testing";
import { pushSettings } from "../scripts/push-settings.js";
import { templateSnapshot } from "../scripts/template.js";

const NOW = new Date("2026-09-28T12:00:00Z");

describe("pushSettings", () => {
  it("names the workspace and version recipes-<date> by default", () => {
    expect(pushSettings({}, [], NOW)).toEqual({
      container: "GTM-TPLKC7QP",
      workspace: "recipes-2026-09-28",
      versionName: "recipes-2026-09-28",
      dryRun: false,
    });
  });

  it("keeps the version name when the push targets an existing workspace", () => {
    const s = pushSettings({ GTM_LIBRARY_WORKSPACE: "owner-edits" }, ["--dry-run"], NOW);
    expect(s.workspace).toBe("owner-edits");
    expect(s.versionName).toBe("recipes-2026-09-28");
    expect(s.dryRun).toBe(true);
  });

  it("takes the container and version name from their own settings", () => {
    const s = pushSettings(
      { GTM_LIBRARY: "GTM-OTHER", GTM_LIBRARY_VERSION: "built-ins-and-recipes" },
      [],
      NOW
    );
    expect(s.container).toBe("GTM-OTHER");
    expect(s.versionName).toBe("built-ins-and-recipes");
  });

  it("describes the version only when a description is set", () => {
    expect(pushSettings({}, [], NOW)).not.toHaveProperty("versionDescription");
    expect(
      pushSettings({ GTM_LIBRARY_VERSION_DESCRIPTION: "Adds the server recipes." }, [], NOW)
        .versionDescription
    ).toBe("Adds the server recipes.");
  });
});

describe("pushing into an existing workspace", () => {
  async function containerWithUnversionedEdits() {
    const { service, state } = createFakeService({
      containers: [{ accountId: "1", containerId: "10", publicId: "GTM-TPL", name: "Template" }],
    });
    const client = new GtmClient({ service, minIntervalMs: 0 });
    const ws = await service.accounts.containers.workspaces.create({
      parent: "accounts/1/containers/10",
      requestBody: { name: "owner-edits" },
    });
    const parent = ws.data.path!;
    // Edits made in the UI and never versioned: a built-in variable and a
    // variable the template also defines, identical to the template's.
    await service.accounts.containers.workspaces.built_in_variables.create({
      parent,
      type: ["randomNumber"],
    });
    const library = await templateSnapshot();
    const dlv = library.spec.variable!.find((v) => v.name === "DLV - form_id")!;
    await service.accounts.containers.workspaces.variables.create({ parent, requestBody: dlv });
    return { client, state, library };
  }

  it("plans against the workspace's own contents", async () => {
    const { client, library } = await containerWithUnversionedEdits();
    const outcome = await library.push(
      client,
      { container: "GTM-TPL", workspace: "owner-edits" },
      { dryRun: true, versionName: "recipes-2026-09-28" }
    );
    const op = (name: string) => outcome.plan.ops.find((o) => o.name === name);
    expect(op("owner-edits")?.action).toBe("unchanged");
    expect(op("DLV - form_id")?.action).toBe("unchanged");
    expect(op("DLV - form_name")?.action).toBe("create");
  });

  it("refuses the Default Workspace and says to use a named one", async () => {
    const { client, library } = await containerWithUnversionedEdits();
    await expect(
      library.push(client, { container: "GTM-TPL", workspace: "Default Workspace" })
    ).rejects.toThrow(/named workspace/);
  });

  it("keeps the workspace's unversioned edits in the version it creates", async () => {
    const { client, state, library } = await containerWithUnversionedEdits();
    const outcome = await library.push(
      client,
      { container: "GTM-TPL", workspace: "owner-edits" },
      { versionName: "recipes-2026-09-28" }
    );
    expect(outcome.plan.errors).toEqual([]);
    expect(state.versions.at(-1)?.name).toBe("recipes-2026-09-28");
    const snap = latestSnapshot(state);
    expect(snap.builtIns).toContain("randomNumber");
    expect(snap.tag.map((t) => t.name)).toContain("Google Tag");
    expect(snap.variable.filter((v) => v.name === "DLV - form_id")).toHaveLength(1);
  });
});
