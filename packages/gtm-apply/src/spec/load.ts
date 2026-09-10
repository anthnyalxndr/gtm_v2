import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MODULE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);

/**
 * Read a spec file. JSON is parsed; a JavaScript or TypeScript module is
 * imported and its default export (or, failing that, the module namespace's
 * `spec` export) is returned. The result is raw input for normalizeExport.
 */
export async function loadSpecFile(path: string): Promise<unknown> {
  const ext = extname(path).toLowerCase();
  if (ext === ".json" || ext === "") {
    return JSON.parse(await readFile(path, "utf-8")) as unknown;
  }
  if (!MODULE_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported spec file type "${ext}": use .json, .js, .mjs, or .ts`);
  }
  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(resolve(path)).href)) as Record<string, unknown>;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (
      code === "ERR_UNKNOWN_FILE_EXTENSION" ||
      code === "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING"
    ) {
      throw new Error(
        `Cannot import ${path}: this Node.js (${process.version}) does not strip TypeScript types. ` +
          "Use Node 22.18 or newer, run with `node --experimental-strip-types` (22.6+), or run gtm-apply through tsx."
      );
    }
    throw err;
  }
  if ("default" in mod && mod.default !== undefined) return mod.default;
  if ("spec" in mod) return mod.spec;
  throw new Error(`${path} must export the spec as its default export`);
}
