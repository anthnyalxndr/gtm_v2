import { chromium, type Browser } from 'playwright'
import type { RunnableScenario } from '../scenario/schema'
import type { RawSession } from '../report/parse-records'
import type { Hit } from '../report/types'
import {
  EMIT_BINDING,
  debugQueueInitScript,
  type EmittedItem,
  type RawDataLayerPush,
  type RawRecord,
} from './debug-queue'
import { decideHit, parseHit } from './hit-policy'
import {
  containerRequestId,
  isGoogleTagRequest,
  redactAuthCode,
  toDebugBuildUrl,
  toGoogleTagDebugUrl,
} from './preview-url'
import { loadDriver, runDriver } from './driver'
import { executeStep } from './steps'

/** Playwright's recorder is the same private call `playwright codegen --output` uses. */
async function enableRecorder(context: unknown, outputFile: string): Promise<void> {
  const c = context as { _enableRecorder?: (p: Record<string, unknown>) => Promise<void> }
  if (typeof c._enableRecorder !== 'function') {
    throw new Error(
      'this Playwright version has no recorder API; upgrade playwright or record without --driver-out',
    )
  }
  await c._enableRecorder({ language: 'javascript', mode: 'recording', outputFile })
}

export interface RunOptions {
  headless?: boolean
  log?: (line: string) => void
  /**
   * After the start URL loads (and any steps or driver run), call page.pause() so the
   * Playwright Inspector opens. Needs a headed browser. The session ends when the person
   * presses Resume or closes the window.
   */
  pause?: boolean
  /**
   * Turn on Playwright's recorder for the whole session and write the generated code (the
   * "Node.js Library" shape) to this file. Actions performed by steps or a driver are
   * recorded too, which is how this is tested headless.
   */
  recordTo?: string
}

export class ContainerLoadError extends Error {}

/**
 * Drive one scenario in a fresh Chromium context and return everything captured, with the
 * authorization code redacted from every string.
 */
