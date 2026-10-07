import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface CachedContainer {
  accountId: string
  containerId: string
  path: string
  name: string
}

export interface CachedEnvironmentCode {
  environmentId: string
  environmentName: string
  environmentType?: string
  authorizationCode: string
  fingerprint?: string
  fetchedAt: string
}

export interface CodeCache {
  version: 1
  /** GTM public id to API ids. */
  containers: Record<string, CachedContainer>
  /** `${publicId}/${environmentId}` to code. */
  environments: Record<string, CachedEnvironmentCode>
}

const EMPTY: CodeCache = { version: 1, containers: {}, environments: {} }

/** Where codes live: a per-user directory, never the repo. Override with GTM_PREVIEW_CONFIG_DIR. */
export function defaultCacheFile(env: NodeJS.ProcessEnv = process.env): string {
  const dir =
    env.GTM_PREVIEW_CONFIG_DIR ??
    join(env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'gtm-preview')
  return join(dir, 'environment-codes.json')
}

export async function readCache(file: string): Promise<CodeCache> {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as Partial<CodeCache>
    if (parsed.version !== 1) return { ...EMPTY }
    return {
      version: 1,
      containers: parsed.containers ?? {},
      environments: parsed.environments ?? {},
    }
  } catch {
    return { version: 1, containers: {}, environments: {} }
  }
}

/** Codes unlock unpublished containers, so the file is owner-only. */
export async function writeCache(file: string, cache: CodeCache): Promise<void> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 })
  await writeFile(file, JSON.stringify(cache, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
  await chmod(file, 0o600)
}

export const environmentKey = (publicId: string, environmentId: string): string =>
  `${publicId}/${environmentId}`
