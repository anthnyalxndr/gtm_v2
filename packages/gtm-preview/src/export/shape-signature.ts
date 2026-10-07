import { expect } from 'vitest'

/**
 * Check a value against a key-and-type signature taken from a real Tag Assistant export.
 * `src/export/fixtures/tag-assistant-export-shape.json` holds the signatures; they carry no
 * data from the session they were read from, only key names and types.
 */
export type Shape = Record<string, string>

const typeOf = (v: unknown): string =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'object' ? 'object' : typeof v

export function expectShape(actual: unknown, expected: Shape, optional: string[] = []): void {
  const a = actual as Record<string, unknown>
  for (const [key, type] of Object.entries(expected)) {
    if (optional.includes(key) && !(key in a)) continue
    expect(a, `missing key ${key}`).toHaveProperty(key)
    expect(typeOf(a[key]), `type of ${key}`).toBe(type)
  }
  const extra = Object.keys(a).filter((k) => !(k in expected))
  expect(extra, 'unexpected keys').toEqual([])
}
