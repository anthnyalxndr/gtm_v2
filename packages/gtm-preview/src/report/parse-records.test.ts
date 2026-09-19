import { describe, expect, it } from 'vitest'
import raw from './fixtures/test-container-session.json'
import { buildReport, resolvedParams, type RawSession } from './parse-records'

const meta = {
  scenario: { name: 'example-fixture', startUrl: 'http://127.0.0.1:4173/' },
  container: { id: 'GTM-WNX8FFXW', environment: 2 },
  hitPolicy: 'dry' as const,
  generatedAt: new Date('2026-09-19T12:00:00Z'),
}
const report = buildReport(raw as unknown as RawSession, meta)

describe('buildReport on a captured session', () => {
  it('reports the container and protocol', () => {
    expect(report.container).toEqual({
      id: 'GTM-WNX8FFXW',
      environment: 2,
      product: 'GTM',
      protocolVersion: '2',
      debugBuildLoaded: true,
    })
  })

  it('lists the container inventory from the first event', () => {
    expect(report.tags).toEqual([{ index: 0, name: 'GA4 - form_submit', type: 'gaawe' }])
    expect(report.triggers).toEqual([
      { name: 'Custom Event - form_submit', firingTags: [0], blockingTags: [] },
    ])
  })

  it('orders events by id and names them', () => {
    expect(report.events.map((e) => e.eventName)).toEqual([
      'gtm.init_consent',
      'gtm.init',
      'pre_snippet',
      'gtm.js',
      'gtm.dom',
      'gtm.load',
      'cta_click',
      'form_submit',
    ])
  })

  it('records the trigger verdict with its predicate on every event', () => {
    const cta = report.events.find((e) => e.eventName === 'cta_click')!
    expect(cta.triggers).toEqual([
      {
        name: 'Custom Event - form_submit',
        pass: false,
        predicates: [
          {
            function: 'eq',
            left: 'cta_click',
            right: 'form_submit',
            pass: false,
            ignored: undefined,
          },
        ],
        firingTags: [0],
        blockingTags: [],
      },
    ])
    expect(cta.tags).toEqual([])
  })

  it('records the tag decision, final status, and resolved params when a tag fires', () => {
    const fs = report.events.find((e) => e.eventName === 'form_submit')!
    expect(fs.triggers[0]?.pass).toBe(true)
    expect(fs.tags).toEqual([
      {
        name: 'GA4 - form_submit',
        type: 'gaawe',
        decision: 'execute',
        status: 'execute_succeeded',
        params: expect.objectContaining({
          eventName: 'form_submit',
          measurementIdOverride: 'G-PLACEHOLDER',
        }),
      },
    ])
    expect(fs.consent).toEqual({
      ad_storage: true,
      analytics_storage: true,
      ad_user_data: true,
      ad_personalization: true,
    })
  })

  it('attributes network hits to the event that caused them and keeps their outcome', () => {
    const fs = report.events.find((e) => e.eventName === 'form_submit')!
    expect(fs.hits.length).toBeGreaterThanOrEqual(1)
    expect(
      fs.hits.every(
        (h) => h.vendor === 'ga4' && h.eventName === 'form_submit' && h.outcome === 'aborted',
      ),
    ).toBe(true)
    expect(report.hits.filter((h) => h.eventName === 'fixture_ping')).toHaveLength(1)
  })

  it('keeps dataLayer pushes including the one before the snippet', () => {
    const names = report.dataLayerPushes.map((p) => (p.value as { event?: string }).event)
    expect(names[0]).toBe('pre_snippet')
    expect(names).toContain('form_submit')
  })

  it('summarises counts', () => {
    expect(report.summary).toEqual({
      events: 8,
      tagsExecuted: 1,
      tagsBlocked: 0,
      tagsFailed: 0,
      hitsAttempted: 5,
      hitsSent: 0,
      mismatches: 3,
    })
  })

  it("lists the fixture page's fake vendor hits, which fire before any GTM event, as unattributed", () => {
    expect(report.unattributedHits.map((h) => h.vendor)).toEqual([
      'ga4',
      'google_ads',
      'floodlight',
    ])
    expect(report.events.flatMap((e) => e.mismatches)).toEqual([])
    expect(report.events.find((e) => e.eventName === 'form_submit')!.mismatches).toEqual([])
  })

  it('marks the debug build as missing when no per-event records exist', () => {
    const empty = buildReport(
      { records: [], hits: [], dataLayer: [], errors: ['x'], debugBuildLoaded: false },
      meta,
    )
    expect(empty.container.debugBuildLoaded).toBe(false)
    expect(empty.events).toEqual([])
    expect(empty.errors).toEqual(['x'])
  })
})

describe('resolvedParams', () => {
  it('keeps the resolved half of each pair and strips the vtp_ prefix', () => {
    expect(
      resolvedParams({
        function: 'gaawe',
        vtp_eventName: ['tmpl', 'real'],
        tag_id: [6, 6],
        plain: 'x',
      }),
    ).toEqual({
      eventName: 'real',
      tag_id: 6,
      plain: 'x',
    })
  })
})
