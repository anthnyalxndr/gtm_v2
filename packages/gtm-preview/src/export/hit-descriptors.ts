import captured from './fixtures/hit-parameter-descriptors.json'

/**
 * What Tag Assistant knows about a hit parameter: the short name it matched, the value type,
 * and the name it shows. A parameter the dictionary does not cover gets no descriptor at all,
 * which is how a native export leaves 38 of the parameters in the captured contact flow.
 *
 * Unlike the template definitions, these are not fetched. Tag Assistant carries them in its own
 * bundle, `new_debug_app_compiled.js`, as one array per vendor, each ending with the eight
 * shared consent descriptors. This file is those arrays, read out on 2026-09-25: 47 for Google
 * Ads, 144 for Universal Analytics, 65 for GA4 and 13 for Floodlight. Refresh by reading the
 * bundle again; the arrays are named in the research doc.
 */
export type HitDictionary = 'ga4' | 'ads' | 'ua' | 'floodlight'

interface CapturedDescriptor {
  shortName: string
  type: number
  displayName: string
  /** Present on a descriptor that matches a family of parameters, such as `ep.<name>`. */
  shortNameRegExp?: string
}

/** What the export writes. A RegExp serialises to `{}`, which is what a native export shows. */
export interface ParameterDescriptor {
  shortName: string
  shortNameRegExp?: Record<string, never>
  type: number
  displayName: string
}

const DICTIONARIES = captured as Record<HitDictionary, CapturedDescriptor[]>

interface Index {
  exact: Map<string, CapturedDescriptor>
  patterns: { descriptor: CapturedDescriptor; regexp: RegExp }[]
}

const INDEXES = new Map<HitDictionary, Index>()

function index(dictionary: HitDictionary): Index {
  let found = INDEXES.get(dictionary)
  if (!found) {
    const all = DICTIONARIES[dictionary] ?? []
    found = {
      exact: new Map(all.filter((d) => !d.shortNameRegExp).map((d) => [d.shortName, d])),
      patterns: all
        .filter((d) => d.shortNameRegExp)
        .map((d) => ({ descriptor: d, regexp: new RegExp(d.shortNameRegExp!) })),
    }
    INDEXES.set(dictionary, found)
  }
  return found
}

/**
 * Which dictionary describes a hit's parameters. Tag Assistant keys this on the endpoint, not
 * on the vendor: the Ads `ccm/collect` endpoint carries GA4's parameter names, so "Event Name"
 * and "Page Title" come from the GA4 list even though the hit is a Google Ads Event.
 */
export function dictionaryFor(baseUrl: string, type: number): HitDictionary {
  if (type === 4) return 'floodlight'
  if (type === 2 || baseUrl.includes('/ccm/collect')) return 'ga4'
  return 'ads'
}

/** The descriptor for one parameter, or undefined when the dictionary does not cover it. */
export function describeParameter(
  dictionary: HitDictionary,
  name: string,
): ParameterDescriptor | undefined {
  const { exact, patterns } = index(dictionary)
  const hit = exact.get(name) ?? patterns.find((p) => p.regexp.test(name))?.descriptor
  if (!hit) return undefined
  return {
    shortName: hit.shortName,
    ...(hit.shortNameRegExp ? { shortNameRegExp: {} } : {}),
    type: hit.type,
    displayName: hit.displayName,
  }
}
