import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { DriverError, loadDriver, runDriver } from './driver'
import type { Page } from 'playwright'

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../test/fixtures/drivers/${name}`, import.meta.url))

describe('loadDriver', () => {
  it('imports a module with a default function export', async () => {
    const driver = await loadDriver(fixture('codegen-like.mjs'))
    expect(typeof driver).toBe('function')
  })
  it('names the file when it does not exist', async () => {
    await expect(loadDriver(fixture('missing.mjs'))).rejects.toThrow(/missing\.mjs: file not found/)
  })
  it('rejects a module without a default function', async () => {
    await expect(loadDriver(fixture('no-default.mjs'))).rejects.toThrow(
      /default export must be a function/,
    )
  })
})

describe('runDriver', () => {
  it('wraps a throwing driver in a DriverError that names the file', async () => {
    const path = fixture('throws.mjs')
    const driver = await loadDriver(path)
    const err = await runDriver(driver, path, {} as Page, () => {}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DriverError)
    expect((err as Error).message).toMatch(/throws\.mjs: boom from the driver/)
  })
})
