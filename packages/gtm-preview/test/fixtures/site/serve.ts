import { startFixtureSite } from './server'

const site = await startFixtureSite(process.env.GTM_ID ?? 'GTM-WNX8FFXW')
console.log(`fixture site on ${site.baseUrl}`)
