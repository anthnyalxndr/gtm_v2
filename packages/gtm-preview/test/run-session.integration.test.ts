import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildReport } from '../src/report/parse-records'
import { parseScenario, resolveScenario, runnableFromEnv } from '../src/scenario/schema'
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
    const raw = await runSession(runnableFromEnv(scenario))
    expect(raw.errors).toEqual([])
    expect(raw.debugBuildLoaded).toBe(true)
    expect(JSON.stringify(raw)).not.toContain(scenario.authCode!)

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
    await expect(runSession(runnableFromEnv(scenario))).rejects.toThrow(/HTTP 403/)
  }, 60_000)
})

describe.skipIf(!enabled)('runSession with a recorded driver (needs GTM_AUTH_WNX8FFXW)', () => {
  let site: FixtureSite
  beforeAll(async () => {
    site = await startFixtureSite(CONTAINER)
  })
  afterAll(() => site.close())

  it('runs a codegen-shaped driver unchanged and captures both pages', async () => {
    const scenario = resolveScenario(
      parseScenario({
        name: 'driver',
        startUrl: site.baseUrl + '/',
        container: { id: CONTAINER, environment: 2, authCodeEnv: AUTH_ENV },
        driver: './fixtures/drivers/codegen-like.mjs',
      }),
      process.env,
      new URL('.', import.meta.url).pathname,
    )
    const raw = await runSession(runnableFromEnv(scenario))
    expect(raw.errors).toEqual([])
    const names = raw.records
      .filter((r) => r.messageType === 'EVENT_STARTED')
      .map((r) => r.key?.eventName)
    expect(names).toContain('cta_click')
    expect(names).toContain('form_submit')
    expect(names).toContain('page2_ready')
    const groups = new Set(raw.records.map((r) => r.key?.groupId).filter(Boolean))
    expect(groups.size).toBe(2)
  }, 90_000)

  it('exits with a DriverError naming the file when the driver throws', async () => {
    const scenario = resolveScenario(
      parseScenario({
        name: 'driver-throws',
        startUrl: site.baseUrl + '/',
        container: { id: CONTAINER, environment: 2, authCodeEnv: AUTH_ENV },
        driver: './fixtures/drivers/throws.mjs',
        settleMs: 0,
      }),
      process.env,
      new URL('.', import.meta.url).pathname,
    )
    await expect(runSession(runnableFromEnv(scenario))).rejects.toThrow(
      /throws\.mjs: boom from the driver/,
    )
  }, 60_000)
})

describe.skipIf(!enabled)('recording a session to a driver (needs GTM_AUTH_WNX8FFXW)', () => {
  let site: FixtureSite
  beforeAll(async () => {
    site = await startFixtureSite(CONTAINER)
  })
  afterAll(() => site.close())

  it('writes the recorder output for the steps it performed, and the converted driver replays', async () => {
    const { mkdtemp, readFile } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { writeFile } = await import('node:fs/promises')
    const { driverFromCodegen } = await import('../src/session/codegen-to-driver')
    const dir = await mkdtemp(join(tmpdir(), 'gtm-preview-rec-'))
    const recordTo = join(dir, 'codegen.js')
    const scenario = resolveScenario(
      parseScenario({
        name: 'record',
        startUrl: site.baseUrl + '/',
        container: { id: CONTAINER, environment: 2, authCodeEnv: AUTH_ENV },
        settleMs: 300,
        steps: [
          { kind: 'click', selector: '#cta' },
          { kind: 'fill', selector: '#email', value: 'someone@example.com' },
          { kind: 'click', selector: '#submit' },
          { kind: 'waitForEvent', event: 'form_submit' },
        ],
      }),
      process.env,
    )
    await runSession(runnableFromEnv(scenario), { recordTo })
    const source = await readFile(recordTo, 'utf8')
    expect(source).toContain("getByRole('button', { name: 'Call to action' }).click()")
    expect(source).toContain("fill('someone@example.com')")

    const driverPath = join(dir, 'recorded.mjs')
    await writeFile(driverPath, driverFromCodegen(source, { startUrl: site.baseUrl + '/' }), 'utf8')
    const replay = resolveScenario(
      parseScenario({
        name: 'replay',
        startUrl: site.baseUrl + '/',
        container: { id: CONTAINER, environment: 2, authCodeEnv: AUTH_ENV },
        driver: driverPath,
        settleMs: 1500,
      }),
      process.env,
    )
    const raw = await runSession(runnableFromEnv(replay))
    const names = raw.records
      .filter((r) => r.messageType === 'EVENT_STARTED')
      .map((r) => r.key?.eventName)
    expect(names).toContain('cta_click')
    expect(names).toContain('form_submit')
  }, 120_000)
})

describe.skipIf(!enabled)(
  'a page carrying a second GTM container (needs GTM_AUTH_WNX8FFXW)',
  () => {
    const OTHER = 'GTM-NOTNAMED'
    let site: FixtureSite
    beforeAll(async () => {
      site = await startFixtureSite(CONTAINER, OTHER)
    })
    afterAll(() => site.close())

    it('instruments the container the scenario names and warns about the one it does not', async () => {
      const scenario = resolveScenario(
        parseScenario({
          name: 'second-container',
          startUrl: site.baseUrl + '/two-containers.html',
          container: { id: CONTAINER, environment: 2, authCodeEnv: AUTH_ENV },
          settleMs: 1000,
        }),
        process.env,
      )
      const raw = await runSession(runnableFromEnv(scenario))
      expect(raw.debugBuildLoaded).toBe(true)
      // The named container reported; the other loaded its production build and said nothing.
      expect(raw.errors).toEqual([
        expect.stringContaining(`container ${OTHER} is on the page but the scenario does not name`),
      ])
      expect(raw.records.some((r) => r.key?.publicId === OTHER)).toBe(false)
      expect(raw.records.some((r) => r.key?.publicId === CONTAINER)).toBe(true)
    }, 60_000)

    it('names every container it expected when none of them is on the page', async () => {
      const scenario = resolveScenario(
        parseScenario({
          name: 'wrong-page',
          startUrl: site.baseUrl + '/page2.html',
          container: { id: 'GTM-ABSENT1', environment: 2, authCodeEnv: AUTH_ENV },
          settleMs: 200,
        }),
        process.env,
      )
      const raw = await runSession(runnableFromEnv(scenario))
      expect(raw.errors.join('\n')).toContain('the page never requested container GTM-ABSENT1')
      expect(raw.errors.join('\n')).toContain(site.baseUrl + '/page2.html')
    }, 60_000)
  },
)
