/**
 * Render a value the way Tag Assistant prints values in its export: a JavaScript object
 * literal with unquoted keys, double-quoted strings, and two-space indentation when
 * multi-line. `inline` renders on one line, which is how parameter values appear.
 */
export function toJsLiteral(value: unknown, inline = false, depth = 0): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'function') return '[fn]'
  if (isMacroRef(value)) return JSON.stringify(`{{${value.name}}}`)
  // A map is printed as the object it stands for, and always on one line, which is what a
  // native export shows for the rows of a parameter table.
  if (isGtmMap(value)) return toJsLiteral(Object.fromEntries(value.pairs), true, depth)
  const pad = inline ? '' : '  '.repeat(depth + 1)
  const end = inline ? '' : '  '.repeat(depth)
  const nl = inline ? '' : '\n'
  const sep = inline ? ', ' : ',\n'
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `[${nl}${value.map((v) => pad + toJsLiteral(v, inline, depth + 1)).join(sep)}${nl}${end}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return `{${nl}${entries.map(([k, v]) => `${pad}${k}: ${toJsLiteral(v, inline, depth + 1)}`).join(sep)}${nl}${end}}`
  }
  return String(value)
}

/**
 * The debug feed writes a structured template parameter as {type: "map", pairs: [[key, value]]}.
 * Only maps and macro references appear in the sessions captured so far; a list would need the
 * same treatment and is not handled until one is seen.
 */
function isGtmMap(value: unknown): value is { type: 'map'; pairs: [string, unknown][] } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { type?: unknown; pairs?: unknown }
  return (
    v.type === 'map' &&
    Array.isArray(v.pairs) &&
    v.pairs.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string') &&
    Object.keys(v).length === 2
  )
}

/** The debug feed writes a variable reference inside a template as {type: "macro", name}. */
function isMacroRef(value: unknown): value is { type: 'macro'; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'macro' &&
    typeof (value as { name?: unknown }).name === 'string' &&
    Object.keys(value).length === 2
  )
}
