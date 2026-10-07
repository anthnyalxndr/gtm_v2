import { describe, expect, it } from 'vitest'
import { driverFromCodegen } from './codegen-to-driver'

const sample = `const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: 'Call to action' }).click();
  await page.locator('#email').fill('a@b.co');
  await page.close();

  // ---------------------
  await context.close();
  await browser.close();
})();
`

describe('driverFromCodegen', () => {
  it('keeps the actions, drops the boilerplate and the start-url goto, and wraps them', () => {
    const out = driverFromCodegen(sample, { startUrl: 'http://127.0.0.1:4173' })
    expect(out)
      .toBe(`// Recorded with \`gtm-preview record\`. Add \`await ctx.waitForEvent('<event>')\` after actions
// that push dataLayer events so replay waits for GTM instead of racing it.
export default async function (page, ctx) {
  await page.getByRole('button', { name: 'Call to action' }).click();
  await page.locator('#email').fill('a@b.co');
}
`)
  })
  it('keeps a goto to a different url', () => {
    const out = driverFromCodegen(sample, { startUrl: 'https://elsewhere.example/' })
    expect(out).toContain("await page.goto('http://127.0.0.1:4173/');")
  })
  it('produces an empty body comment when nothing was recorded', () => {
    const empty = sample.replace(/ {2}await page\.(getByRole|locator).*\n/g, '')
    expect(driverFromCodegen(empty, { startUrl: 'http://127.0.0.1:4173/' })).toContain(
      '// no actions were recorded',
    )
  })
})
