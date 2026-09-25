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
    // The report keeps the feed's own label; only the export renames OGT to GTAG.
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
      ['G-TEST1', 'GTAG', 1, 'GTE'],
    ])
  })

  it('names the container that loaded the Google tag, and its developer ids', () => {
    const base = withGoogleTag()
    const ogt = base.records.find(
      (r) => r.containerProduct === 'OGT' && r.messageType === 'EVENT_STARTED',
    )!
    const extra: RawRecord[] = [
      {
        capturedAt: ogt.capturedAt - 1,
        messageType: 'INIT',
        containerProduct: 'OGT',
        version: '2',
        key: { publicId: 'G-TEST1', groupId: ogt.key!.groupId },
        containerLoadSource: 6,
        parentTargetReference: { ctid: 'GTM-WNX8FFXW', isDestination: false },
        gtg: { source: 3, mPath: '' },
      },
      {
        capturedAt: ogt.capturedAt,
        messageType: 'GTAG_COMMAND',
        containerProduct: 'OGT',
        version: '2',
        key: { publicId: 'G-TEST1', groupId: ogt.key!.groupId, eventId: 4 },
        inPageCommand: false,
        commandType: 'set',
        // Only a command's ids count; the same keys reach the dataLayer and are not listed.
        commandData: { 'developer_id.dTEST': true, 'developer_id.dOFF': false },
      },
    ]
    const doc = buildTagAssistantExport(
      { ...base, records: [...base.records, ...extra] },
      { containerId: 'GTM-WNX8FFXW', environment: 2, startUrl: 'http://127.0.0.1:4173/' },
    ) as unknown as {
      data: {
        containers: {
          publicId: string
          containerLoadInfoByGroupId: Record<string, Record<string, unknown>>
          vendorTemplates: Record<string, { vendorTemplateTypes: object; paramMaps: object }>
        }[]
      }
    }
    const gtag = doc.data.containers.find((c) => c.publicId === 'G-TEST1')!
    expect(Object.values(gtag.containerLoadInfoByGroupId)[0]).toMatchObject({
      targetId: 'G-TEST1',
      containerLoadSource: 6,
      sourceId: 'GTM-WNX8FFXW',
      developerIds: ['dTEST'],
    })
    // A Google tag container carries no template definitions, so nothing of its own is named.
    const block = Object.values(gtag.vendorTemplates)[0]!
    expect(block.vendorTemplateTypes).toEqual({})
    expect(block.paramMaps).toEqual({})
    expect(block).not.toHaveProperty('environmentLinkType')
    const gtm = doc.data.containers.find((c) => c.publicId === 'GTM-WNX8FFXW')!
    expect(Object.values(gtm.containerLoadInfoByGroupId)[0]).not.toHaveProperty('sourceId')
    expect(Object.values(gtm.containerLoadInfoByGroupId)[0]).not.toHaveProperty('developerIds')
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

describe('the record version field', () => {
  /**
   * The value varies by container and build: GTM containers have reported "2" and "16", and
   * Google tags "2" and "3", with the same record shapes throughout. Nothing may branch on it.
   */
  it('parses the same whatever version the records claim', () => {
    const base = withGoogleTag()
    const relabelled: RawSession = {
      ...base,
      records: base.records.map((r) => ({
        ...r,
        version: r.containerProduct === 'OGT' ? '3' : '16',
      })),
    }
    const a = buildReport(base, { ...meta, generatedAt: new Date(0) })
    const b = buildReport(relabelled, { ...meta, generatedAt: new Date(0) })
    expect(b.containers.map((c) => c.protocolVersion)).toEqual(['16', '3'])
    expect(stripVersions(b)).toEqual(stripVersions(a))
  })
})

function stripVersions(report: ReturnType<typeof buildReport>) {
  return {
    ...report,
    container: { ...report.container, protocolVersion: undefined },
    containers: report.containers.map((c) => ({ ...c, protocolVersion: undefined })),
  }
}
