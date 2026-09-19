import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildReport } from '../src/report/parse-records'
import { parseScenario, resolveScenario } from '../src/scenario/schema'
import { runSession } from '../src/session/run-session'
import { startFixtureSite, type FixtureSite } from './fixtures/site/server'

const CONTAINER = 'GTM-WNX8FFXW'
const AUTH_ENV = 'GTM_AUTH_WNX8FFXW'
const enabled = Boolean(process.env[AUTH_ENV])

describe.skipIf(!enabled)('runSession against the test container (needs GTM_AUTH_WNX8FFXW)', () => {
  let site: FixtureSite
  beforeAll(async () => {
    site = await startFixtureSite(CONTAINER)
  })
  afterAll(() => site.close())

  it('loads the debug build, records GTM verdicts, and aborts hits in dry mode', async () => {
    const scenario = resolveScenario(
      parseScenario({
        name: 'integration',
        startUrl: site.baseUrl + '/',
        container: { id: CONTAINER, environment: 2, authCodeEnv: AUTH_ENV },
        steps: [
          { kind: 'click', selector: '#cta' },
          { kind: 'waitForEvent', event: 'cta_click' },
          { kind: 'push', data: { event: 'form_submit', form_id: 'contact' } },
          { kind: 'waitForEvent', event: 'form_submit' },
        ],
      }),
      process.env,
    )
    const raw = await runSession(scenario)
    expect(raw.errors).toEqual([])
    expect(raw.debugBuildLoaded).toBe(true)
    expect(JSON.stringify(raw)).not.toContain(scenario.authCode)

    const report = buildReport(raw, {
      scenario: { name: scenario.name, startUrl: scenario.startUrl },
      container: { id: CONTAINER, environment: 2 },
      hitPolicy: 'dry',
    })
    const fs = report.events.find((e) => e.eventName === 'form_submit')
    expect(fs?.tags.map((t) => [t.name, t.decision, t.status])).toEqual([
      ['GA4 - form_submit', 'execute', 'execute_succeeded'],
    ])
    expect(report.hits.length).toBeGreaterThan(0)
    expect(report.hits.every((h) => h.outcome === 'aborted')).toBe(true)
  }, 60_000)

  it('fails with a clear error when the authorization code is wrong', async () => {
    const scenario = resolveScenario(
      parseScenario({
        name: 'bad-code',
        startUrl: site.baseUrl + '/',
        container: { id: CONTAINER, environment: 2, authCodeEnv: 'GTM_AUTH_BAD' },
        settleMs: 200,
      }),
      { GTM_AUTH_BAD: 'not-a-real-code' },
    )
    await expect(runSession(scenario)).rejects.toThrow(/HTTP 403/)
  }, 60_000)
})
