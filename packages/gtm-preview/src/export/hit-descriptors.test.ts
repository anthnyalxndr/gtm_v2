import { describe, expect, it } from 'vitest'
import { describeParameter, dictionaryFor } from './hit-descriptors'

describe('dictionaryFor', () => {
  it('reads GA4 collect with the GA4 list', () => {
    expect(dictionaryFor('https://www.google-analytics.com/g/collect', 2)).toBe('ga4')
  })

  it('reads the Ads ccm/collect endpoint with the GA4 list, which is what it carries', () => {
    expect(dictionaryFor('https://www.google.com/ccm/collect', 3)).toBe('ga4')
  })

  it('reads an Ads conversion with the Ads list', () => {
    expect(dictionaryFor('https://www.googleadservices.com/pagead/conversion/1/', 3)).toBe('ads')
  })

  it('reads a Floodlight hit with the Floodlight list', () => {
    expect(dictionaryFor('https://ad.doubleclick.net/activity', 4)).toBe('floodlight')
  })
})

describe('describeParameter', () => {
  it('finds an exact short name and carries its value type', () => {
    expect(describeParameter('ga4', 'v')).toEqual({
      shortName: 'v',
      type: 1,
      displayName: 'Protocol Version',
    })
  })

  it('gives the same name a different description per dictionary', () => {
    expect(describeParameter('ga4', 'en')?.displayName).toBe('Event Name')
    expect(describeParameter('ads', 'en')?.displayName).toBe('Event name')
  })

  it('falls back to a pattern, and writes the empty object a RegExp serialises to', () => {
    expect(describeParameter('ga4', 'ep.anything')).toEqual({
      shortName: 'ep.',
      shortNameRegExp: {},
      type: 0,
      displayName: 'Event Parameter',
    })
  })

  it('returns nothing for a parameter no dictionary entry covers', () => {
    expect(describeParameter('ga4', 'dma')).toBeUndefined()
    expect(describeParameter('ads', 'dt')).toBeUndefined()
  })

  it('carries the shared consent descriptors in every dictionary', () => {
    for (const d of ['ga4', 'ads', 'ua', 'floodlight'] as const) {
      expect(describeParameter(d, 'gcs')?.displayName).toBe('Cookie Consent State')
    }
  })
})
