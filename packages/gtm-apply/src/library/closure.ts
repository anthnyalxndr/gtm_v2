import { builtInTypeForName, referencedVariableNames } from "../spec/catalog.js";
import type { ContainerSpec, EntityKind, TriggerSpec } from "../spec/types.js";

export type RefKind = EntityKind | "builtInVariable";

export interface EntityRef {
  kind: RefKind;
  name: string;
}

export const refKey = (r: EntityRef): string => `${r.kind}:${r.name}`;

const byName = <T extends { name?: string | null }>(
  items: readonly T[] | undefined,
  name: string
) => items?.find((e) => e.name === name);

/** Client names a server trigger binds to through a `{{Client Name}} equals X` condition. */
function clientsBoundBy(trigger: TriggerSpec): string[] {
  const out: string[] = [];
  for (const cond of [...(trigger.filter ?? []), ...(trigger.customEventFilter ?? [])]) {
    if (cond.type !== "equals") continue;
    const arg0 = cond.parameter?.find((p) => p.key === "arg0")?.value;
    const arg1 = cond.parameter?.find((p) => p.key === "arg1")?.value;
    if (arg0 === "{{Client Name}}" && arg1) out.push(arg1);
  }
  return out;
}

/** Direct references from one entity, in spec-name terms. */
export function referencesOf(spec: ContainerSpec, ref: EntityRef): EntityRef[] {
  const out: EntityRef[] = [];
  const add = (kind: RefKind, name: string | null | undefined) => {
    if (name) out.push({ kind, name });
  };
  const variables = (value: unknown) => {
    for (const name of referencedVariableNames(value)) {
      if (name.startsWith("_")) continue;
      if (byName(spec.variable, name)) add("variable", name);
      else {
        const type = builtInTypeForName(name);
        if (type) add("builtInVariable", type);
      }
    }
  };
  switch (ref.kind) {
    case "tag": {
      const tag = byName(spec.tag, ref.name);
      if (!tag) return out;
      add("folder", tag.parentFolderName);
      for (const t of tag.firingTriggerName ?? []) add("trigger", t);
      for (const t of tag.blockingTriggerName ?? []) add("trigger", t);
      for (const s of tag.setupTag ?? []) add("tag", s.tagName);
      for (const s of tag.teardownTag ?? []) add("tag", s.tagName);
      variables(tag);
      return out;
    }
    case "trigger": {
      const trigger = byName(spec.trigger, ref.name);
      if (!trigger) return out;
      add("folder", trigger.parentFolderName);
      for (const c of clientsBoundBy(trigger)) if (byName(spec.client, c)) add("client", c);
      variables(trigger);
      return out;
    }
    case "variable":
    case "client":
    case "transformation": {
      const entity = byName(spec[ref.kind], ref.name);
      if (!entity) return out;
      add("folder", entity.parentFolderName);
      variables(entity);
      return out;
    }
    default:
      return out;
  }
}

/** Every entity reachable from `roots` by following references, roots included, in discovery order. */
export function closure(spec: ContainerSpec, roots: readonly EntityRef[]): EntityRef[] {
  const seen = new Set<string>();
  const out: EntityRef[] = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const ref = queue.shift()!;
    const key = refKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
    queue.push(...referencesOf(spec, ref));
  }
  return out;
}
