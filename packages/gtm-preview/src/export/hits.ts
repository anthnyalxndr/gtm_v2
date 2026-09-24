/**
 * The "Hits Sent" panel in Tag Assistant is fed by `hitInfo` entries inside a message's
 * `data` array, alongside the `ruleInfo` entry. Each one describes a request a tag runtime
 * made: where it went, and every parameter with a display name.
 *
 * Shapes here were read from a native page-view export of GTM-5KNSPW9K (2026-09-23). Fields
 * whose meaning is not settled are marked; task-22 should confirm them against more exports.
 */

type AnyRecord = Record<string, unknown>

/**
 * Display names Tag Assistant shows for GA4 collect parameters. A parameter with no entry
 * keeps its raw key, which is what a native export does: `dma`, `frm`, `gcd`, `ibt`, `ngs`,
 * `pscdl` and `rcb` all appear unchanged there.
 */
export const HIT_PARAM_NAMES: Readonly<Record<string, string>> = {
  v: 'Protocol Version',
  tid: 'Measurement ID',
  cid: 'Client ID',
  en: 'Event Name',
  dl: 'Page Location',
  dr: 'Page Referrer',
  dt: 'Page Title',
  ul: 'Language',
  sr: 'Screen Resolution',
  sid: 'Session ID',
  sct: 'Session Count',
  seg: 'Session Engaged',
  _ss: 'Session Start',
  _fv: 'First Visit',
  _nsi: 'New to Site',
  _p: 'Random Page ID',
  _s: 'Request Number',
  _dbg: 'Debug View',
  gcs: 'Cookie Consent State',
  dma_cps: 'Google Services Consent State',
  npa: 'Non-personalized Ads',
  tag_exp: 'Tag Experiments',
  _et: 'Engagement Time',
  _eu: 'Event Usage',
  sst: 'Session Start Time',
  ep: 'Event Parameter',
  up: 'User Property',
}

/** GA4 event names Tag Assistant titles rather than showing raw. */
const HIT_TITLES: Readonly<Record<string, string>> = {
  page_view: 'Page View',
  user_engagement: 'User Engagement',
  first_visit: 'First Visit',
  session_start: 'Session Start',
  scroll: 'Scroll',
  click: 'Click',
  view_search_results: 'View Search Results',
  form_start: 'Form Start',
  form_submit: 'Form Submit',
  purchase: 'Purchase',
  conversion: 'Conversion',
}

export interface HitContext {
  /** The message this hit is attached to. */
  messageIndex: number
  eventId: number
  groupId: string
}

const titleFor = (eventName: string | undefined, host: string): string => {
  if (eventName) return HIT_TITLES[eventName] ?? eventName
  return host.includes('doubleclick') || host.includes('googleadservices') ? 'Conversion' : 'Hit'
}

/**
 * What a native export calls each kind of hit: "Google Analytics Hit" with type 2 for a GA4
 * collect request, "Google Ads Event" with type 3 for the Ads conversion endpoints (both seen
 * in a native page-view export, 2026-09-23).
 */
const subtitleFor = (host: string, path: string): { subtitle: string; type: number } =>
  path === '/g/collect' || host.includes('google-analytics')
    ? { subtitle: 'Google Analytics Hit', type: 2 }
    : { subtitle: 'Google Ads Event', type: 3 }

export function parameterEntries(url: URL, postBody?: string): AnyRecord[] {
  const pairs: [string, string][] = [...url.searchParams]
  if (postBody) {
    for (const line of postBody.split('\n')) {
      for (const [k, v] of new URLSearchParams(line)) pairs.push([k, v])
    }
  }
  return pairs.map(([name, value]) => ({
    name,
    value,
    // A native export gives every parameter a descriptor; the display name falls back to the
    // key itself. `type` is 1 for `v` and 0 for the rest in the one export seen, so 0 here.
    descriptor: { shortName: name, type: 0, displayName: HIT_PARAM_NAMES[name] ?? name },
  }))
}

/** Build one `hitInfo` entry from a runtime GTAG_HIT record. Returns undefined if unusable. */
export function buildHitInfo(record: AnyRecord, ctx: HitContext): AnyRecord | undefined {
  const raw = record.url
  if (typeof raw !== 'string') return undefined
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return undefined
  }
  // A native export passes the runtime's own target through: a string for GA4, an array for
  // Ads. A record with no destination (the conversion linker's own calls report `[""]`) does
  // not appear in a native export at all, so it is dropped here. Provisional, task-22.
  const target = record.target
  const destinations = (Array.isArray(target) ? target : [target]).filter(
    (t) => typeof t === 'string' && t.length > 0,
  )
  if (destinations.length === 0) return undefined
  const destination = Array.isArray(target) ? destinations : destinations[0]
  const eventName = url.searchParams.get('en') ?? undefined
  const { subtitle, type } = subtitleFor(url.host, url.pathname)
  const title = titleFor(eventName, url.host)
  const key = { eventId: ctx.eventId, groupId: ctx.groupId }
  return {
    displayName: title,
    title,
    subtitle,
    type,
    baseUrl: `${url.origin}${url.pathname}`,
    parameters: parameterEntries(
      url,
      typeof record.postBody === 'string' ? record.postBody : undefined,
    ),
    destination,
    originatedMessageIndex: ctx.messageIndex,
    firedMessageIndex: ctx.messageIndex,
    originatedMessageKey: key,
    firedMessageKey: key,
  }
}

/**
 * The Ads consent endpoint `/ccm/collect` is sent twice, once with `fmt=8` and once with
 * `fmt=3`, and both requests really do leave the browser (seen on the wire, 2026-09-23). A
 * native export shows one of them: for the page-view session compared in task-22 it kept the
 * `fmt=8` record, which the runtime reported first. So the export collapses a measurement
 * delivered by two transports into one entry.
 *
 * Only the export collapses them. The `SessionReport` still lists both network requests,
 * because both were made.
 *
 * Provisional, task-22: one session is thin evidence for "keep the first" over "drop fmt=3".
 */
export function dedupeTransportDuplicates(records: AnyRecord[]): AnyRecord[] {
  const seen = new Set<string>()
  const out: AnyRecord[] = []
  for (const r of records) {
    const key = transportAgnosticKey(r)
    if (key !== undefined && seen.has(key)) continue
    if (key !== undefined) seen.add(key)
    out.push(r)
  }
  return out
}

/** Everything identifying about a hit except the transport format. */
function transportAgnosticKey(record: AnyRecord): string | undefined {
  if (typeof record.url !== 'string') return undefined
  try {
    const u = new URL(record.url)
    u.searchParams.delete('fmt')
    u.searchParams.sort()
    const body = typeof record.postBody === 'string' ? record.postBody : ''
    return `${u.origin}${u.pathname}?${u.searchParams.toString()}|${body}`
  } catch {
    return undefined
  }
}
