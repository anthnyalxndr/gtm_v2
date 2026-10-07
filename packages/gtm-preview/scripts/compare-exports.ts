import { readFileSync } from 'node:fs'
import {
  compareExports,
  formatDifferences,
  EXPORT_ALIGNMENT,
  EXPORT_KEYLESS_MAPS,
} from '../src/export/compare'

const [nativePath, oursPath, ...flags] = process.argv.slice(2)
if (!nativePath || !oursPath) {
  console.error('usage: tsx scripts/compare-exports.ts <native.json> <ours.json> [--values]')
  process.exit(2)
}
const read = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'))
const diffs = compareExports(read(nativePath), read(oursPath), {
  alignBy: EXPORT_ALIGNMENT,
  alignKeyless: EXPORT_KEYLESS_MAPS,
  compareValues: flags.includes('--values'),
})
console.log(
  `${diffs.length} difference${diffs.length === 1 ? '' : 's'} (native: ${nativePath}, ours: ${oursPath})`,
)
console.log(formatDifferences(diffs))
