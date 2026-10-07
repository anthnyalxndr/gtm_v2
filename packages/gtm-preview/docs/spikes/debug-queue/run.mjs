import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const html = readFileSync(new URL('./page.html', import.meta.url), 'utf8')
const QUEUE = 'google.tagmanager.debugui2.queue'
const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()
// Block Google's debug bootstrap so nothing tries to talk to Tag Assistant.
await page.route('**/debug/bootstrap*', (r) => r.abort())
await page.route('**/debug/badge*', (r) => r.abort())
await page.route('https://poc.local/', (r) => r.fulfill({ contentType: 'text/html', body: html }))
await page.addInitScript(
  ({ id, auth, q }) => {
    window.GTM_ID = id
    window.GTM_AUTH = auth
    window.__records = []
    const arr = []
    const push = (...msgs) => {
      for (const m of msgs) {
        window.__records.push({ t: performance.now(), messageType: m.messageType, key: m.key, m })
        if (m.messageType === 'CONTAINER_STARTING' && typeof m.data?.resume === 'function') {
          window.__records.push({ t: performance.now(), note: 'resuming container ourselves' })
          setTimeout(() => m.data.resume(), 0)
        }
      }
      return arr.length
    }
    Object.defineProperty(window, q, {
      get: () => ({ push, length: 0 }),
      set: () => {},
      configurable: false,
    })
  },
  { id: process.env.GTM_ID, auth: process.env.GTM_AUTH, q: QUEUE },
)
const hits = []
page.on('request', (r) => {
  const u = r.url()
  if (
    /google-analytics\.com|googletagmanager\.com\/gtag|doubleclick|googleadservices|\/g\/collect/.test(
      u,
    )
  )
    hits.push(u.slice(0, 120))
})
await page.goto('https://poc.local/')
await page.waitForTimeout(2500)
await page.click('#b')
await page.waitForTimeout(1500)
const recs = await page.evaluate(() =>
  window.__records.map((r) => {
    if (r.note) return r.note
    const k = r.key || {}
    const m = r.m || {}
    let extra = ''
    if (m.messageType === 'TAG_STARTED')
      extra = ` execute=${m.tagInfo?.[0]?.execute ?? m.execute ?? '?'}`
    if (m.messageType === 'MACRO_RESOLVED')
      extra =
        ' rules=' +
        JSON.stringify(
          (m.ruleInfo || []).map((r) => ({
            name: r.name,
            pass: r.pass,
            fire: r.firingTags,
            preds: r.predicates?.map(
              (p) => `${p.name ?? p.type ?? '?'}:${p.pass ?? p.result ?? '?'}`,
            ),
          })),
        )
    if (m.messageType === 'CONSENT_STATE') extra = ` cmd=${m.command}`
    return `${r.t | 0}ms ${m.messageType} ev=${k.eventId ?? '-'} ${k.eventName ?? ''} ${k.tagName ?? ''}${extra}`
  }),
)
console.log(recs.join('\n'))
console.log('\n--- network hits ---')
console.log(hits.join('\n') || '(none)')
// Dump one full MACRO_RESOLVED and one TAG_STARTED for shape inspection
const shapes = await page.evaluate(() => {
  const pick = (t) => window.__records.find((r) => r.messageType === t)?.m
  const strip = (o) =>
    JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'function' ? '[fn]' : v)))
  return {
    EVENT_STARTED: strip(pick('EVENT_STARTED')),
    MACRO_RESOLVED: strip(pick('MACRO_RESOLVED')),
    TAG_STARTED: strip(pick('TAG_STARTED')),
    DATA_LAYER: strip(pick('DATA_LAYER')),
  }
})
import { writeFileSync } from 'node:fs'
writeFileSync(new URL('./shapes.json', import.meta.url), JSON.stringify(shapes, null, 2))
await browser.close()
