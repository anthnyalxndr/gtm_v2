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

  it('accepts a driver instead of steps and rejects both together', () => {
    const { steps: _steps, ...noSteps } = valid
    void _steps
    expect(parseScenario({ ...noSteps, driver: './flows/home.mjs' }).driver).toBe(
      './flows/home.mjs',
    )
    expect(() => parseScenario({ ...valid, driver: './flows/home.mjs' })).toThrow(
      /either steps or driver/,
    )
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

  it('resolves the driver path relative to the scenario directory', () => {
    const { steps: _steps, ...noSteps } = valid
    void _steps
    const s = resolveScenario(
      parseScenario({ ...noSteps, driver: './flows/home.mjs' }),
      { GTM_AUTH_EXAMPLE: 'abc' },
      '/tmp/scenarios',
    )
    expect(s.driverPath).toBe('/tmp/scenarios/flows/home.mjs')
    expect(
      resolveScenario(parseScenario(valid), { GTM_AUTH_EXAMPLE: 'abc' }).driverPath,
    ).toBeUndefined()
  })

  it('fails clearly when the variable is unset', () => {
    expect(() => resolveScenario(parseScenario(valid), {})).toThrow(ScenarioError)
    expect(() => resolveScenario(parseScenario(valid), {})).toThrow(/GTM_AUTH_EXAMPLE/)
  })
})
