import type { Parameter } from "../spec/generated/tagmanager-v2.js";
import type { ClientSpec, TagSpec, TransformationSpec } from "../spec/types.js";

/** An entity that can declare recipe membership: tags in every container, clients and transformations in server containers. */
export type RecipeRoot = TagSpec | ClientSpec | TransformationSpec;

/**
 * How a library encodes which recipes an entity belongs to. The library
 * declares its encoding in its manifest; the engine resolves it by name.
 */
export interface RecipeEncoding {
  name: string;
  /** Recipe names the entity declares. */
  recipesOf(entity: RecipeRoot): string[];
  /** Remove the declaration before the entity is applied to a customer container. */
  strip?(entity: RecipeRoot): RecipeRoot;
}

const LIST = /[,\s]+/;
export function parseRecipeList(value: string): string[] {
  return value
    .split(LIST)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const NOTES_LINE = /^\s*recipes\s*:\s*(.+?)\s*$/im;

/** A `recipes: a, b` line anywhere in the entity's notes. Safe for deployed containers: notes never ship. */
export function notesEncoding(): RecipeEncoding {
  return {
    name: "notes",
    recipesOf(entity) {
      const m = entity.notes?.match(NOTES_LINE);
      return m ? parseRecipeList(m[1]) : [];
    },
  };
}

function isTag(entity: RecipeRoot): entity is TagSpec {
  return (
    "monitoringMetadata" in entity || "firingTriggerName" in entity || "tagFiringOption" in entity
  );
}

/**
 * A key in a tag's Additional Tag Metadata (monitoringMetadata). Only tags
 * carry metadata, and it ships in the container, so strip() removes it
 * before a tag is applied to a customer.
 */
export function metadataEncoding(key = "recipes"): RecipeEncoding {
  const entries = (entity: RecipeRoot): Parameter[] =>
    isTag(entity) ? (entity.monitoringMetadata?.map ?? []) : [];
  return {
    name: "metadata",
    recipesOf(entity) {
      const entry = entries(entity).find((p) => p.key === key);
      return entry?.value ? parseRecipeList(entry.value) : [];
    },
    strip(entity) {
      if (!isTag(entity) || !entity.monitoringMetadata?.map) return entity;
      const map = entity.monitoringMetadata.map.filter((p) => p.key !== key);
      const { monitoringMetadata, ...rest } = entity;
      const stripped: TagSpec =
        map.length === 0
          ? { ...rest, monitoringMetadata: { type: "map" } }
          : { ...rest, monitoringMetadata: { ...monitoringMetadata, map } };
      return stripped;
    },
  };
}

export type EncodingFactory = (options?: Record<string, unknown>) => RecipeEncoding;

const registry = new Map<string, EncodingFactory>([
  ["notes", () => notesEncoding()],
  ["metadata", (o) => metadataEncoding(typeof o?.key === "string" ? o.key : undefined)],
]);

/** Register an encoding under a name a manifest can refer to. */
export function registerEncoding(name: string, factory: EncodingFactory): void {
  registry.set(name, factory);
}

export function resolveEncoding(name: string, options?: Record<string, unknown>): RecipeEncoding {
  const factory = registry.get(name);
  if (!factory) {
    throw new Error(
      `Unknown recipe encoding "${name}"; registered: ${[...registry.keys()].join(", ")}`
    );
  }
  return factory(options);
}
