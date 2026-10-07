import type { Page } from 'playwright'
import type { Step } from '../scenario/schema'
import { RECORDS_GLOBAL } from './debug-queue'

export class StepError extends Error {
  constructor(
    public readonly index: number,
    public readonly step: Step,
    cause: unknown,
  ) {
    super(
      `step ${index} (${step.kind}) failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    )
  }
}

/** Resolve once the debug feed has reported an event with the given name. */
/**
 * Resolve once the debug feed on the current page has reported at least `count` events with
 * the given name. Counts are per page, since the in-page record array restarts on navigation.
 */
export async function waitForGtmEvent(
  page: Page,
  event: string,
  timeoutMs: number,
  count = 1,
): Promise<void> {
  try {
    await page.waitForFunction(
      ({ global, event, count }) => {
        const records = (window as unknown as Record<string, unknown[]>)[global] ?? []
        let seen = 0
        for (const r of records) {
          const rec = r as { messageType?: string; key?: { eventName?: string } }
          if (rec.messageType === 'EVENT_STARTED' && rec.key?.eventName === event) seen += 1
        }
        return seen >= count
      },
      { global: RECORDS_GLOBAL, event, count },
      { timeout: timeoutMs },
    )
  } catch {
    throw new Error(
      `event "${event}" did not start${count > 1 ? ` ${count} times` : ''} within ${timeoutMs}ms`,
    )
  }
}

export async function executeStep(page: Page, step: Step, index: number): Promise<void> {
  try {
    switch (step.kind) {
      case 'navigate':
        await page.goto(step.url, { waitUntil: 'load' })
        return
      case 'click':
        await page.click(step.selector)
        return
      case 'fill':
        await page.fill(step.selector, step.value)
        return
      case 'scroll':
        await page.mouse.wheel(0, step.y)
        return
      case 'wait':
        await page.waitForTimeout(step.ms)
        return
      case 'waitForEvent':
        await waitForGtmEvent(page, step.event, step.timeoutMs, step.count)
        return
      case 'push':
        await page.evaluate((data) => {
          const w = window as unknown as { dataLayer?: unknown[] }
          w.dataLayer = w.dataLayer ?? []
          w.dataLayer.push(data)
        }, step.data)
        return
    }
  } catch (err) {
    throw new StepError(index, step, err)
  }
}
