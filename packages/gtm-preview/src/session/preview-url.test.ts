import { describe, expect, it } from 'vitest'
import { isContainerRequest, redactAuthCode, toDebugBuildUrl } from './preview-url'

describe('isContainerRequest', () => {
  it('matches the container script and nothing else', () => {
    expect(
      isContainerRequest('https://www.googletagmanager.com/gtm.js?id=GTM-AAA1111', 'GTM-AAA1111'),
    ).toBe(true)
    expect(
      isContainerRequest('https://www.googletagmanager.com/gtm.js?id=GTM-BBB2222', 'GTM-AAA1111'),
    ).toBe(false)
    expect(
      isContainerRequest('https://www.googletagmanager.com/gtag/js?id=G-1', 'GTM-AAA1111'),
    ).toBe(false)
    expect(
      isContainerRequest(
        'https://www.googletagmanager.com/debug/bootstrap?id=GTM-AAA1111',
        'GTM-AAA1111',
      ),
    ).toBe(false)
  })

  it('ignores the diagnostics beacon GTM sends to the same path', () => {
    expect(
      isContainerRequest(
        'https://www.googletagmanager.com/gtm.js?id=GTM-AAA1111&is_td=1&v=3&t=t&pid=1888418727&seq=2&z=0',
        'GTM-AAA1111',
      ),
    ).toBe(false)
  })
})

describe('toDebugBuildUrl', () => {
  it('adds the environment and debug parameters and keeps existing ones', () => {
    const out = new URL(
      toDebugBuildUrl('https://www.googletagmanager.com/gtm.js?id=GTM-AAA1111&l=dataLayer', {
        authCode: 'code123',
        environment: 2,
      }),
    )
    expect(out.searchParams.get('id')).toBe('GTM-AAA1111')
    expect(out.searchParams.get('l')).toBe('dataLayer')
    expect(out.searchParams.get('gtm_auth')).toBe('code123')
    expect(out.searchParams.get('gtm_preview')).toBe('env-2')
    expect(out.searchParams.get('gtm_cookies_win')).toBe('x')
    expect(out.searchParams.get('gtm_debug')).toBe('x')
  })
})

describe('redactAuthCode', () => {
  it('replaces every occurrence', () => {
    expect(redactAuthCode('a=code1&b=code1', 'code1')).toBe('a=<redacted>&b=<redacted>')
  })
  it('is a no-op for an empty code', () => {
    expect(redactAuthCode('x', '')).toBe('x')
  })
})
