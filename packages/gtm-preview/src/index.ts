#!/usr/bin/env node
import { basename, extname, join } from 'node:path'
import { parseArgs, usage } from './cli/parse-args'
import { buildReport } from './report/parse-records'
import type { SessionReport } from './report/types'
import { writeReport } from './report/write'
import { loadScenario, ScenarioError } from './scenario/schema'
import { ContainerLoadError, runSession } from './session/run-session'
import { StepError } from './session/steps'

function summarise(report: SessionReport): string {
  const s = report.summary
  const lines = [
    `container ${report.container.id} env-${report.container.environment}` +
      (report.container.debugBuildLoaded ? ' (debug build)' : ' (debug build NOT loaded)') +
      `, hits: ${report.hitPolicy}`,
    `${s.events} events, ${s.tagsExecuted} tags executed, ${s.tagsBlocked} blocked, ${s.tagsFailed} failed, ${s.hitsAttempted} hits attempted, ${s.hitsSent} sent`,
  ]
  for (const e of report.events) {
    const fired = e.tags
      .filter((t) => t.decision === 'execute')
      .map((t) => `${t.name}${t.status ? ` [${t.status.replace('execute_', '')}]` : ''}`)
    const blocked = e.tags
      .filter((t) => t.decision !== 'execute')
      .map((t) => `${t.name} [${t.decision}]`)
    lines.push(
      `  #${e.eventId} ${e.eventName}` +
        (fired.length ? `  fired: ${fired.join(', ')}` : '') +
        (blocked.length ? `  blocked: ${blocked.join(', ')}` : ''),
    )
  }
  for (const err of report.errors) lines.push(`  warning: ${err}`)
  return lines.join('\n')
}

async function main(argv: readonly string[]): Promise<number> {
  let command
  try {
    command = parseArgs(argv)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    console.error(usage())
    return 2
  }
  if (command.kind === 'help') {
    console.log(usage())
    return 0
  }
  try {
    const scenario = await loadScenario(command.scenario)
    if (command.hits) scenario.hits = command.hits
    const out =
      command.out ??
      join('reports', `${basename(command.scenario, extname(command.scenario))}.json`)
    const raw = await runSession(scenario, {
      headless: !command.headed,
      log: (l) => console.error(l),
    })
    const report = buildReport(raw, {
      scenario: { name: scenario.name, startUrl: scenario.startUrl },
      container: { id: scenario.container.id, environment: scenario.container.environment },
      hitPolicy: scenario.hits,
    })
    await writeReport(out, report)
    console.log(summarise(report))
    console.log(`report written to ${out}`)
    return report.container.debugBuildLoaded ? 0 : 1
  } catch (err) {
    if (
      err instanceof ScenarioError ||
      err instanceof ContainerLoadError ||
      err instanceof StepError
    ) {
      console.error(err.message)
      return 1
    }
    console.error(err instanceof Error ? (err.stack ?? err.message) : String(err))
    return 1
  }
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code
})
