import type { BuiltInVariableType } from "./generated/tagmanager-v2.js";
import type { ContainerSpec, EntityKind } from "./types.js";

const KINDS: readonly EntityKind[] = [
  "folder",
  "variable",
  "trigger",
  "tag",
  "client",
  "transformation",
];

/**
 * Merge spec fragments. Entities with the same name and identical content
 * are deduplicated; the same name with different content is an error.
 */
export function mergeSpecs(...fragments: ContainerSpec[]): ContainerSpec {
  const out: ContainerSpec = {};
  const builtIns = new Set<BuiltInVariableType>();
  for (const fragment of fragments) {
    if (fragment.containerType) {
      if (out.containerType && out.containerType !== fragment.containerType) {
        throw new Error(
          `Cannot merge a ${fragment.containerType} spec into a ${out.containerType} spec`
        );
      }
      out.containerType = fragment.containerType;
    }
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
