import { chromium, type Frame, type Page } from 'playwright'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { debugQueueInitScript, RECORDS_GLOBAL } from '../src/session/debug-queue'
import { isContainerRequest, toDebugBuildUrl } from '../src/session/preview-url'
import { parseHit } from '../src/session/hit-policy'

const require = createRequire(import.meta.url)
const distDir = require
  .resolve('@duckduckgo/autoconsent')
  .replace(/autoconsent\.(cjs|esm)\.js$/, '')
const contentScript = readFileSync(distDir + 'autoconsent.playwright.js', 'utf8')
const rules = JSON.parse(
  readFileSync(require.resolve('@duckduckgo/autoconsent/rules/rules.json'), 'utf8'),
)

const { SITE, GTM_ID, GTM_AUTH, CONSENT } = process.env
const browser = await chromium.launch()
const page = await browser.newPage()
await page.route(
  (u) => isContainerRequest(u.toString(), GTM_ID!),
  (r) =>
    r.continue({
      url: toDebugBuildUrl(r.request().url(), { authCode: GTM_AUTH!, environment: 1 }),
    }),
)
await page.route(/googletagmanager\.com\/debug\//, (r) => r.abort())
const hits: string[] = []
await page.route(
  (u) => parseHit(u.toString()) !== null,
  (r) => {
    const p = parseHit(r.request().url(), r.request().postData())
    hits.push(`${p?.vendor} ${p?.eventName ?? ''} gcs=${p?.params.gcs ?? ''}`)
    return r.abort()
  },
)
await page.addInitScript(debugQueueInitScript())

const received: { type: string; [k: string]: unknown }[] = []
if (CONSENT === 'optIn') {
  await page.exposeBinding(
    'autoconsentSendMessage',
    async ({ frame }: { frame: Frame }, msg: { type: string; [k: string]: unknown }) => {
      received.push(msg)
      if (msg.type === 'init') {
        await frame.evaluate(
          `autoconsentReceiveMessage(${JSON.stringify({ type: 'initResp', config: { enabled: true, autoAction: 'optIn', disabledCmps: [], enablePrehide: false, detectRetries: 20, enableCosmeticRules: false, visualTest: false }, rules: { autoconsent: rules.autoconsent } })})`,
        )
      } else if (msg.type === 'eval') {
        const result = await frame.evaluate(msg.code as string)
        await frame.evaluate(
          `autoconsentReceiveMessage(${JSON.stringify({ id: msg.id, type: 'evalResp', result })})`,
        )
      }
    },
  )
}
const inject = (f: Page | Frame) => f.evaluate(contentScript).catch(() => {})
await page.goto(SITE!, { waitUntil: 'commit' })
if (CONSENT === 'optIn') {
  await inject(page)
  page.on('framenavigated', (f) => inject(f))
}
await page.waitForLoadState('load')
await page.waitForTimeout(6000)
const recs = (await page.evaluate(
  (g) => (window as unknown as Record<string, unknown[]>)[g],
  RECORDS_GLOBAL,
)) as Array<Record<string, unknown>>
const consentAt = (r: Record<string, unknown>) => {
  const cd =
    (r.consentData as { fullConsentList?: Record<string, { isConsentGranted?: boolean }> })
      ?.fullConsentList ?? {}
  return Object.entries(cd)
    .map(
      ([k, v]) =>
        `${k.replace('_storage', '').replace('ad_', 'ad.')}=${v.isConsentGranted ? 'G' : 'D'}`,
    )
    .join(' ')
}
console.log(`--- CONSENT=${CONSENT ?? 'none'} ---`)
console.log(
  'autoconsent messages:',
  received
    .map(
      (m) => m.type + (m.cmp ? `(${m.cmp})` : '') + (m.result !== undefined ? `=${m.result}` : ''),
    )
    .join(', ') || '(not injected)',
)
for (const r of recs.filter(
  (r) =>
    r.messageType === 'EVENT_STARTED' ||
    r.messageType === 'CONSENT_STATE' ||
    r.messageType === 'TAG_STARTED',
)) {
  const key = r.key as { eventId?: number; eventName?: string; tagName?: string }
  if (r.messageType === 'CONSENT_STATE')
    console.log(
      `  CONSENT_STATE ev=${key.eventId} command=${r.command} ${JSON.stringify(r.details)}`,
    )
  else if (r.messageType === 'TAG_STARTED')
    console.log(`  TAG_STARTED ev=${key.eventId} ${key.tagName}`)
  else console.log(`  #${key.eventId} ${key.eventName}  [${consentAt(r)}]`)
}
console.log('hits (aborted):', hits.join(' | ') || '(none)')
await browser.close()
