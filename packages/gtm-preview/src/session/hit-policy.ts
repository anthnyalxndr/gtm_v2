import type { HitPolicy } from '../scenario/schema'

export type Vendor =
  | 'ga4'
  | 'google_ads'
  | 'floodlight'
  | 'meta'
  | 'linkedin'
  | 'microsoft_ads'
  | 'tiktok'
  | 'pinterest'

interface VendorRule {
  vendor: Vendor
  test: (u: URL) => boolean
}

const host = (u: URL, ...names: string[]) =>
  names.some((n) => u.host === n || u.host.endsWith('.' + n))

const VENDOR_RULES: VendorRule[] = [
  {
    vendor: 'ga4',
    test: (u) =>
      u.pathname === '/g/collect' &&
      (host(u, 'google-analytics.com', 'analytics.google.com', 'stats.g.doubleclick.net') ||
        u.host === 'www.google.com' ||
        /^region\d+\.google-analytics\.com$/.test(u.host)),
  },
  {
    vendor: 'google_ads',
    test: (u) =>
      (host(u, 'googleads.g.doubleclick.net', 'googleadservices.com') &&
        u.pathname.startsWith('/pagead/')) ||
      (u.host === 'www.google.com' && u.pathname.startsWith('/pagead/')),
  },
  {
    vendor: 'floodlight',
    test: (u) =>
      host(u, 'fls.doubleclick.net') ||
      (host(u, 'ad.doubleclick.net') && u.pathname.startsWith('/ddm/')),
  },
  { vendor: 'meta', test: (u) => host(u, 'facebook.com') && u.pathname === '/tr' },
  {
    vendor: 'linkedin',
    test: (u) =>
      host(u, 'px.ads.linkedin.com') ||
      (host(u, 'linkedin.com') && u.pathname.startsWith('/collect')),
  },
  {
    vendor: 'microsoft_ads',
    test: (u) => host(u, 'bat.bing.com') && u.pathname.startsWith('/action'),
  },
  { vendor: 'tiktok', test: (u) => host(u, 'analytics.tiktok.com') },
  { vendor: 'pinterest', test: (u) => host(u, 'ct.pinterest.com') },
]

export function matchVendor(url: string): Vendor | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  for (const rule of VENDOR_RULES) if (rule.test(u)) return rule.vendor
  return null
}

export type HitDecision = { action: 'abort' } | { action: 'continue'; url: string; marked: boolean }

/** Decide what happens to a vendor hit under the given policy. */
export function decideHit(url: string, policy: HitPolicy): HitDecision {
  if (policy === 'dry') return { action: 'abort' }
  if (policy === 'debug') {
    const u = new URL(url)
    if (matchVendor(url) === 'ga4' && u.searchParams.get('v') === '2') {
      u.searchParams.set('_dbg', '1')
      return { action: 'continue', url: u.toString(), marked: true }
    }
  }
  return { action: 'continue', url, marked: false }
}

export interface ParsedHit {
  vendor: Vendor
  host: string
  path: string
  params: Record<string, string>
  /** GA4 event name when present. */
  eventName?: string
}

export function parseHit(url: string, postBody?: string | null): ParsedHit | null {
  const vendor = matchVendor(url)
  if (!vendor) return null
  const u = new URL(url)
  const params: Record<string, string> = {}
  for (const [k, v] of u.searchParams) params[k] = v
  // GA4 batches events in the POST body as one query string per line.
  if (vendor === 'ga4' && postBody && !params.en) {
    const firstLine = postBody.split('\n')[0] ?? ''
    for (const [k, v] of new URLSearchParams(firstLine)) if (!(k in params)) params[k] = v
  }
  const hit: ParsedHit = { vendor, host: u.host, path: u.pathname, params }
  if (params.en) hit.eventName = params.en
  return hit
}
