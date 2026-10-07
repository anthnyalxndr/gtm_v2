import type { RawDataLayerPush, RawRecord } from '../session/debug-queue'
import type { HitPolicy } from '../scenario/schema'
import { HIT_EXPLAINING_TAG_TYPES, findMismatches } from './mismatches'
import type { EventReport, Hit, SessionReport } from './types'

export interface RawSession {
  records: RawRecord[]
  hits: Hit[]
  dataLayer: RawDataLayerPush[]
  errors: string[]
  debugBuildLoaded: boolean
}

export interface ReportMeta {
  scenario: { name: string; startUrl: string }
  container: { id: string; environment: number }
  hitPolicy: HitPolicy
  generatedAt?: Date
}

type AnyRecord = Record<string, unknown>
const obj = (v: unknown): AnyRecord => (v && typeof v === 'object' ? (v as AnyRecord) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)

/** Tag parameters come as [template, resolved] pairs; keep the resolved value and drop the vtp_ prefix. */
export function resolvedParams(tagData: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj(tagData))) {
    if (k === 'function') continue
    const name = k.startsWith('vtp_') ? k.slice(4) : k
    out[name] = Array.isArray(v) && v.length === 2 ? v[1] : v
  }
  return out
}

function consentOf(record: RawRecord): Record<string, boolean> {
  const list = obj(obj(record.consentData).fullConsentList)
  const out: Record<string, boolean> = {}
  for (const [type, v] of Object.entries(list)) {
    const granted = obj(v).isConsentGranted
    if (typeof granted === 'boolean') out[type] = granted
  }
  return out
}

function decisionOf(execute: unknown): EventReport['tags'][number]['decision'] {
  switch (execute) {
    case 'execute':
    case 'blocked':
    case 'suppressed':
    case 'malware':
      return execute
    default:
      return 'unknown'
  }
}

