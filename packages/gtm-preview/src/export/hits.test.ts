import { describe, expect, it } from 'vitest'
import { buildHitInfo, dedupeTransportDuplicates, parameterEntries, HIT_PARAM_NAMES } from './hits'

const ctx = { messageIndex: 5, eventId: 4, groupId: 'g1' }
const ga4 = {
  url: 'https://www.google-analytics.com/g/collect?v=2&tid=G-1&en=page_view&dma=0',
  target: 'G-1',
}
const ads = {
  url: 'https://pagead2.googlesyndication.com/ccm/collect?tid=AW-9&en=page_view',
  target: ['AW-9'],
}

describe('parameterEntries', () => {
  it('gives every parameter a descriptor, falling back to the raw key', () => {
    const p = parameterEntries(new URL(ga4.url))
    expect(p[0]).toEqual({
      name: 'v',
      value: '2',
      descriptor: { shortName: 'v', type: 0, displayName: 'Protocol Version' },
    })
    expect(p.find((x) => (x as { name: string }).name === 'dma')).toMatchObject({
      descriptor: { displayName: 'dma' },
    })
    expect(HIT_PARAM_NAMES.cid).toBe('Client ID')
  })
  it('reads a batched post body as more parameters', () => {
    const p = parameterEntries(new URL('https://x.test/g/collect?v=2'), 'en=scroll&epn.percent=90')
    expect(p.map((x) => (x as { name: string }).name)).toEqual(['v', 'en', 'epn.percent'])
  })
})

describe('buildHitInfo', () => {
  it('describes a GA4 hit the way a native export does', () => {
    expect(buildHitInfo(ga4, ctx)).toMatchObject({
      displayName: 'Page View',
      title: 'Page View',
      subtitle: 'Google Analytics Hit',
      type: 2,
      baseUrl: 'https://www.google-analytics.com/g/collect',
      destination: 'G-1',
      originatedMessageIndex: 5,
      firedMessageIndex: 5,
      originatedMessageKey: { eventId: 4, groupId: 'g1' },
      firedMessageKey: { eventId: 4, groupId: 'g1' },
    })
  })

  it('labels an Ads hit as an event of type 3 and keeps its destination an array', () => {
    expect(buildHitInfo(ads, ctx)).toMatchObject({
      subtitle: 'Google Ads Event',
      type: 3,
      destination: ['AW-9'],
    })
  })

  it('titles an unrecognised GA4 event by its own name', () => {
    const h = buildHitInfo({ ...ga4, url: ga4.url.replace('page_view', 'wix_form_start') }, ctx)
    expect(h).toMatchObject({ title: 'wix_form_start' })
  })

  it('skips a hit with no destination, which a native export does not show', () => {
    expect(buildHitInfo({ ...ga4, target: [''] }, ctx)).toBeUndefined()
    expect(buildHitInfo({ ...ga4, target: '' }, ctx)).toBeUndefined()
  })

  it('skips a record with no usable url', () => {
    expect(buildHitInfo({ target: 'G-1' }, ctx)).toBeUndefined()
    expect(buildHitInfo({ url: 'not a url', target: 'G-1' }, ctx)).toBeUndefined()
  })
})

describe('dedupeTransportDuplicates', () => {
  const url = 'https://pagead2.googlesyndication.com/ccm/collect?tid=AW-9&en=page_view'
  it('keeps the first of a measurement sent under two transport formats', () => {
    const records = [
      { url: `${url}&fmt=8`, target: ['AW-9'] },
      { url: `${url}&fmt=3`, target: ['AW-9'] },
    ]
    expect(dedupeTransportDuplicates(records)).toEqual([records[0]])
  })
  it('keeps hits that differ in anything but the format', () => {
    const records = [
      { url: `${url}&fmt=8`, target: ['AW-9'] },
      { url: `${url.replace('page_view', 'conversion')}&fmt=3`, target: ['AW-9'] },
    ]
    expect(dedupeTransportDuplicates(records)).toHaveLength(2)
  })
  it('ignores parameter order and keeps records it cannot key', () => {
    const a = { url: 'https://x.test/c?b=2&a=1&fmt=8' }
    const b = { url: 'https://x.test/c?a=1&b=2&fmt=3' }
    expect(dedupeTransportDuplicates([a, b])).toEqual([a])
    expect(dedupeTransportDuplicates([{ target: 'x' }, { target: 'y' }])).toHaveLength(2)
  })
})
