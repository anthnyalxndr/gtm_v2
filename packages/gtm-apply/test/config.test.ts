import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findConfigFile,
  loadRepoConfig,
  parseRepoConfig,
  renderWorkspace,
  resolveEnv,
  RepoConfigError,
} from "../src/config.js";

const tmp = () => mkdtemp(join(tmpdir(), "gtm-config-"));

const sample = {
  account: { id: "6012345678", name: "Acme" },
  containers: {
    "acme-com": { publicId: "GTM-ABC1234", env: "prod" },
    "acme-com-staging": { publicId: "GTM-STG5678", env: "staging", dir: "custom/staging" },
    "sst-acme-com": { publicId: "GTM-SRV9999", spec: "specs/server.json" },
  },
  defaults: { workspace: "${env}-${commit}", prune: true, policy: { customHtml: "warn" } },
};

describe("loadRepoConfig", () => {
  it("reads gtm.config.json from the working directory and resolves paths beside it", async () => {
    const dir = await tmp();
    await writeFile(join(dir, "gtm.config.json"), JSON.stringify(sample));
    expect(await findConfigFile(dir)).toBe(join(dir, "gtm.config.json"));
    const config = await loadRepoConfig(undefined, dir);
    expect(config.path).toBe(join(dir, "gtm.config.json"));
    expect(config.account).toEqual({ id: "6012345678", name: "Acme" });
    expect(config.containers["acme-com"]).toEqual({
      publicId: "GTM-ABC1234",
      env: "prod",
      dir: join(dir, "gtm", "containers", "acme-com"),
      spec: join(dir, "gtm", "containers", "acme-com", "spec.json"),
    });
    expect(config.containers["acme-com-staging"].dir).toBe(join(dir, "custom", "staging"));
    expect(config.containers["acme-com-staging"].spec).toBe(
      join(dir, "custom", "staging", "spec.json")
    );
    expect(config.containers["sst-acme-com"].spec).toBe(join(dir, "specs", "server.json"));
    expect(config.containers["sst-acme-com"].env).toBeUndefined();
    expect(config.defaults).toEqual({
      workspace: "${env}-${commit}",
      prune: true,
      policy: { customHtml: "warn" },
    });
  });

  it("reads a TypeScript module and applies defaults", async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, "gtm.config.ts"),
      `export default { containers: { "acme-com": { publicId: "GTM-ABC1234" } } };\n`
    );
    const config = await loadRepoConfig(undefined, dir);
    expect(config.defaults).toEqual({ workspace: "${slug}-${commit}", prune: false, policy: {} });
    expect(config.account).toBeUndefined();
  });

  it("names the file when there is none, and when the given path is missing", async () => {
    const dir = await tmp();
    await expect(loadRepoConfig(undefined, dir)).rejects.toThrow(
      /gtm\.config\.json: \(file\): no config file/
    );
    await expect(loadRepoConfig("missing.json", dir)).rejects.toThrow(
      /missing\.json: \(file\): file not found/
    );
  });
});

describe("parseRepoConfig", () => {
  const file = "/repo/gtm.config.json";
  const bad = (raw: unknown, field: string, message: RegExp) => {
    let caught: unknown;
    try {
      parseRepoConfig(raw, file);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RepoConfigError);
    const e = caught as RepoConfigError;
    expect(e.file).toBe(file);
    expect(e.field).toBe(field);
    expect(e.message).toMatch(message);
  };

  it("rejects unknown fields, naming them", () => {
    bad({ containers: {}, extra: 1 }, "extra", /unknown field/);
    bad(
      { containers: { a: { publicId: "GTM-A", nope: 1 } } },
      "containers.a.nope",
      /unknown field/
    );
    bad(
      { containers: {}, defaults: { prune: false, other: 1 } },
      "defaults.other",
      /unknown field/
    );
    bad({ account: { id: "1", x: 1 }, containers: {} }, "account.x", /unknown field/);
  });

  it("rejects bad values, naming the field", () => {
    bad([], "(root)", /object/);
    bad({}, "containers", /object keyed by slug/);
    bad({ containers: { "Bad Slug": { publicId: "GTM-A" } } }, "containers.Bad Slug", /slug/);
    bad({ containers: { a: { publicId: "abc" } } }, "containers.a.publicId", /GTM-XXXXXXX/);
    bad({ containers: { a: { publicId: "GTM-A", env: "" } } }, "containers.a.env", /non-empty/);
    bad({ containers: {}, defaults: { prune: "yes" } }, "defaults.prune", /true or false/);
    bad({ containers: {}, defaults: { workspace: "" } }, "defaults.workspace", /template/);
    bad({ account: { name: "x" }, containers: {} }, "account.id", /non-empty/);
  });

  it("rejects two containers with the same env", () => {
    bad(
      {
        containers: {
          a: { publicId: "GTM-A", env: "prod" },
          b: { publicId: "GTM-B", env: "prod" },
        },
      },
      "containers.b.env",
      /already the env of containers\.a/
    );
  });
});

describe("resolveEnv", () => {
  const config = parseRepoConfig(sample, "/repo/gtm.config.json");

  it("finds a container by env, then by slug", () => {
    expect(resolveEnv(config, "staging").slug).toBe("acme-com-staging");
    expect(resolveEnv(config, "sst-acme-com").entry.publicId).toBe("GTM-SRV9999");
  });

  it("names the file and lists what exists when nothing matches", () => {
    expect(() => resolveEnv(config, "qa")).toThrow(
      /gtm\.config\.json: containers: no container with env or slug "qa"; known: acme-com \(prod\), acme-com-staging \(staging\), sst-acme-com/
    );
  });
});

describe("renderWorkspace", () => {
  it("fills the placeholders", () => {
    expect(
      renderWorkspace("${env}-${slug}-${commit}-${date}", {
        slug: "acme-com",
        env: "prod",
        commit: "abc1234",
        date: "2026-09-25",
      })
    ).toBe("prod-acme-com-abc1234-2026-09-25");
  });

  it("rejects an unknown placeholder and a placeholder with no value", () => {
    expect(() => renderWorkspace("${branch}", { slug: "a" })).toThrow(
      /unknown placeholder \$\{branch\}/
    );
    expect(() => renderWorkspace("${env}", { slug: "a" })).toThrow(/\$\{env\} has no value/);
  });
});
