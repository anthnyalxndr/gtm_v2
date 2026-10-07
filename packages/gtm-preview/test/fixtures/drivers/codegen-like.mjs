// The body of what `playwright codegen` emits for the fixture site, pasted unchanged.
export default async function (page, ctx) {
  await page.getByRole('button', { name: 'Call to action' }).click()
  await ctx.waitForEvent('cta_click')
  await page.getByRole('textbox').fill('someone@example.com')
  await page.getByRole('button', { name: 'Send' }).click()
  await ctx.waitForEvent('form_submit')
  await page.getByRole('link', { name: 'Second page' }).click()
  await page.waitForURL('**/page2.html')
  await ctx.waitForEvent('page2_ready')
}
