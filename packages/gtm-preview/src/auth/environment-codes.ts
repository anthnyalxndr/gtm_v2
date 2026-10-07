import { GtmClient, resolveContainer } from '@anthnyalxndr/gtm-client'
import { z } from 'zod'
import {
  environmentKey,
  readCache,
  writeCache,
  type CachedContainer,
  type CodeCache,
} from './code-cache'

export const READONLY_SCOPE = 'https://www.googleapis.com/auth/tagmanager.readonly'
/** quick_preview writes an environment, so previewing a workspace needs more than readonly. */
export const EDIT_CONTAINERS_SCOPE = 'https://www.googleapis.com/auth/tagmanager.edit.containers'

/** The fields we rely on from an Environment resource; anything else is ignored. */
const EnvironmentSchema = z.object({
  environmentId: z.string().min(1),
  name: z.string().default(''),
  type: z.string().optional(),
  authorizationCode: z.string().min(1),
  fingerprint: z.string().optional(),
})

export interface ResolvedCode {
  authCode: string
  environmentId: number
  environmentName: string
  /** live, latest, user or workspace; a workspace preview is exported as QUICK_PREVIEW. */
  environmentType?: string
  source: 'cache' | 'api'
}

export class EnvironmentCodeError extends Error {}

export type ClientFactory = (scopes: readonly string[]) => Promise<GtmClient>

/** Default factory: the shared gtm-apply credentials, with the narrowest scope that works. */
export const defaultClientFactory: ClientFactory = async (scopes) => {
  const client = new GtmClient({ scopes })
  await client.init()
  return client
}

export interface ResolverOptions {
  cacheFile: string
  clientFactory?: ClientFactory
  now?: () => Date
}

/**
 * Turns a container public id and an environment (number or name) into an authorization
 * code, using the Tag Manager API through gtm-client and a per-user cache. Never logs codes.
 */
export class EnvironmentCodeResolver {
  private readonly clientFactory: ClientFactory
  private readonly now: () => Date
  private client?: GtmClient
  private clientScopes: readonly string[] = []

  constructor(private readonly opts: ResolverOptions) {
    this.clientFactory = opts.clientFactory ?? defaultClientFactory
    this.now = opts.now ?? (() => new Date())
  }

  async resolve(
    publicId: string,
    environment: number | string,
    { refresh = false } = {},
  ): Promise<ResolvedCode> {
    const cache = await readCache(this.opts.cacheFile)
    if (!refresh) {
      const hit = this.findCached(cache, publicId, environment)
      if (hit) return hit
    }
    const client = await this.getClient([READONLY_SCOPE])
    const container = await this.containerRef(cache, client, publicId)
    const list = await client.call(() =>
      client.service.accounts.containers.environments.list({ parent: container.path }),
    )
    const environments = (list.data.environment ?? []).map((e) => {
      const parsed = EnvironmentSchema.safeParse(e)
      if (!parsed.success)
        throw new EnvironmentCodeError(
          `unexpected environment shape from the API for ${publicId}: ${parsed.error.issues[0]?.message}`,
        )
      return parsed.data
    })
    const fetchedAt = this.now().toISOString()
    for (const e of environments) {
      cache.environments[environmentKey(publicId, e.environmentId)] = {
        environmentId: e.environmentId,
        environmentName: e.name,
        environmentType: e.type,
        authorizationCode: e.authorizationCode,
        fingerprint: e.fingerprint,
        fetchedAt,
      }
    }
    await writeCache(this.opts.cacheFile, cache)
    const hit = this.findCached(cache, publicId, environment)
    if (!hit) {
      const names = environments
        .map((e) => `${e.environmentId} (${e.name || e.type || 'unnamed'})`)
        .join(', ')
      throw new EnvironmentCodeError(
        `container ${publicId} has no environment matching "${environment}"; available: ${names || 'none'}`,
      )
    }
    return { ...hit, source: 'api' }
  }

  /** Forget one environment's code so the next resolve goes to the API. */
  async invalidate(publicId: string, environmentId: number): Promise<void> {
    const cache = await readCache(this.opts.cacheFile)
    delete cache.environments[environmentKey(publicId, String(environmentId))]
    await writeCache(this.opts.cacheFile, cache)
  }

