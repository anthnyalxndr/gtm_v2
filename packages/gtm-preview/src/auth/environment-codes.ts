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
export const EDIT_VERSIONS_SCOPE =
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions'

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
   * Create a version from a named workspace (no publish) so the Latest environment points at
   * it. This is a write and burns a version number; callers must make it explicit. When the
   * workspace has no changes since the latest version, nothing is created: GTM would happily
   * make an identical version, which is waste (observed on the test container, 2026-09-20).
   */
  async createVersionFromWorkspace(
    publicId: string,
    workspaceName: string,
    versionName: string,
  ): Promise<{ versionPath: string; created: true } | { created: false; reason: string }> {
    const client = await this.getClient([READONLY_SCOPE, EDIT_VERSIONS_SCOPE])
    const cache = await readCache(this.opts.cacheFile)
    const container = await this.containerRef(cache, client, publicId)
    await writeCache(this.opts.cacheFile, cache)
    const workspaces = await client.call(() =>
      client.service.accounts.containers.workspaces.list({ parent: container.path }),
    )
    const ws = (workspaces.data.workspace ?? []).find((w) => w.name === workspaceName)
    if (!ws?.path) {
      const names = (workspaces.data.workspace ?? []).map((w) => w.name).join(', ')
      throw new EnvironmentCodeError(
        `container ${publicId} has no workspace named "${workspaceName}"; available: ${names || 'none'}`,
      )
    }
    const status = await client.call(() =>
      client.service.accounts.containers.workspaces.getStatus({ path: ws.path! }),
    )
    if ((status.data.mergeConflict ?? []).length > 0) {
      throw new EnvironmentCodeError(
        `workspace "${workspaceName}" has merge conflicts with the latest version; resolve them in Tag Manager first`,
      )
    }
    if ((status.data.workspaceChange ?? []).length === 0) {
      return {
        created: false,
        reason: `workspace "${workspaceName}" has no changes since the latest version`,
      }
    }
    const res = await client.call(() =>
      client.service.accounts.containers.workspaces.create_version({
        path: ws.path!,
        requestBody: { name: versionName },
      }),
    )
    if (res.data.compilerError) {
      throw new EnvironmentCodeError(
        `creating a version from workspace "${workspaceName}" failed with a compiler error; check the workspace in Tag Manager`,
      )
    }
    const versionPath = res.data.containerVersion?.path
    if (!versionPath) {
      throw new EnvironmentCodeError(
        `creating a version from workspace "${workspaceName}" returned no version`,
      )
    }
    // Latest now points at the new version; its code is unchanged but the cache entry's
    // fingerprint is stale, so drop it. GTM also replaces the workspace with a fresh one of
    // the same name, so any workspace id the caller held is stale too.
    await this.invalidate(publicId, 2)
    return { versionPath, created: true }
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
