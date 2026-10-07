// Recorded with `gtm-preview record` on 2026-09-20. The waitForEvent lines were added by hand
// so replay waits for GTM instead of racing it; everything else is the recorder's output.
export default async function (page, ctx) {
  await page.getByRole('button', { name: 'Accept All' }).click()
  await ctx.waitForEvent('consentPolicyChanged')
  await page.getByRole('link', { name: 'CONTACT', exact: true }).click()
  await page.waitForURL('**/contact')
  await ctx.waitForEvent('page_view')
  await page.locator('#comp-mq7283ua').getByRole('link', { name: '(408) 445-' }).click()
  await ctx.waitForEvent('gtm.linkClick')
  await page.getByRole('link', { name: 'Email: contact@sjpools.com' }).click()
  await ctx.waitForEvent('gtm.linkClick', { count: 2 })
}
