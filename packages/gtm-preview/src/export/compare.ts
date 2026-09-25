/**
 * Structural comparison of two Tag Assistant export documents, for checking what this tool
 * produces against a native preview session (task-22). Pure: no files, no network.
 */

export interface Difference {
  path: string
  kind: 'missing' | 'extra' | 'type' | 'value' | 'length'
  native?: unknown
  ours?: unknown
}

/**
 * Keys whose values cannot match between two sessions: clocks, per-session identifiers, and
 * the authorization code. Their presence is still compared, only their values are ignored.
 */
export const VOLATILE_KEYS: ReadonlySet<string> = new Set([
  'timestamp',
  'createdTime',
  'lastUpdatedTime',
  'groupId',
  'nonce',
  'pageId',
  'uId',
  'fingerprint',
  'auth',
  'rand',
  'seenEventIdPriorityIds',
  'consentKey',
  'gtm.start',
  'gtm.uniqueEventId',
  'start',
  'uniqueEventId',
])

/** Query parameters GTM adds per session, which make otherwise equal URLs differ. */
const VOLATILE_PARAMS = ['gtm_debug', 'gtm_auth', 'gtm_preview', '_dbg']

export function normaliseUrl(value: string): string {
  try {
    const u = new URL(value)
    for (const p of VOLATILE_PARAMS) u.searchParams.delete(p)
    // www is a property of how the session was started, not of the export.
    u.hostname = u.hostname.replace(/^www\./, '')
    return u.toString()
  } catch {
    return value
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const typeOf = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

/** How to line up the elements of an array so like is compared with like. */
export type KeyFn = (element: unknown, index: number) => string

export interface CompareOptions {
  /** Path (with array indices replaced by `[]`) to a function keying that array's elements. */
  alignBy?: Record<string, KeyFn>
  /**
   * Paths whose object keys carry no meaning across sessions, such as a map keyed by group id.
   * Their entries are compared in order instead of by key.
   */
  alignKeyless?: string[]
  /** Paths to skip entirely. */
  ignore?: string[]
  /** Compare values, not just shape. Off by default: shape first, then values. */
  compareValues?: boolean
}

const generalise = (path: string): string => path.replace(/\[[^\]]*\]/g, '[]')

export function compareExports(
  native: unknown,
  ours: unknown,
  options: CompareOptions = {},
): Difference[] {
  const out: Difference[] = []
  const ignore = new Set(options.ignore ?? [])
  const keyless = new Set(options.alignKeyless ?? [])

  const walk = (a: unknown, b: unknown, path: string, key?: string): void => {
    if (ignore.has(generalise(path))) return
    if (typeOf(a) !== typeOf(b)) {
      out.push({ path, kind: 'type', native: typeOf(a), ours: typeOf(b) })
      return
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length)
        out.push({ path, kind: 'length', native: a.length, ours: b.length })
      const keyFn = options.alignBy?.[generalise(path)]
      if (keyFn) {
        const index = (arr: unknown[]) => {
          const m = new Map<string, unknown>()
          arr.forEach((el, i) => {
            const k = keyFn(el, i)
            m.set(m.has(k) ? `${k}#${i}` : k, el)
          })
          return m
        }
        const left = index(a)
        const right = index(b)
        for (const [k, v] of left) {
          if (!right.has(k)) out.push({ path: `${path}[${k}]`, kind: 'missing', native: k })
          else walk(v, right.get(k), `${path}[${k}]`)
        }
        for (const k of right.keys()) {
          if (!left.has(k)) out.push({ path: `${path}[${k}]`, kind: 'extra', ours: k })
        }
        return
      }
      for (let i = 0; i < Math.min(a.length, b.length); i += 1) walk(a[i], b[i], `${path}[${i}]`)
      return
    }
    if (isObject(a) && isObject(b)) {
      if (keyless.has(generalise(path))) {
        const av = Object.values(a)
        const bv = Object.values(b)
        if (av.length !== bv.length)
          out.push({ path, kind: 'length', native: av.length, ours: bv.length })
        for (let i = 0; i < Math.min(av.length, bv.length); i += 1)
          walk(av[i], bv[i], `${path}[${i}]`)
        return
      }
      for (const k of Object.keys(a)) {
        if (!(k in b)) out.push({ path: `${path}.${k}`, kind: 'missing', native: typeOf(a[k]) })
        else walk(a[k], b[k], `${path}.${k}`, k)
      }
      for (const k of Object.keys(b)) {
        if (!(k in a)) out.push({ path: `${path}.${k}`, kind: 'extra', ours: typeOf(b[k]) })
      }
      return
    }
    if (!options.compareValues) return
    if (key !== undefined && VOLATILE_KEYS.has(key)) return
    const na = typeof a === 'string' ? normaliseUrl(a) : a
    const nb = typeof b === 'string' ? normaliseUrl(b) : b
    if (na !== nb) out.push({ path, kind: 'value', native: a, ours: b })
  }

  walk(native, ours, '$')
  return out
}

/** One line per difference, grouped so a long list stays readable. */
export function formatDifferences(diffs: Difference[]): string {
  const show = (v: unknown): string =>
    typeof v === 'string' ? v : v === undefined ? '' : JSON.stringify(v)
  return diffs
    .map((d) => {
      switch (d.kind) {
        case 'missing':
          return `  missing   ${d.path}  (native has ${show(d.native)}, we do not)`
        case 'extra':
          return `  extra     ${d.path}  (we have ${show(d.ours)}, native does not)`
        case 'length':
          return `  length    ${d.path}  native=${show(d.native)} ours=${show(d.ours)}`
        case 'type':
          return `  type      ${d.path}  native=${show(d.native)} ours=${show(d.ours)}`
        default:
          return `  value     ${d.path}  native=${show(d.native)} ours=${show(d.ours)}`
      }
    })
    .join('\n')
}

/** The alignment a Tag Assistant export needs: messages and containers by identity, not position. */
/**
 * Maps whose keys are per-session identifiers: a group id restarts with every run, and the
 * environment name naming a `vendorTemplates` entry is whatever Tag Manager called the
 * environment. Comparing those keys reports every entry as missing on one side and extra on
 * the other, which hides the real differences inside them.
 */
export const EXPORT_KEYLESS_MAPS: string[] = [
  '$.data.containers[].pageSummaries',
  '$.data.containers[].containerLoadInfoByGroupId',
  '$.data.containers[].vendorTemplates',
]

export const EXPORT_ALIGNMENT: Record<string, KeyFn> = {
  '$.data.containers': (el) => String((el as { publicId?: string }).publicId),
  '$.data.containers[].messages': (el) => {
    const m = el as { eventName?: string; title?: string }
    return m.eventName ?? `(${m.title ?? 'untitled'})`
  },
  '$.data.containers[].groups': (_el, i) => `group${i}`,
  '$.data.containers[].messages[].tagInfo': (el) => String((el as { name?: string }).name),
  '$.data.containers[].messages[].macroInfo': (el) => String((el as { name?: string }).name),
}
