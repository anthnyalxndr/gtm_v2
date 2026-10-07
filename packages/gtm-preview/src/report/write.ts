import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SessionReport } from './types'

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as object).sort())
      out[k] = sortKeys((value as Record<string, unknown>)[k])
    return out
  }
  return value
}

/** Serialise with sorted keys so equal reports are byte-identical. */
export function serialiseReport(report: SessionReport): string {
  return JSON.stringify(sortKeys(report), null, 2) + '\n'
}

export async function writeReport(path: string, report: SessionReport): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, serialiseReport(report), 'utf8')
}
