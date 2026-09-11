import type { ConventionOverrides } from "../spec/conventions.js";
import type { ContainerSpec, VariableSpec } from "../spec/types.js";
import type { LiteralRules } from "./literals.js";

/** The Constant variable that carries a library's manifest. Never referenced by a tag, so never selected. */
export const MANIFEST_VARIABLE_NAME = "Library - Manifest";

/** Library values that mean "fill me in": `<AW-XXXXXXXXX>` and the like. Override in the manifest. */
export const DEFAULT_PLACEHOLDER_PATTERN = "^<[^>]*>$";

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
  /** The metadata encoding by registered name; "notes" (a JSON trailer in entity notes) when absent. */
  encoding?: { name: string; options?: Record<string, unknown> };
  recipes?: Record<string, RecipeManifestEntry>;
  /** Tag type to destination family, overriding or extending the defaults. */
  destinations?: Record<string, string>;
  /** Naming rules layered over DEFAULT_CONVENTIONS. Present (even empty) turns naming lint on. */
  conventions?: ConventionOverrides;
  /** Regular expression for constant values a plan must replace; default DEFAULT_PLACEHOLDER_PATTERN. */
  placeholderPattern?: string;
  /** Exemptions and the template site's hostnames for the inline-literal lint. */
  literals?: LiteralRules;
  /** Longest notes value lint accepts on an entity; default NOTES_MAX_LENGTH. */
  notesMaxLength?: number;
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
