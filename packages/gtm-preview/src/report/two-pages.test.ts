import { describe, expect, it } from 'vitest'
import raw from './fixtures/test-container-session.json'
import { buildReport, type RawSession } from './parse-records'
import { buildTagAssistantExport } from '../export/tag-assistant'

/** The single-page fixture followed by the same records as a second container load. */
function twoPages(): RawSession {
  const base = raw as unknown as RawSession
  const shift = 60_000
  const second = base.records.map((r) => ({
    ...r,
    capturedAt: r.capturedAt + shift,
    pageUrl: 'http://127.0.0.1:4173/page2.html',
    key: r.key ? { ...r.key, groupId: 'group-two' } : r.key,
  }))
  return {
    ...base,
    records: [...base.records, ...second],
    hits: [...base.hits, ...base.hits.map((h) => ({ ...h, at: h.at + shift }))],
  }
}

const meta = {
  scenario: { name: 'two', startUrl: 'http://127.0.0.1:4173/' },
  container: { id: 'GTM-WNX8FFXW', environment: 2 },
  hitPolicy: 'dry' as const,
}

describe('two container loads with restarting event ids', () => {
  const report = buildReport(twoPages(), meta)

  it('keeps every event from both loads, in time order', () => {
    expect(report.events).toHaveLength(16)
    expect(report.events.slice(0, 8).every((e) => e.groupId !== 'group-two')).toBe(true)
    expect(report.events.slice(8).every((e) => e.groupId === 'group-two')).toBe(true)
    expect(report.events[8]).toMatchObject({
      eventId: 1,
      eventName: 'gtm.init_consent',
      pageUrl: 'http://127.0.0.1:4173/page2.html',
    })
  })

  it("attributes the second load's hits to the second load's events", () => {
    const second = report.events.filter((e) => e.groupId === 'group-two')
    const fs = second.find((e) => e.eventName === 'form_submit')!
    expect(fs.hits.map((h) => h.eventName)).toEqual(['form_submit', 'form_submit'])
    expect(fs.hits.every((h) => h.groupId === 'group-two')).toBe(true)
    expect(fs.mismatches).toEqual([])
    expect(report.summary.events).toBe(16)
  })

  it('exports both loads as separate groups with globally numbered messages', () => {
    const doc = buildTagAssistantExport(twoPages(), {
      containerId: 'GTM-WNX8FFXW',
      environment: 2,
      startUrl: 'http://127.0.0.1:4173/',
      now: new Date('2026-09-20T00:00:00Z'),
    }) as {
      data: {
        containers: {
          messages: { index: number; eventId: number; groupId: string }[]
          groups: unknown[]
          numPages: number
        }[]
      }
    }
    const c = doc.data.containers[0]!
    // Two page loads plus the empty trailing group a native export always ends with.
    expect(c.groups).toHaveLength(3)
    expect(c.numPages).toBe(2)
    expect(c.messages.map((m) => m.index)).toEqual([
      16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ])
    expect(c.messages[0]).toMatchObject({ eventId: 8, groupId: 'group-two' })
    expect(c.messages[15]).toMatchObject({ eventId: 1 })
  })
})
