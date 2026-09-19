import { chromium, type Browser } from 'playwright'
import type { LoadedScenario } from '../scenario/schema'
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
import { isContainerRequest, redactAuthCode, toDebugBuildUrl } from './preview-url'
import { loadDriver, runDriver } from './driver'
import { executeStep } from './steps'

export interface RunOptions {
  headless?: boolean
  log?: (line: string) => void
  /**
   * After the start URL loads (and any steps or driver run), call page.pause() so the
   * Playwright Inspector opens with its Record button. Needs a headed browser.
   */
  pause?: boolean
}

export class ContainerLoadError extends Error {}

/**
 * Drive one scenario in a fresh Chromium context and return everything captured, with the
 * authorization code redacted from every string.
 */
export async function runSession(
  scenario: LoadedScenario,
  opts: RunOptions = {},
): Promise<RawSession> {
  const log = opts.log ?? (() => {})
  const browser: Browser = await chromium.launch({ headless: opts.headless ?? true })
  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    const hits: Hit[] = []
    const errors: string[] = []
    const records: RawRecord[] = []
    const dataLayer: RawDataLayerPush[] = []
    let containerStatus: number | undefined

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

    // The site's snippet asks for the plain container; hand it the environment's debug build.
    await page.route(
      (url) => isContainerRequest(url.toString(), scenario.container.id),
      async (route) => {
        const target = toDebugBuildUrl(route.request().url(), {
          authCode: scenario.authCode,
          environment: scenario.container.environment,
        })
        const response = await route.fetch({ url: target })
        containerStatus = response.status()
        if (response.status() !== 200) {
          errors.push(`container request returned HTTP ${response.status()}`)
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

    log(`opening ${scenario.startUrl}`)
    await page.goto(scenario.startUrl, { waitUntil: 'load' })
    if (driver && scenario.driverPath) {
      log(`driver: ${scenario.driverPath}`)
      await runDriver(driver, scenario.driverPath, page, log)
    }
    for (const [index, step] of scenario.steps.entries()) {
      log(`step ${index}: ${step.kind}`)
      await executeStep(page, step, index)
    }
    if (opts.pause) {
      log('paused: use the Inspector to record; press Resume when done')
      await page.pause()
    }
    if (scenario.settleMs > 0) await page.waitForTimeout(scenario.settleMs)

    if (containerStatus === undefined) errors.push('the page never requested the container script')
    if (containerStatus !== undefined && containerStatus !== 200) {
      throw new ContainerLoadError(
        `container ${scenario.container.id} env-${scenario.container.environment} returned HTTP ${containerStatus}; check the authorization code in ${scenario.container.authCodeEnv}`,
      )
    }
    // Only the debug build emits per-event records. It pauses on CONTAINER_STARTING only when the
    // page carries a debug signal; without one it runs straight through and still emits.
    const debugBuildLoaded = records.some((r) => r.messageType === 'EVENT_STARTED')
    if (!debugBuildLoaded) errors.push('no EVENT_STARTED records: the debug build did not run')

    const redact = <T>(v: T): T =>
      JSON.parse(redactAuthCode(JSON.stringify(v), scenario.authCode)) as T
    return redact({ records, hits, dataLayer, errors, debugBuildLoaded })
  } finally {
    await browser.close()
  }
}