  /**
   * Point a preview at a named workspace and return its environment code, so a session
   * exercises unsaved workspace changes.
   *
   * `quick_preview` creates an environment of type `workspace` for that workspace, or reuses
   * the one it made before, and creates no version. The environment is a **snapshot**: it
   * keeps serving the content captured at the last `quick_preview` call, so this must run
   * immediately before the session (verified on GTM-WNX8FFXW, 2026-09-23).
   */
  async previewWorkspace(publicId: string, workspaceName: string): Promise<ResolvedCode> {
    const client = await this.getClient([READONLY_SCOPE, EDIT_CONTAINERS_SCOPE])
    const cache = await readCache(this.opts.cacheFile)
    const container = await this.containerRef(cache, client, publicId)
    const workspaces = await client.call(() =>
      client.service.accounts.containers.workspaces.list({ parent: container.path }),
    )
    const ws = (workspaces.data.workspace ?? []).find((w) => w.name === workspaceName)
    if (!ws?.path || !ws.workspaceId) {
      const names = (workspaces.data.workspace ?? []).map((w) => w.name).join(', ')
      throw new EnvironmentCodeError(
        `container ${publicId} has no workspace named "${workspaceName}"; available: ${names || 'none'}`,
      )
    }
    await client.call(() =>
      client.service.accounts.containers.workspaces.quick_preview({ path: ws.path! }),
    )
    const list = await client.call(() =>
      client.service.accounts.containers.environments.list({ parent: container.path }),
    )
    // GTM names these "Preview Environment <n> <timestamp>", so match on the workspace it
    // points at, never on the name.
    const env = (list.data.environment ?? []).find((e) => e.workspaceId === ws.workspaceId)
    if (!env) {
      throw new EnvironmentCodeError(
        `previewing workspace "${workspaceName}" of ${publicId} created no environment for it`,
      )
    }
    const parsed = EnvironmentSchema.safeParse(env)
    if (!parsed.success) {
      throw new EnvironmentCodeError(
        `unexpected environment shape from the API for ${publicId}: ${parsed.error.issues[0]?.message}`,
      )
    }
    cache.environments[environmentKey(publicId, parsed.data.environmentId)] = {
      environmentId: parsed.data.environmentId,
      environmentName: parsed.data.name,
      environmentType: parsed.data.type,
      authorizationCode: parsed.data.authorizationCode,
      fingerprint: parsed.data.fingerprint,
      fetchedAt: this.now().toISOString(),
    }
    await writeCache(this.opts.cacheFile, cache)
    return {
      authCode: parsed.data.authorizationCode,
      environmentId: Number(parsed.data.environmentId),
      environmentName: parsed.data.name,
      environmentType: parsed.data.type,
      source: 'api',
    }
  }

  private findCached(
    cache: CodeCache,
    publicId: string,
    environment: number | string,
  ): ResolvedCode | undefined {
    const entries = Object.entries(cache.environments)
      .filter(([k]) => k.startsWith(publicId + '/'))
      .map(([, v]) => v)
    const wanted = String(environment).toLowerCase()
    const match = entries.find((e) => {
      if (typeof environment === 'number') return e.environmentId === String(environment)
      if (wanted === 'live')
        return e.environmentType === 'live' || e.environmentName.toLowerCase() === 'live'
      if (wanted === 'latest')
        return e.environmentType === 'latest' || e.environmentName.toLowerCase() === 'latest'
      return e.environmentName.toLowerCase() === wanted
    })
    if (!match) return undefined
    return {
      authCode: match.authorizationCode,
      environmentId: Number(match.environmentId),
      environmentName: match.environmentName,
      environmentType: match.environmentType,
      source: 'cache',
    }
  }

  private async containerRef(
    cache: CodeCache,
    client: GtmClient,
    publicId: string,
  ): Promise<CachedContainer> {
    const cached = cache.containers[publicId]
    if (cached) return cached
    let ref
    try {
      ref = await resolveContainer(client, publicId)
    } catch (err) {
      throw new EnvironmentCodeError(err instanceof Error ? err.message : String(err))
    }
    const entry: CachedContainer = {
      accountId: ref.accountId,
      containerId: ref.containerId,
      path: ref.path,
      name: ref.name,
    }
    cache.containers[publicId] = entry
    return entry
  }

  private async getClient(scopes: readonly string[]): Promise<GtmClient> {
    const needed = scopes.filter((s) => !this.clientScopes.includes(s))
    if (!this.client || needed.length) {
      this.client = await this.clientFactory(scopes)
      this.clientScopes = scopes
    }
    return this.client
  }
}
