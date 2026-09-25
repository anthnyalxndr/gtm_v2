import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startFixtureSite, type FixtureSite } from './server'

let site: FixtureSite
beforeAll(async () => {
  site = await startFixtureSite('GTM-TEST123', 'GTM-OTHER99')
})
afterAll(() => site.close())

describe('fixture site', () => {
  it('serves the home page with the container id substituted', async () => {
    const html = await (await fetch(site.baseUrl + '/')).text()
    expect(html).toContain("'GTM-TEST123'")
    expect(html).not.toContain('__GTM_ID__')
    expect(html).toContain("event: 'pre_snippet'")
    expect(html).toContain('href="/page2.html"')
  })
  it('serves a page carrying two containers, each with its own id', async () => {
    const html = await (await fetch(site.baseUrl + '/two-containers.html')).text()
    expect(html).toContain("'GTM-TEST123'")
    expect(html).toContain("'GTM-OTHER99'")
    expect(html).not.toContain('__GTM_ID')
  })
  it('serves the second page and 404s for anything else', async () => {
    expect((await fetch(site.baseUrl + '/page2.html')).status).toBe(200)
    expect((await fetch(site.baseUrl + '/nope.html')).status).toBe(404)
  })
})
