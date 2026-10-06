/**
 * Turn the file Playwright's recorder writes (the "Node.js Library" shape) into a driver
 * module for a scenario: keep the page actions, drop the browser boilerplate, drop the
 * initial goto to the start URL (the runner already did it), and wrap in the driver export.
 */
export function driverFromCodegen(source: string, opts: { startUrl?: string } = {}): string {
  const lines = source.split(/\r?\n/)
  const start = lines.findIndex((l) => /const page = await context\.newPage\(\);?/.test(l))
  const end = lines.findIndex((l, i) => i > start && /^\s*\/\/ -{5,}/.test(l))
  let body = (start >= 0 ? lines.slice(start + 1, end >= 0 ? end : undefined) : lines)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^await page\.close\(\);?$/.test(l))
    .filter((l) => !/^await (context|browser)\.close\(\);?$/.test(l))
    .filter((l) => !/^\}\)\(\);?$/.test(l))
  if (opts.startUrl && body.length) {
    const first = body[0]!
    const m = /^await page\.goto\((['"`])(.*)\1\);?$/.exec(first)
    if (m && sameUrl(m[2]!, opts.startUrl)) body = body.slice(1)
  }
  const indented = body.map((l) => `  ${l}`).join('\n')
  return [
    "// Recorded with `gtm-preview record`. Add `await ctx.waitForEvent('<event>')` after actions",
    '// that push dataLayer events so replay waits for GTM instead of racing it.',
    'export default async function (page, ctx) {',
    indented || '  // no actions were recorded',
    '}',
    '',
  ].join('\n')
}

function sameUrl(a: string, b: string): boolean {
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    return (
      ua.origin === ub.origin && ua.pathname.replace(/\/$/, '') === ub.pathname.replace(/\/$/, '')
    )
  } catch {
    return a === b
  }
}
