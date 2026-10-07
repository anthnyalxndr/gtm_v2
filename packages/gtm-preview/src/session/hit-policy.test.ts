import { describe, expect, it } from 'vitest'
import { decideHit, matchVendor, parseHit } from './hit-policy'

const ga4 = 'https://analytics.google.com/g/collect?v=2&tid=G-1&en=page_view'

describe('matchVendor', () => {
  it('recognises GA4 collect endpoints on every host Google uses', () => {
    for (const u of [
      ga4,
      'https://www.google-analytics.com/g/collect?v=2',
      'https://region1.google-analytics.com/g/collect?v=2',
      'https://www.google.com/g/collect?v=2',
      'https://stats.g.doubleclick.net/g/collect?v=2',
    ])
      expect(matchVendor(u)).toBe('ga4')
  })
  it('recognises other vendors', () => {
    expect(
      matchVendor('https://googleads.g.doubleclick.net/pagead/viewthroughconversion/123/?x=1'),
    ).toBe('google_ads')
    expect(matchVendor('https://www.google.com/pagead/1p-conversion/123/')).toBe('google_ads')
    expect(matchVendor('https://fls.doubleclick.net/activityi;src=1')).toBe('floodlight')
    expect(matchVendor('https://www.facebook.com/tr?id=1&ev=PageView')).toBe('meta')
    expect(matchVendor('https://bat.bing.com/action/0?ti=1')).toBe('microsoft_ads')
    expect(matchVendor('https://www.google.com/ccm/collect?rcb=1&en=page_view')).toBe('google_ads')
    expect(
      matchVendor('https://pagead2.googlesyndication.com/ccm/collect?tid=AW-1&en=conversion'),
    ).toBe('google_ads')
  })
  it('ignores everything else', () => {
    expect(matchVendor('https://www.googletagmanager.com/gtm.js?id=GTM-1')).toBeNull()
    expect(matchVendor('https://example.com/g/collect')).toBeNull()
    expect(matchVendor('not a url')).toBeNull()
  })
})

describe('decideHit', () => {
  it('aborts everything in dry mode', () => {
    expect(decideHit(ga4, 'dry')).toEqual({ action: 'abort' })
    expect(decideHit('https://www.facebook.com/tr?id=1', 'dry')).toEqual({ action: 'abort' })
  })
  it('marks GA4 hits with _dbg=1 in debug mode and lets others through untouched', () => {
    const d = decideHit(ga4, 'debug')
    expect(d.action).toBe('continue')
    if (d.action === 'continue') {
      expect(new URL(d.url).searchParams.get('_dbg')).toBe('1')
      expect(d.marked).toBe(true)
    }
    const other = decideHit('https://www.facebook.com/tr?id=1', 'debug')
    expect(other).toEqual({
      action: 'continue',
      url: 'https://www.facebook.com/tr?id=1',
      marked: false,
    })
  })
  it('does nothing in live mode, except stripping the debug flag the debug build adds', () => {
    expect(decideHit(ga4, 'live')).toEqual({ action: 'continue', url: ga4, marked: false })
    const d = decideHit(ga4 + '&_dbg=1', 'live')
    expect(d.action).toBe('continue')
    if (d.action === 'continue') expect(new URL(d.url).searchParams.has('_dbg')).toBe(false)
  })
})

describe('parseHit', () => {
  it('extracts vendor, host, path, params and the GA4 event name', () => {
    expect(parseHit(ga4)).toEqual({
      vendor: 'ga4',
      host: 'analytics.google.com',
      path: '/g/collect',
      params: { v: '2', tid: 'G-1', en: 'page_view' },
      eventName: 'page_view',
    })
  })
  it('reads the event name from a batched POST body', () => {
    const h = parseHit(
      'https://analytics.google.com/g/collect?v=2&tid=G-1',
      'en=scroll&epn.percent=90\nen=click',
    )
    expect(h?.eventName).toBe('scroll')
    expect(h?.params['epn.percent']).toBe('90')
  })
  it('returns null for non-vendor urls', () => {
    expect(parseHit('https://example.com/')).toBeNull()
  })
})
