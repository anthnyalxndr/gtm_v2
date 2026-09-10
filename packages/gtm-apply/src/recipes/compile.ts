import type { BuiltInVariableType } from "../spec/generated/tagmanager-v2.js";
import type { ContainerSpec, EntityKind } from "../spec/types.js";
import { ga4Event } from "./ga4.js";
import { googleAdsConversion } from "./googleAds.js";
import type { ConversionRecipe } from "./types.js";

const KINDS: readonly EntityKind[] = ["folder", "variable", "trigger", "tag"];

/**
 * Merge spec fragments. Entities with the same name and identical content
 * are deduplicated; the same name with different content is an error.
 */
export function mergeSpecs(...fragments: ContainerSpec[]): ContainerSpec {
  const out: ContainerSpec = {};
  const builtIns = new Set<BuiltInVariableType>();
  for (const fragment of fragments) {
    for (const t of fragment.builtInVariable ?? []) builtIns.add(t);
    for (const kind of KINDS) {
      const items = fragment[kind] as { name?: string | null }[] | undefined;
      if (!items?.length) continue;
      const target = (out[kind] ??= []) as { name?: string | null }[];
      for (const item of items) {
        const existing = target.find((e) => e.name === item.name);
        if (!existing) {
          target.push(item);
          continue;
        }
        if (JSON.stringify(existing) !== JSON.stringify(item)) {
          throw new Error(
            `Conflicting definitions for ${kind} "${item.name}" while merging spec fragments`
          );
        }
      }
    }
  }
  if (builtIns.size) out.builtInVariable = [...builtIns];
  return out;
}

export function compileConversion(recipe: ConversionRecipe): ContainerSpec {
  switch (recipe.kind) {
    case "ga4-event":
      return ga4Event(recipe);
    case "google-ads":
      return googleAdsConversion(recipe);
  }
}

export function compileConversions(recipes: readonly ConversionRecipe[]): ContainerSpec {
  return mergeSpecs(...recipes.map(compileConversion));
}