export async function runSession(
  scenario: RunnableScenario,
  opts: RunOptions = {},
): Promise<RawSession> {
  const log = opts.log ?? (() => {})
  const browser: Browser = await chromium.launch({ headless: opts.headless ?? true })
  try {
    const context = await browser.newContext()
    if (opts.recordTo) await enableRecorder(context, opts.recordTo)
    const page = await context.newPage()
    const hits: Hit[] = []
    const errors: string[] = []
    const records: RawRecord[] = []
    const dataLayer: RawDataLayerPush[] = []
    // Every container the scenario names, by id, and the status each request came back with.
    const instrumented = new Map(scenario.containers.map((c) => [c.id, c]))
    const statusById = new Map<string, number>()
    const unnamed = new Set<string>()
    const primary = scenario.container.id

    // Records stream to Node as they happen so a navigation cannot lose them.
    await page.exposeBinding(EMIT_BINDING, (_source, item: EmittedItem) => {
      if (item.kind === 'record') records.push(item.value)
      else dataLayer.push(item.value)
    })
    await page.addInitScript(debugQueueInitScript())

    // Nothing may reach Tag Assistant.
    await page.route(/https:\/\/www\.googletagmanager\.com\/debug\/(bootstrap|badge)/, (route) =>
      route.abort(),
    )

    // Every Google tag the page loads (gtag.js, destinations) gets its debug build too, so
    // the hits it sends are recorded with the event that caused them. No code is needed.
    await page.route(
      (url) => isGoogleTagRequest(url.toString()),
      (route) => route.continue({ url: toGoogleTagDebugUrl(route.request().url()) }),
    )

    // The site's snippet asks for the plain container; hand it the environment's debug build.
    // A container the scenario does not name loads its production build, which reports
    // nothing, so it is called out rather than left to look like a container with no tags.
    await page.route(
      (url) => containerRequestId(url.toString()) !== undefined,
      async (route) => {
        const id = containerRequestId(route.request().url())!
        const container = instrumented.get(id)
        if (!container) {
          if (!unnamed.has(id)) {
            unnamed.add(id)
            errors.push(
              `container ${id} is on the page but the scenario does not name it, so it loaded its production build and reported nothing; add it to alsoInstrument to see its tags`,
            )
          }
          return route.continue()
        }
        const target = toDebugBuildUrl(route.request().url(), {
          authCode: container.authCode,
          environment: container.environment,
        })
        const response = await route.fetch({ url: target })
        statusById.set(id, response.status())
        if (response.status() !== 200) {
          errors.push(`container ${id} request returned HTTP ${response.status()}`)
        }
        await route.fulfill({ response })
      },
    )

    // Vendor hits: record every attempt and apply the policy.
    await page.route(
      (url) => parseHit(url.toString()) !== null,
      async (route) => {
        const request = route.request()
        const parsed = parseHit(request.url(), request.postData())
        const decision = decideHit(request.url(), scenario.hits)
        if (parsed) {
          hits.push({
            at: Date.now(),
            vendor: parsed.vendor,
            host: parsed.host,
            path: parsed.path,
            params: parsed.params,
            eventName: parsed.eventName,
            outcome:
              decision.action === 'abort'
                ? 'aborted'
                : decision.marked
                  ? 'sent_marked_debug'
                  : 'sent',
          })
        }
        if (decision.action === 'abort') return route.abort()
        return route.continue(decision.url !== request.url() ? { url: decision.url } : {})
      },
    )

    // Load the driver before the browser does anything so a bad module fails fast.
    const driver = scenario.driverPath ? await loadDriver(scenario.driverPath) : undefined
    const failIfContainerRejected = () => {
      for (const container of scenario.containers) {
        const status = statusById.get(container.id)
        if (status === undefined || status === 200) continue
        throw new ContainerLoadError(
          `container ${container.id} env-${container.environment} returned HTTP ${status}; check the authorization code${container.authCodeEnv ? ` in ${container.authCodeEnv}` : ''}`,
        )
      }
    }
    const redactSession = (): RawSession => {
      for (const container of scenario.containers) {
        if (statusById.has(container.id)) continue
        errors.push(
          `the page never requested container ${container.id}; the scenario expected ${scenario.containers.map((c) => c.id).join(', ')} at ${scenario.startUrl}`,
        )
      }
      // Only the debug build emits per-event records. It pauses on CONTAINER_STARTING only when the
      // page carries a debug signal; without one it runs straight through and still emits.
      const debugBuildLoaded = records.some((r) => r.messageType === 'EVENT_STARTED')
      if (!debugBuildLoaded) errors.push('no EVENT_STARTED records: the debug build did not run')
      const redact = <T>(v: T): T =>
        JSON.parse(redactAuthCode(JSON.stringify(v), scenario.authCode)) as T
      return redact({ records, hits, dataLayer, errors, debugBuildLoaded })
    }
    const waitForContainerStatus = async (timeoutMs = 5000) => {
      const until = Date.now() + timeoutMs
      while (!statusById.has(primary) && Date.now() < until) await page.waitForTimeout(50)
    }

    log(`opening ${scenario.startUrl}`)
    await page.goto(scenario.startUrl, { waitUntil: 'load' })
    // A rejected container request (wrong or rotated code) must fail before any step runs,
    // otherwise a waitForEvent timeout would mask it.
    await waitForContainerStatus()
    failIfContainerRejected()
    try {
      if (driver && scenario.driverPath) {
        log(`driver: ${scenario.driverPath}`)
        await runDriver(driver, scenario.driverPath, page, log)
      }
      for (const [index, step] of scenario.steps.entries()) {
        log(`step ${index}: ${step.kind}`)
        await executeStep(page, step, index)
      }
    } catch (err) {
      failIfContainerRejected()
      throw err
    }
    if (opts.pause) {
      log(
        'paused: click through the site; press Resume in the Inspector or close the window when done',
      )
      // page.pause() rejects when the page is closed; either way the session is over.
      await page.pause().catch(() => {})
      if (page.isClosed()) {
        if (scenario.settleMs > 0) await new Promise((r) => setTimeout(r, scenario.settleMs))
        return redactSession()
      }
    }
    if (scenario.settleMs > 0) await page.waitForTimeout(scenario.settleMs)
    return redactSession()
  } finally {
    await browser.close()
  }
}
