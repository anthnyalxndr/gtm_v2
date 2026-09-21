const CONTAINER_HOST = 'www.googletagmanager.com'

/**
 * True for the request that loads the container script. GTM also sends a diagnostics beacon
 * to the same path with `is_td=1` (answered with 204), which must be left alone.
 */
export function isContainerRequest(url: string, containerId: string): boolean {
  const u = new URL(url)
  return (
    u.host === CONTAINER_HOST &&
    u.pathname === '/gtm.js' &&
    u.searchParams.get('id') === containerId &&
    !u.searchParams.has('is_td')
  )
}

export interface DebugBuildParams {
  authCode: string
  environment: number
}

/** Rewrite a plain gtm.js request into a request for the environment's debug build. */
export function toDebugBuildUrl(url: string, { authCode, environment }: DebugBuildParams): string {
  const u = new URL(url)
  u.searchParams.set('gtm_auth', authCode)
  u.searchParams.set('gtm_preview', `env-${environment}`)
  u.searchParams.set('gtm_cookies_win', 'x')
  u.searchParams.set('gtm_debug', 'x')
  return u.toString()
}

/** Remove an authorization code wherever it appears in a string. */
export function redactAuthCode(text: string, authCode: string): string {
  if (!authCode) return text
  return text.split(authCode).join('<redacted>')
}
