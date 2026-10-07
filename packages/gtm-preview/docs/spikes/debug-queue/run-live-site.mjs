import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const { SITE, GTM_ID, GTM_AUTH, GTM_ENV = '1' } = process.env
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
})
const page = await ctx.newPage()
let rewritten = []
const aborted = []
await page.route(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}*`, (r) => {
  const u = new URL(r.request().url())
  u.searchParams.set('gtm_auth', GTM_AUTH)
  u.searchParams.set('gtm_preview', `env-${GTM_ENV}`)
  u.searchParams.set('gtm_cookies_win', 'x')
  u.searchParams.set('gtm_debug', 'x')
  rewritten.push(u.toString().replace(GTM_AUTH, '<code>'))
  r.continue({ url: u.toString() })
})
await page.route('**/debug/bootstrap*', (r) => r.abort())
await page.route('**/debug/badge*', (r) => r.abort())
// HITS=dry (default): every vendor hit is aborted inside the browser; nothing reaches Google or anyone else.
// HITS=debug: hits go out for real, and GA4 collect requests get _dbg=1 so they appear in DebugView.
// HITS=live: hits go out untouched.
const HITS = process.env.HITS ?? 'dry'
const sent = []
await page.route(
  /\/g\/collect|googleads\.g\.doubleclick|\/pagead\/|fls\.doubleclick|facebook\.com\/tr/,
  (r) => {
    const u = new URL(r.request().url())
    if (HITS === 'dry') {
      aborted.push(u.host)
      return r.abort()
    }
    if (HITS === 'debug' && u.pathname === '/g/collect' && u.searchParams.get('v') === '2') {
      u.searchParams.set('_dbg', '1')
      sent.push(u.host + ' _dbg=1')
      return r.continue({ url: u.toString() })
    }
    sent.push(u.host)
    r.continue()
  },
)
await page.addInitScript(() => {
  window.__rec = []
  const q = 'google.tagmanager.debugui2.queue'
  const sink = {
    push: (...m) => {
      for (const x of m) {
        window.__rec.push(
          JSON.parse(JSON.stringify(x, (k, v) => (typeof v === 'function' ? '[fn]' : v))),
        )
        if (x?.data?.resume) setTimeout(() => x.data.resume(), 0)
      }
      return 0
    },
    length: 0,
  }
  Object.defineProperty(window, q, { get: () => sink, set() {}, configurable: false })
})
const hits = []
page.on('request', (r) => {
  const u = r.url()
  if (
    /\/g\/collect|googleads\.g\.doubleclick|\/pagead\/|fls\.doubleclick|facebook\.com\/tr|clarity\.ms|hotjar|linkedin\.com\/collect|bing\.com\/action|px\.ads/.test(
      u,
    )
  )
    hits.push({
      t: Date.now(),
      host: new URL(u).host,
      path: new URL(u).pathname,
      en: new URL(u).searchParams.get('en'),
    })
})
const t0 = Date.now()
await page.goto(SITE, { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(3000)
await page.mouse.wheel(0, 2500)
await page.waitForTimeout(1500)
await page.mouse.wheel(0, 4000)
await page.waitForTimeout(2500)
const recs = await page.evaluate(() => window.__rec)
const containerStarting = recs.find((r) => r.messageType === 'CONTAINER_STARTING')
console.log(`rewritten requests: ${rewritten.length}`, rewritten[0] ?? '')
console.log(
  `CONTAINER_STARTING debug flag: ${containerStarting?.data?.debug}  total records: ${recs.length}`,
)
console.log(
  'record types:',
  Object.entries(recs.reduce((a, r) => ((a[r.messageType] = (a[r.messageType] || 0) + 1), a), {}))
    .map(([k, v]) => `${k}:${v}`)
    .join(' '),
)
console.log('\n--- event timeline ---')
for (const r of recs.filter((r) => r.messageType === 'EVENT_STARTED')) {
  const id = r.key.eventId
  const mr = recs.find((x) => x.messageType === 'MACRO_RESOLVED' && x.key.eventId === id)
  const passed = (mr?.ruleInfo || []).filter((x) => x.pass).map((x) => x.name)
  const tags = recs
    .filter((x) => x.messageType === 'TAG_STARTED' && x.key.eventId === id)
    .map((x) => `${x.key.tagName} [${x.tagInfo?.[0]?.execute}]`)
  const statuses = recs
    .filter((x) => x.messageType === 'TAG_STATUS' && x.key.eventId === id)
    .map((x) => `${x.key.tagName}=${x.tagInfo?.[0]?.execute}`)
  const blocked = recs
    .filter((x) => x.messageType === 'TAG_BLOCKED' && x.key.eventId === id)
    .map((x) => `${x.key.tagName} [${x.tagInfo?.[0]?.execute}]`)
  console.log(`#${id} ${r.key.eventName}`)
  if (passed.length) console.log(`   triggers passed: ${passed.join(' | ')}`)
  if (tags.length) console.log(`   tags started:    ${tags.join(' | ')}`)
  if (blocked.length) console.log(`   tags blocked:    ${blocked.join(' | ')}`)
  if (statuses.length)
    console.log(`   final status:    ${statuses.filter((s) => !/running/.test(s)).join(' | ')}`)
}
const first = recs.find((r) => r.messageType === 'EVENT_STARTED')
console.log('\n--- container inventory (from first EVENT_STARTED.tagInfo) ---')
console.log(
  (first?.tagInfo || [])
    .filter(Boolean)
    .map((t) => `${t.name} (${t.tagData?.function})`)
    .join('\n'),
)
const mr0 = recs.find((r) => r.messageType === 'MACRO_RESOLVED')
console.log('\n--- triggers (from first MACRO_RESOLVED.ruleInfo) ---')
console.log(
  (mr0?.ruleInfo || [])
    .map((t) => `${t.name}: fires [${t.firingTags}] blocks [${t.blockingTags}]`)
    .join('\n'),
)
const cs = recs.find((r) => r.messageType === 'CONSENT_STATE' || r.consentData)
console.log(
  '\n--- consent (first record) ---',
  JSON.stringify(
    Object.fromEntries(
      Object.entries(cs?.consentData?.fullConsentList || {}).map(([k, v]) => [
        k,
        v.isConsentGranted,
      ]),
    ),
  ),
)
console.log(
  `\n--- network hits: mode=${HITS} attempted=${hits.length} aborted=${aborted.length} sent=${sent.length} ---`,
)
for (const x of sent) console.log('  sent:', x)
for (const h of hits)
  console.log(`  +${h.t - t0}ms ${h.host}${h.path}${h.en ? '  en=' + h.en : ''}`)
writeFileSync('.scratch-poc/site-records.json', JSON.stringify(recs, null, 1))
await browser.close()
