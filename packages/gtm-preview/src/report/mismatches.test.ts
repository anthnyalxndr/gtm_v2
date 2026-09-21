import { describe, expect, it } from 'vitest'
import { findMismatches } from './mismatches'
import type { EventReport, Hit } from './types'

const hit = (vendor: string, eventName?: string): Hit => ({
  at: 0,
  vendor,
  host: `${vendor}.example`,
  path: '/',
  params: {},
  eventName,
  outcome: 'aborted',
})
const tag = (
  name: string,
  type: string,
  status = 'execute_succeeded',
  decision: EventReport['tags'][number]['decision'] = 'execute',
) => ({ name, type, decision, status, params: {} })

describe('findMismatches', () => {
  it('reports nothing when an executed GA4 tag has a hit', () => {
    expect(findMismatches({ tags: [tag('GA4 - x', 'gaawe')], hits: [hit('ga4', 'x')] })).toEqual([])
  })
  it('flags an executed hit-sending tag with no hit', () => {
    expect(findMismatches({ tags: [tag('Ads conv', 'awct')], hits: [] })).toEqual([
      { kind: 'tag_without_hit', tag: 'Ads conv', tagType: 'awct' },
    ])
  })
  it('does not flag listeners, linkers, or a failed tag for missing hits', () => {
    expect(
      findMismatches({
        tags: [
          tag('Click Listener', 'cl'),
          tag('Linker', 'gclidw'),
          tag('GA4', 'gaawe', 'execute_failed'),
        ],
        hits: [],
      }),
    ).toEqual([])
  })
  it('lets the Conversion Linker and a call conversion explain Ads hits, and never flags a runtime-attributed hit', () => {
    expect(findMismatches({ tags: [tag('Linker', 'gclidw')], hits: [hit('google_ads')] })).toEqual(
      [],
    )
    expect(findMismatches({ tags: [tag('Calls', 'awcc')], hits: [] })).toEqual([
      { kind: 'tag_without_hit', tag: 'Calls', tagType: 'awcc' },
    ])
    expect(
      findMismatches({ tags: [], hits: [{ ...hit('ga4', 'page_view'), attributedBy: 'runtime' }] }),
    ).toEqual([])
  })
  it('judges tags against the window hits and hits against the attributed ones', () => {
    expect(findMismatches({ tags: [tag('GA4', 'gaawe')], hits: [] }, [hit('ga4', 'x')])).toEqual([])
  })
  it('does not require the Google tag to send a hit but lets it explain one', () => {
    expect(findMismatches({ tags: [tag('Google Tag', 'googtag')], hits: [] })).toEqual([])
    expect(
      findMismatches({ tags: [tag('Google Tag', 'googtag')], hits: [hit('ga4', 'page_view')] }),
    ).toEqual([])
  })
  it('flags hits that no executed tag explains', () => {
    expect(
      findMismatches({
        tags: [tag('Click Listener', 'cl')],
        hits: [hit('ga4', 'fixture_ping'), hit('floodlight')],
      }),
    ).toEqual([
      { kind: 'hit_without_tag', vendor: 'ga4', host: 'ga4.example', eventName: 'fixture_ping' },
      { kind: 'hit_without_tag', vendor: 'floodlight', host: 'floodlight.example' },
    ])
  })
  it('does not treat a blocked tag as explaining a hit', () => {
    expect(
      findMismatches({
        tags: [tag('GA4', 'gaawe', undefined as unknown as string, 'blocked')],
        hits: [hit('ga4')],
      }),
    ).toHaveLength(1)
  })
})
