import type { ContainerSpec, VariableSpec } from "../spec/types.js";

/** The Constant variable that carries a library's manifest. Never referenced by a tag, so never selected. */
export const MANIFEST_VARIABLE_NAME = "Library - Manifest";

/** A resource the recipe needs on another platform, carried into the container by a constant. */
export interface ExternalDependency {
  /** Name of the constant variable in the recipe's closure that holds the identifier. */
  constant: string;
  platform: string;
  resource: string;
  /** Expected name of the resource on the other platform, e.g. "GTM - ${recipe}". */
  nameTemplate?: string;
  /** Regular expression the constant's value must match. */
  pattern?: string;
}

export interface RecipeManifestEntry {
  description?: string;
  dependencies?: ExternalDependency[];
}

export interface LibraryManifest {
  encoding?: { name: string; options?: Record<string, unknown> };
  recipes?: Record<string, RecipeManifestEntry>;
  /** Tag type to destination family, overriding or extending the defaults. */
  destinations?: Record<string, string>;
}

export function findManifestVariable(spec: ContainerSpec): VariableSpec | undefined {
  return spec.variable?.find((v) => v.name === MANIFEST_VARIABLE_NAME);
}

/** Parse the manifest from its constant variable; null when the library has none. */
export function readManifest(spec: ContainerSpec): LibraryManifest | null {
  const v = findManifestVariable(spec);
  if (!v) return null;
  const value = v.parameter?.find((p) => p.key === "value")?.value;
  if (!value) throw new Error(`${MANIFEST_VARIABLE_NAME} has no value`);
  try {
    return JSON.parse(value) as LibraryManifest;
  } catch (err) {
    throw new Error(`${MANIFEST_VARIABLE_NAME} is not valid JSON: ${(err as Error).message}`);
  }
}

/** Build the constant variable that carries a manifest, for a spec pushed to the template container. */
export function manifestVariable(manifest: LibraryManifest): VariableSpec {
  return {
    name: MANIFEST_VARIABLE_NAME,
    type: "c",
    parameter: [{ type: "template", key: "value", value: JSON.stringify(manifest) }],
  };
}