export function buildReport(raw: RawSession, meta: ReportMeta): SessionReport {
  // Event ids restart at 1 on every container load (page load); the groupId the runtime
  // stamps on each record tells loads apart, so events are keyed by both, plus the name.
  const byEvent = new Map<string, RawRecord[]>()
  // Every container that reported anything (the GTM container plus each Google tag), with
  // the product and protocol version each one speaks.
  const containers = new Map<string, { id: string; product?: string; protocolVersion?: string }>()
  for (const r of raw.records) {
    const publicId = str(r.key?.publicId)
    if (publicId && !containers.has(publicId)) {
      containers.set(publicId, {
        id: publicId,
        product: str(r.containerProduct),
        protocolVersion: str(r.version),
      })
    }
    const id = num(r.key?.eventId)
    if (id === undefined) continue
    const key = eventKey(
      str(r.key?.publicId) ?? '',
      str(r.key?.groupId) ?? '',
      id,
      str(r.key?.eventName) ?? '',
    )
    if (!byEvent.has(key)) byEvent.set(key, [])
    byEvent.get(key)!.push(r)
  }
  const primary = containers.get(meta.container.id) ?? [...containers.values()][0]
  const product = primary?.product
  const protocolVersion = primary?.protocolVersion

  const firstEvent = raw.records.find((r) => r.messageType === 'EVENT_STARTED')
  const tags = arr(firstEvent?.tagInfo)
    .map((t, index) => ({
      index,
      name: str(obj(t).name) ?? `tag ${index}`,
      type: str(obj(obj(t).metadata).type),
    }))
    .filter((t) => t.name !== undefined)
  const firstRules = raw.records.find((r) => r.messageType === 'MACRO_RESOLVED')
  const triggers = arr(firstRules?.ruleInfo).map((t) => ({
    name: str(obj(t).name) ?? '',
    firingTags: arr(obj(t).firingTags).filter((n): n is number => typeof n === 'number'),
    blockingTags: arr(obj(t).blockingTags).filter((n): n is number => typeof n === 'number'),
  }))

  // Hits the runtime reported itself (GTAG_HIT), keyed by a signature of identifying
  // parameters: the request that leaves the browser carries extra timing parameters and may
  // be sent to a second host, so whole-URL equality does not work.
  const runtimeHits = new Map<string, string>()
  for (const r of raw.records) {
    if (r.messageType !== 'GTAG_HIT') continue
    const id = num(r.key?.eventId)
    const url = str(r.url)
    if (id === undefined || !url) continue
    // Hit records carry the event id but not its name, so they resolve through the id index.
    const key = idKey(str(r.key?.publicId) ?? '', str(r.key?.groupId) ?? '', id)
    const sig = hitSignature(url)
    if (sig) runtimeHits.set(sig, key)
  }

  const events: EventReport[] = []
  const eventsByKey = new Map<string, EventReport>()
  const eventsById = new Map<string, EventReport>()
  const ordered = [...byEvent.entries()]
    .map(([key, recs]) => ({
      key,
      recs,
      started: recs.find((r) => r.messageType === 'EVENT_STARTED'),
    }))
    .filter(
      (e): e is { key: string; recs: RawRecord[]; started: RawRecord } => e.started !== undefined,
    )
    .sort(
      (a, b) =>
        a.started.capturedAt - b.started.capturedAt ||
        (num(a.started.key?.eventId) ?? 0) - (num(b.started.key?.eventId) ?? 0),
    )
  for (const { key, recs, started } of ordered) {
    const eventId = num(started.key?.eventId) ?? 0
    const eventName = str(started.key?.eventName) ?? ''
    const rules = recs.find((r) => r.messageType === 'MACRO_RESOLVED')
    const triggerResults = arr(rules?.ruleInfo).map((t) => {
      const o = obj(t)
      return {
        name: str(o.name) ?? '',
        pass: typeof o.pass === 'boolean' ? o.pass : null,
        predicates: arr(o.predicates).map((p) => {
          const po = obj(p)
          return {
            function: str(po.function) ?? '',
            left: Array.isArray(po.arg0) ? po.arg0[1] : po.arg0,
            right: Array.isArray(po.arg1) ? po.arg1[1] : po.arg1,
            pass: typeof po.pass === 'boolean' ? po.pass : undefined,
            ignored: po.isIgnored === true ? true : undefined,
          }
        }),
        firingTags: arr(o.firingTags).filter((n): n is number => typeof n === 'number'),
        blockingTags: arr(o.blockingTags).filter((n): n is number => typeof n === 'number'),
      }
    })

    const tagResults = new Map<string, EventReport['tags'][number]>()
    for (const r of recs) {
      if (r.messageType !== 'TAG_STARTED' && r.messageType !== 'TAG_BLOCKED') continue
      const info = obj(arr(r.tagInfo)[0])
      const name = str(r.key?.tagName) ?? str(info.name) ?? ''
      tagResults.set(name, {
        name,
        type: str(obj(info.tagData).function),
        decision: decisionOf(info.execute),
        params: resolvedParams(info.tagData),
      })
    }
    for (const r of recs) {
      if (r.messageType !== 'TAG_STATUS') continue
      const info = obj(arr(r.tagInfo)[0])
      const name = str(r.key?.tagName) ?? str(info.name) ?? ''
      const entry = tagResults.get(name)
      const status = str(info.execute)
      if (entry && status) entry.status = status
      else if (!entry) tagResults.set(name, { name, decision: 'unknown', status, params: {} })
    }

    const dataLayerRecord = recs.find((r) => r.messageType === 'DATA_LAYER')
    const report: EventReport = {
      eventId,
      container: str(started.key?.publicId) ?? meta.container.id,
      groupId: str(started.key?.groupId) ?? '',
      pageUrl: str(started.pageUrl),
      eventName,
      at: started.capturedAt,
      message: dataLayerRecord?.message,
      triggers: triggerResults,
      tags: [...tagResults.values()],
      consent: consentOf(started),
      hits: [],
      mismatches: [],
    }
    events.push(report)
    eventsByKey.set(key, report)
    const byId = idKey(report.container, report.groupId, eventId)
    if (!eventsById.has(byId)) eventsById.set(byId, report)
  }

  // Attribute network hits: by the runtime's own hit record first, then by time. Events
  // from the GTM container are the ones tags are judged against, so the time fallback and
  // the per-event window for "tag without hit" both use GTM-container events only.
  const hits = raw.hits.map((h) => ({ ...h }))
  const gtmEvents = events.filter((e) => e.container === meta.container.id)
  // Time fallback: the nearest earlier GTM event, unless one a moment earlier has a tag that
  // can explain the hit (tags fire asynchronously, so their hits often leave just after the
  // next event has started).
  const timeEvent = (at: number): EventReport | undefined => {
    const before = gtmEvents.filter((e) => e.at <= at)
    const nearest = before[before.length - 1]
    if (!nearest) return undefined
    for (let i = before.length - 1; i >= 0; i -= 1) {
      const e = before[i]!
      if (at - e.at > 2000) break
      if (
        e.tags.some(
          (t) =>
            t.decision === 'execute' &&
            t.type !== undefined &&
            HIT_EXPLAINING_TAG_TYPES.has(t.type),
        )
      )
        return e
    }
    return nearest
  }
  for (const h of hits) {
    const url = `https://${h.host}${h.path}?${new URLSearchParams(h.params).toString()}`
    const sig = hitSignature(url)
    const runtimeEvent = sig ? eventsById.get(runtimeHits.get(sig) ?? '') : undefined
    const ev = runtimeEvent ?? timeEvent(h.at)
    if (ev) {
      h.eventId = ev.eventId
      h.groupId = ev.groupId
      h.container = ev.container
      h.attributedBy = runtimeEvent ? 'runtime' : 'time'
      ev.hits.push(h)
    }
  }

  for (const e of events) {
    // GTM's own tags are judged against every hit in their time window, wherever the
    // runtime filed it; a hit the runtime vouched for is never "without a tag".
    const next = gtmEvents[gtmEvents.indexOf(e) + 1]
    const inWindow = hits.filter((h) => h.at >= e.at && (!next || h.at < next.at))
    const windowHits =
      e.container === meta.container.id ? [...new Set([...e.hits, ...inWindow])] : e.hits
    e.mismatches = findMismatches(e, windowHits)
  }
  // Summary counts describe the GTM container; Google tag containers report their own
  // internal activity tags, which would drown the numbers a person is looking for.
  const allTags = gtmEvents.flatMap((e) => e.tags)
  return {
    version: 1,
    generatedAt: (meta.generatedAt ?? new Date()).toISOString(),
    scenario: meta.scenario,
    container: {
      ...meta.container,
      product,
      protocolVersion,
      debugBuildLoaded: raw.debugBuildLoaded,
    },
    hitPolicy: meta.hitPolicy,
    containers: [...containers.values()].sort((a, b) =>
      a.id === meta.container.id ? -1 : b.id === meta.container.id ? 1 : 0,
    ),
    tags,
    triggers,
    events,
    hits,
    unattributedHits: hits.filter((h) => h.eventId === undefined),
    dataLayerPushes: raw.dataLayer.map((p) => ({
      at: p.capturedAt,
      pageUrl: p.pageUrl,
      value: p.value,
    })),
    errors: raw.errors,
    summary: {
      events: gtmEvents.length,
      tagsExecuted: allTags.filter((t) => t.decision === 'execute').length,
      tagsBlocked: allTags.filter((t) => t.decision === 'blocked' || t.decision === 'suppressed')
        .length,
      tagsFailed: allTags.filter(
        (t) => t.status && /failed|exception|permission_error/.test(t.status),
      ).length,
      hitsAttempted: hits.length,
      hitsSent: hits.filter((h) => h.outcome !== 'aborted').length,
      mismatches:
        events.reduce((n, e) => n + e.mismatches.length, 0) +
        hits.filter((h) => h.eventId === undefined).length,
    },
  }
}

/**
 * Ids restart per container load, GTM can reuse an id within a load for a different event
 * name (seen with form_start), and each container on the page numbers its own events.
 */
const eventKey = (container: string, groupId: string, eventId: number, eventName: string): string =>
  `${container}:${groupId}:${eventId}:${eventName}`
const idKey = (container: string, groupId: string, eventId: number): string =>
  `${container}:${groupId}:${eventId}`

/** Parameters that identify one hit across the runtime's record and the request on the wire. */
const HIT_ID_PARAMS = ['tid', 'en', '_p', '_s', 'cid', 'rcb', 'rnd', 'auid', 'sid']

/** Path plus identifying parameters. The host is left out: GA4 sends the same hit to two hosts. */
export function hitSignature(url: string): string | undefined {
  try {
    const u = new URL(url)
    const parts = HIT_ID_PARAMS.filter((k) => u.searchParams.has(k)).map(
      (k) => `${k}=${u.searchParams.get(k)}`,
    )
    if (parts.length < 2) return undefined
    return `${u.pathname}?${parts.join('&')}`
  } catch {
    return undefined
  }
}
