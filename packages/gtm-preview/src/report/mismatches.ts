import type { EventReport, Mismatch } from './types'

/**
 * Tag template types whose only job is to send a hit. When GTM says one of these executed
 * and nothing left the browser for that event, something is wrong.
 */
export const HIT_SENDING_TAG_TYPES: ReadonlySet<string> = new Set([
  'gaawe',
  'awct',
  'sp',
  'flc',
  'fls',
  'ua',
  'img',
])

/**
 * Types that can explain a hit but are not required to produce one: the Google tag sends a
 * page_view only when configured to, and Custom HTML can do anything.
 */
export const HIT_EXPLAINING_TAG_TYPES: ReadonlySet<string> = new Set([
  ...HIT_SENDING_TAG_TYPES,
  'googtag',
  'html',
])

const succeeded = (t: EventReport['tags'][number]) =>
  t.decision === 'execute' && !(t.status && /failed|exception|permission_error/.test(t.status))

/** Compare GTM's verdicts with what left the browser for one event. Pure. */
export function findMismatches(event: Pick<EventReport, 'tags' | 'hits'>): Mismatch[] {
  const out: Mismatch[] = []
  const executed = event.tags.filter(succeeded)
  if (event.hits.length === 0) {
    for (const t of executed) {
      if (t.type && HIT_SENDING_TAG_TYPES.has(t.type))
        out.push({ kind: 'tag_without_hit', tag: t.name, tagType: t.type })
    }
  }
  const explained = executed.some(
    (t) => t.type !== undefined && HIT_EXPLAINING_TAG_TYPES.has(t.type),
  )
  if (!explained) {
    for (const h of event.hits) {
      const m: Mismatch = { kind: 'hit_without_tag', vendor: h.vendor, host: h.host }
      if (h.eventName) m.eventName = h.eventName
      out.push(m)
    }
  }
  return out
}
