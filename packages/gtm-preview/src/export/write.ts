import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { RawSession } from '../report/parse-records'

/** The raw session file also carries what the exporter needs to describe the run. */
export interface SavedRawSession extends RawSession {
  meta: {
    scenario: string
    startUrl: string
    containerId: string
    environment: number
    hitPolicy: string
    capturedAt: string
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

export async function readRawSession(path: string): Promise<SavedRawSession> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as Partial<SavedRawSession>
  if (
    !Array.isArray(parsed.records) ||
    !parsed.meta?.containerId ||
    typeof parsed.meta.environment !== 'number'
  ) {
    throw new Error(`${path} is not a raw session saved by gtm-preview run --raw`)
  }
  return parsed as SavedRawSession
}
