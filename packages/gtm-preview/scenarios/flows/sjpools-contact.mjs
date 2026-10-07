// Home page, then the contact page, then the email link, then the phone link, then exit.
// Selectors come from `gtm-preview record`. The cookie banner is accepted first because it
// covers the page; a native preview session has to do the same before anything is clickable.
// The pause after the contact page's page_view matters: clicking as soon as that event
// arrives lands before the page has bound its link listeners, and the click is lost.
export default async function (page, ctx) {
  await page.getByRole('button', { name: 'Accept All' }).click()
  await ctx.waitForEvent('consentPolicyChanged')

  await page.getByRole('link', { name: 'CONTACT', exact: true }).click()
  await page.waitForURL('**/contact')
  await ctx.waitForEvent('page_view')
  await page.waitForTimeout(3000)

  await page.getByRole('link', { name: 'Email: contact@sjpools.com' }).click()
  await ctx.waitForEvent('gtm.linkClick')

  await page.locator('#comp-mq7283ua').getByRole('link', { name: '(408) 445-' }).click()
  await ctx.waitForEvent('gtm.linkClick', { count: 2 })
}
