// Home page: accept the Squarespace cookie banner (wired to Consent Mode), then the contact
// page, then the phone and email links. Selectors from the live site on 2026-10-06. The banner
// is accepted first because it covers the page. The pause after the contact page's load
// matters: clicking as soon as GTM reports the page lands before the page binds its link
// listeners, and the click is lost.
export default async function (page, ctx) {
  const accept = page.locator('.sqs-cookie-banner-v2-accept').first()
  await accept.waitFor({ state: 'visible', timeout: 10_000 })
  await accept.click()
  await ctx.waitForEvent('gtm.click')
  await page.waitForTimeout(1500)

  await page.locator('a[href="/contact"]').first().click()
  await page.waitForURL('**/contact')
  await ctx.waitForEvent('gtm.dom')
  await page.waitForTimeout(3000)

  await page.locator('a[href^="tel:"]').first().click()
  await ctx.waitForEvent('gtm.linkClick')

  await page.locator('a[href^="mailto:"]').first().click()
  await ctx.waitForEvent('gtm.linkClick', { count: 2 })
}
