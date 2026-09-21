import { describe, expect, it } from 'vitest'
import raw from './fixtures/test-container-session.json'
import { buildReport, hitSignature, type RawSession } from './parse-records'
import { buildTagAssistantExport } from '../export/tag-assistant'
import type { RawRecord } from '../session/debug-queue'

/**
 * The single-container fixture plus a Google tag container (OGT) whose runtime reports the
 * GA4 form_submit hit under its own event 5, the way gtag.js's debug build does.
 */
function withGoogleTag(): RawSession {
  const base = raw as unknown as RawSession
  const gtm = base.records.find(
    (r) => r.messageType === 'EVENT_STARTED' && r.key?.eventName === 'form_submit',
  )!
  const groupId = gtm.key!.groupId!
  const hit = base.hits.find((h) => h.eventName === 'form_submit')!
  const hitUrl = `https://${hit.host}${hit.path}?${new URLSearchParams(hit.params)}&tfd=123`
  const key = { publicId: 'G-TEST1', groupId, targetRef: { ctid: 'G-TEST1', isDestination: false } }
  const ogt: RawRecord[] = [
    {
      capturedAt: gtm.capturedAt + 1,
      messageType: 'EVENT_STARTED',
      containerProduct: 'OGT',
      version: '2',
      key: { ...key, eventId: 5, eventName: 'form_submit' },
      tagInfo: [],
    },
    {
      capturedAt: gtm.capturedAt + 2,
      messageType: 'GTAG_HIT',
      containerProduct: 'OGT',
      version: '2',
      key: { ...key, eventId: 5 },
      target: 'G-TEST1',
      url: hitUrl.replace('&tfd=123', ''),
      endpoint: 16,
    },
  ]
  return { ...base, records: [...base.records, ...ogt] }
}

const meta = {
  scenario: { name: 'multi', startUrl: 'http://127.0.0.1:4173/' },
  container: { id: 'GTM-WNX8FFXW', environment: 2 },
  hitPolicy: 'dry' as const,
}

describe('a Google tag container alongside the GTM container', () => {
  const report = buildReport(withGoogleTag(), meta)

  it('lists both containers, GTM first, and keeps their events apart', () => {
    expect(report.containers.map((c) => `${c.id}:${c.product}`)).toEqual([
      'GTM-WNX8FFXW:GTM',
      'G-TEST1:OGT',
    ])
    expect(
      report.events
        .filter((e) => e.container === 'G-TEST1')
        .map((e) => `${e.eventId}:${e.eventName}`),
    ).toEqual(['5:form_submit'])
    expect(report.events.filter((e) => e.container === 'GTM-WNX8FFXW')).toHaveLength(8)
  })

  it('attributes the hit to the event the runtime reported, ignoring send-time parameters', () => {
    const ga4 = report.hits.filter((h) => h.eventName === 'form_submit')
    expect(ga4.length).toBeGreaterThan(0)
    expect(
      ga4.every(
        (h) => h.attributedBy === 'runtime' && h.container === 'G-TEST1' && h.eventId === 5,
      ),
    ).toBe(true)
  })

  it('still judges the GTM tag against the hits in its window, so nothing is flagged', () => {
    const fs = report.events.find(
      (e) => e.container === 'GTM-WNX8FFXW' && e.eventName === 'form_submit',
    )!
    expect(fs.tags[0]?.decision).toBe('execute')
    expect(fs.mismatches).toEqual([])
    expect(report.summary.events).toBe(8)
    expect(report.summary.tagsExecuted).toBe(1)
  })

  it('exports one container entry per container', () => {
    const doc = buildTagAssistantExport(withGoogleTag(), {
      containerId: 'GTM-WNX8FFXW',
      environment: 2,
      startUrl: 'http://127.0.0.1:4173/',
      now: new Date('2026-09-20T00:00:00Z'),
    }) as {
      data: {
        domainDetails: { containers: string[] }
        containers: {
          publicId: string
          product: string
          messages: unknown[]
          containerDetails: { container: { type: string } }
        }[]
      }
    }
    expect(doc.data.domainDetails.containers).toEqual(['GTM-WNX8FFXW', 'G-TEST1'])
    expect(
      doc.data.containers.map((c) => [
        c.publicId,
        c.product,
        c.messages.length,
        c.containerDetails.container.type,
      ]),
    ).toEqual([
      ['GTM-WNX8FFXW', 'GTM', 8, 'TAG_MANAGER'],
      ['G-TEST1', 'OGT', 1, 'GTE'],
    ])
  })
})

describe('hitSignature', () => {
  it('ignores host and non-identifying parameters', () => {
    const a = hitSignature(
      'https://www.google-analytics.com/g/collect?v=2&tid=G-1&en=x&_p=9&cid=c&tfd=100',
    )
    const b = hitSignature(
      'https://www.google.com/g/collect?v=2&tid=G-1&en=x&_p=9&cid=c&tfd=200&gaf=1',
    )
    expect(a).toBe(b)
    expect(hitSignature('https://example.com/x?only=1')).toBeUndefined()
  })
})
