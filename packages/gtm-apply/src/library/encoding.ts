import { parseNotes, type MetadataEncoding } from "./metadata.js";

export type { MetadataEncoding } from "./metadata.js";

/**
 * The built-in encoding: a JSON trailer below a `---` line in the entity's
 * notes. The text above the line is what the customer receives.
 */
export function notesEncoding(): MetadataEncoding {
  return {
    name: "notes",
    read(entity) {
      const { metadata, error } = parseNotes(entity.notes);
      return { ...(metadata ? { metadata } : {}), ...(error ? { error } : {}) };
    },
    forCustomer(entity) {
      if (entity.notes == null) return entity;
      const { text } = parseNotes(entity.notes);
      if (text === entity.notes) return entity;
      const { notes, ...rest } = entity;
      void notes;
      return (text ? { ...rest, notes: text } : rest) as typeof entity;
    },
  };
}

export type EncodingFactory = (options?: Record<string, unknown>) => MetadataEncoding;

const registry = new Map<string, EncodingFactory>([["notes", () => notesEncoding()]]);

/** Register an encoding under a name a manifest can refer to. */
export function registerEncoding(name: string, factory: EncodingFactory): void {
  registry.set(name, factory);
}

export function resolveEncoding(name: string, options?: Record<string, unknown>): MetadataEncoding {
  const factory = registry.get(name);
  if (!factory) {
    throw new Error(
      `Unknown recipe encoding "${name}"; registered: ${[...registry.keys()].join(", ")}`
    );
  }
  return factory(options);
}
