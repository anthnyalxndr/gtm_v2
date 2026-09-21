import type { RawDataLayerPush, RawRecord } from '../session/debug-queue'
import type { HitPolicy } from '../scenario/schema'
import { findMismatches } from './mismatches'
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
  let product: string | undefined
  let protocolVersion: string | undefined
  for (const r of raw.records) {
    product ??= str(r.containerProduct)
    protocolVersion ??= str(r.version)
    const id = num(r.key?.eventId)
    if (id === undefined) continue
    const key = eventKey(str(r.key?.groupId) ?? '', id, str(r.key?.eventName) ?? '')
    if (!byEvent.has(key)) byEvent.set(key, [])
    byEvent.get(key)!.push(r)
  }

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

  // Hits reported by the runtime itself, used to attribute network hits to events by URL.
  const gtagHitEvent = new Map<string, string>()
  for (const r of raw.records) {
    if (r.messageType !== 'GTAG_HIT') continue
    const id = num(r.key?.eventId)
    const url = str(r.url)
    if (id !== undefined && url)
      gtagHitEvent.set(
        stripDebugParam(url),
        eventKey(str(r.key?.groupId) ?? '', id, str(r.key?.eventName) ?? ''),
      )
  }

  const events: EventReport[] = []
  const eventsByKey = new Map<string, EventReport>()
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
  }

  // Attribute network hits: by the runtime's own hit record first, then by time.
  const hits = raw.hits.map((h) => ({ ...h }))
  for (const h of hits) {
    const url = `https://${h.host}${h.path}?${new URLSearchParams(h.params).toString()}`
    let ev = eventsByKey.get(gtagHitEvent.get(stripDebugParam(url)) ?? '')
    if (!ev) {
      const before = events.filter((e) => e.at <= h.at)
      ev = before[before.length - 1]
    }
    if (ev) {
      h.eventId = ev.eventId
      h.groupId = ev.groupId
      ev.hits.push(h)
    }
  }

  for (const e of events) e.mismatches = findMismatches(e)
  const allTags = events.flatMap((e) => e.tags)
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
      events: events.length,
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

/** GTM can reuse an event id within a load for a different event name (seen with form_start), so the name is part of the key. */
const eventKey = (groupId: string, eventId: number, eventName: string): string =>
  `${groupId}:${eventId}:${eventName}`

function stripDebugParam(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('_dbg')
    return u.toString()
  } catch {
    return url
  }
}
