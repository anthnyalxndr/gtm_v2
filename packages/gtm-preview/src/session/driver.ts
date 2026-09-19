import { access } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import type { Page } from 'playwright'
import { waitForGtmEvent } from './steps'

/** What a driver receives besides the page. */
export interface DriverContext {
  /** Resolve once GTM's debug feed reports an event with this name. */
  waitForEvent: (event: string, timeoutMs?: number) => Promise<void>
  log: (line: string) => void
}

export type Driver = (page: Page, ctx: DriverContext) => Promise<void> | void

export class DriverError extends Error {
  constructor(
    public readonly driverPath: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`driver ${driverPath}: ${message}`, options)
  }
}

/**
 * Import a driver module and return its default export. The module is arbitrary code that
 * runs with the CLI's permissions; scenarios are trusted input.
 */
export async function loadDriver(driverPath: string): Promise<Driver> {
  try {
    await access(driverPath)
  } catch {
    throw new DriverError(driverPath, 'file not found')
  }
  let mod: { default?: unknown }
  try {
    mod = (await import(pathToFileURL(driverPath).href)) as { default?: unknown }
  } catch (err) {
    throw new DriverError(
      driverPath,
      `failed to import: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    )
  }
  if (typeof mod.default !== 'function') {
    throw new DriverError(
      driverPath,
      'default export must be a function (page, ctx) => Promise<void>',
    )
  }
  return mod.default as Driver
}

export function driverContext(page: Page, log: (line: string) => void): DriverContext {
  return {
    waitForEvent: (event, timeoutMs = 10_000) => waitForGtmEvent(page, event, timeoutMs),
    log,
  }
}

export async function runDriver(
  driver: Driver,
  driverPath: string,
  page: Page,
  log: (line: string) => void,
): Promise<void> {
  try {
    await driver(page, driverContext(page, log))
  } catch (err) {
    if (err instanceof DriverError) throw err
    throw new DriverError(driverPath, err instanceof Error ? err.message : String(err), {
      cause: err,
    })
  }
}
