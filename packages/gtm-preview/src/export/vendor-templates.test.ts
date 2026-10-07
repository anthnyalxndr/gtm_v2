import { describe, expect, it } from 'vitest'
import { capturedTemplateIds, displayText, TemplateSet } from './vendor-templates'

describe('TemplateSet', () => {
  const set = new TemplateSet(['gaawe', 'v', 'not-a-template'])

  it('keeps only the templates the capture holds', () => {
    expect(Object.keys(set.vendorTemplateTypes)).toEqual(['gaawe', 'v'])
    expect(capturedTemplateIds).toContain('googtag')
  })

  it('names a declared parameter with the template display name, prefix or not', () => {
    expect(set.paramName('gaawe', 'vtp_eventName')).toBe('Event Name')
    expect(set.paramName('gaawe', 'eventName')).toBe('Event Name')
    expect(set.paramName('gaawe', 'vtp_sendEcommerceData')).toBe('Send Ecommerce data')
  })

  it('returns undefined for a parameter the template does not declare', () => {
    // The signal to write the parameter as internal.
    expect(set.paramName('gaawe', 'vtp_enableEuid')).toBeUndefined()
    expect(set.paramName('gaawe', 'tag_id')).toBeUndefined()
  })

  it('returns undefined for a template it does not hold', () => {
    expect(set.paramName('awct', 'vtp_conversionId')).toBeUndefined()
    expect(set.displayName('awct')).toBeUndefined()
    expect(set.thumbnail('awct')).toBeUndefined()
  })

  it('gives a template its display name and thumbnail', () => {
    expect(set.displayName('gaawe')).toBe('Google Analytics: GA4 Event')
    expect(set.thumbnail('gaawe')).toBe('thumbnail-ga.svg')
    expect(set.displayName('v')).toBe('Data Layer Variable')
  })

  it('derives paramMaps by keying each parameter list on its name', () => {
    const map = set.paramMaps.gaawe!
    expect(Object.keys(map)).toEqual(set.vendorTemplateTypes.gaawe!.param.map((p) => p.name))
    expect(displayText(map.eventName!.displayName)).toBe('Event Name')
  })

  it('holds nothing for a container with no templates, as a Google tag container has', () => {
    const empty = new TemplateSet([])
    expect(empty.vendorTemplateTypes).toEqual({})
    expect(empty.paramMaps).toEqual({})
    expect(empty.paramName('gaawe', 'vtp_eventName')).toBeUndefined()
  })
})
