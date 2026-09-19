import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GtmClient } from '@anthnyalxndr/gtm-client'
import { createFakeService } from '@anthnyalxndr/gtm-client/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  EDIT_VERSIONS_SCOPE,
  EnvironmentCodeError,
  EnvironmentCodeResolver,
  READONLY_SCOPE,
} from './environment-codes'

const containerPath = 'accounts/1/containers/2'

function fake() {
  const { service, state } = createFakeService({
    accounts: [{ accountId: '1', name: 'Acme' }],
    containers: [{ accountId: '1', containerId: '2', publicId: 'GTM-ABC1234', name: 'Acme web' }],
    environments: [
      {
        path: `${containerPath}/environments/1`,
        environmentId: '1',
        type: 'live',
        name: 'Live',
        authorizationCode: 'code-live',
        fingerprint: 'f1',
      },
      {
        path: `${containerPath}/environments/2`,
        environmentId: '2',
        type: 'latest',
        name: 'Latest',
        authorizationCode: 'code-latest',
        fingerprint: 'f2',
      },
      {
        path: `${containerPath}/environments/7`,
        environmentId: '7',
        type: 'user',
        name: 'QA',
        authorizationCode: 'code-qa',
        fingerprint: 'f7',
      },
    ],
  })
  state.workspaces.push({
    path: `${containerPath}/workspace/11`,
    workspaceId: '11',
    name: 'Default Workspace',
  })
  return { service, state }
}

let cacheFile: string
let scopesRequested: string[][]
beforeEach(async () => {
  cacheFile = join(await mkdtemp(join(tmpdir(), 'gtm-preview-')), 'codes.json')
  scopesRequested = []
})

function resolver(f = fake()) {
  const r = new EnvironmentCodeResolver({
    cacheFile,
    clientFactory: async (scopes) => {
      scopesRequested.push([...scopes])
      const client = new GtmClient({ service: f.service, minIntervalMs: 0 })
      await client.init()
      return client
    },
    now: () => new Date('2026-09-19T12:00:00Z'),
  })
  return { r, ...f }
}

describe('EnvironmentCodeResolver', () => {
  it('resolves Live, Latest, a custom name, and a numeric id from the API', async () => {
    const { r } = resolver()
    expect(await r.resolve('GTM-ABC1234', 'Latest')).toEqual({
      authCode: 'code-latest',
      environmentId: 2,
      environmentName: 'Latest',
      source: 'api',
    })
    expect((await r.resolve('GTM-ABC1234', 'live')).authCode).toBe('code-live')
    expect((await r.resolve('GTM-ABC1234', 'qa')).environmentId).toBe(7)
    expect((await r.resolve('GTM-ABC1234', 7)).authCode).toBe('code-qa')
  })

  it('asks for the readonly scope only', async () => {
    const { r } = resolver()
    await r.resolve('GTM-ABC1234', 'Live')
    expect(scopesRequested).toEqual([[READONLY_SCOPE]])
  })

  it('serves the second resolve from the cache with no API call', async () => {
    const { r, state } = resolver()
    await r.resolve('GTM-ABC1234', 'Live')
    const calls = state.calls.length
    const second = await r.resolve('GTM-ABC1234', 'Latest')
    expect(second.source).toBe('cache')
    expect(state.calls.length).toBe(calls)
  })

  it('writes the cache owner-only with fingerprint and fetch time and never the code in a log-like field', async () => {
    const { r } = resolver()
    await r.resolve('GTM-ABC1234', 'Live')
    const mode = (await stat(cacheFile)).mode & 0o777
    expect(mode).toBe(0o600)
    const cache = JSON.parse(await readFile(cacheFile, 'utf8'))
    expect(cache.environments['GTM-ABC1234/1']).toMatchObject({
      fingerprint: 'f1',
      fetchedAt: '2026-09-19T12:00:00.000Z',
      environmentName: 'Live',
    })
    expect(cache.containers['GTM-ABC1234']).toMatchObject({ accountId: '1', containerId: '2' })
  })

  it('refetches when asked to refresh and after invalidate', async () => {
    const { r, state } = resolver()
    await r.resolve('GTM-ABC1234', 'Live')
    const before = state.calls.length
    await r.resolve('GTM-ABC1234', 'Live', { refresh: true })
    expect(state.calls.length).toBeGreaterThan(before)
    const mid = state.calls.length
    await r.invalidate('GTM-ABC1234', 1)
    expect((await r.resolve('GTM-ABC1234', 'Live')).source).toBe('api')
    expect(state.calls.length).toBeGreaterThan(mid)
  })

  it('names the available environments when none matches', async () => {
    const { r } = resolver()
    await expect(r.resolve('GTM-ABC1234', 'Staging')).rejects.toThrow(EnvironmentCodeError)
    await expect(r.resolve('GTM-ABC1234', 'Staging')).rejects.toThrow(
      /available: 1 \(Live\), 2 \(Latest\), 7 \(QA\)/,
    )
  })

  it('fails clearly for a container the user cannot see', async () => {
    const { r } = resolver()
    await expect(r.resolve('GTM-NOPE999', 'Live')).rejects.toThrow(
      /No accessible container with public id GTM-NOPE999/,
    )
  })

  it('rejects an environment without an authorization code', async () => {
    const f = fake()
    f.state.environments.push({
      path: `${containerPath}/environments/9`,
      environmentId: '9',
      name: 'Broken',
    })
    const { r } = resolver(f)
    await expect(r.resolve('GTM-ABC1234', 'Live')).rejects.toThrow(/unexpected environment shape/)
  })

  it('creates a version from a named workspace with the edit scope and drops the Latest cache entry', async () => {
    const { r, state } = resolver()
    await r.resolve('GTM-ABC1234', 'Latest')
    const result = await r.createVersionFromWorkspace(
      'GTM-ABC1234',
      'Default Workspace',
      'gtm-preview 2026-09-19',
    )
    expect(result.versionPath).toMatch(/\/versions\/\d+$/)
    expect(state.calls).toContain('workspaces.create_version')
    expect(state.published).toEqual([])
    expect(scopesRequested.at(-1)).toEqual([READONLY_SCOPE, EDIT_VERSIONS_SCOPE])
    expect((await r.resolve('GTM-ABC1234', 'Latest')).source).toBe('api')
  })

  it('names the available workspaces when the requested one is missing', async () => {
    const { r } = resolver()
    await expect(r.createVersionFromWorkspace('GTM-ABC1234', 'Nope', 'v')).rejects.toThrow(
      /available: Default Workspace/,
    )
  })
})
