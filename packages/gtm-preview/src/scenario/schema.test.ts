import { describe, expect, it } from 'vitest'
import { parseScenario, resolveScenario, ScenarioError } from './schema'

const valid = {
  name: 'home',
  startUrl: 'https://example.com/',
  container: { id: 'GTM-ABC1234', environment: 2, authCodeEnv: 'GTM_AUTH_EXAMPLE' },
  steps: [
    { kind: 'click', selector: '#cta' },
    { kind: 'waitForEvent', event: 'cta_click' },
  ],
}

describe('parseScenario', () => {
  it('accepts a valid scenario and applies defaults', () => {
    const s = parseScenario(valid)
    expect(s.hits).toBe('dry')
    expect(s.settleMs).toBe(1500)
    expect(s.steps[1]).toEqual({ kind: 'waitForEvent', event: 'cta_click', timeoutMs: 10_000 })
  })

  it('rejects a missing startUrl and names the path', () => {
    const { startUrl: _drop, ...rest } = valid
    void _drop
    expect(() => parseScenario(rest)).toThrow(/startUrl/)
  })

  it('rejects an unknown step kind', () => {
    expect(() => parseScenario({ ...valid, steps: [{ kind: 'dance' }] })).toThrow(/steps\.0/)
  })

  it('rejects a container id that does not look like GTM', () => {
    expect(() =>
      parseScenario({ ...valid, container: { ...valid.container, id: 'G-12345' } }),
    ).toThrow(/container\.id/)
  })

  it('rejects an unknown hit policy', () => {
    expect(() => parseScenario({ ...valid, hits: 'yolo' })).toThrow(/hits/)
  })
})

describe('resolveScenario', () => {
  it('reads the authorization code from the named environment variable', () => {
    const s = resolveScenario(parseScenario(valid), { GTM_AUTH_EXAMPLE: 'abc' })
    expect(s.authCode).toBe('abc')
  })

  it('fails clearly when the variable is unset', () => {
    expect(() => resolveScenario(parseScenario(valid), {})).toThrow(ScenarioError)
    expect(() => resolveScenario(parseScenario(valid), {})).toThrow(/GTM_AUTH_EXAMPLE/)
  })
})
