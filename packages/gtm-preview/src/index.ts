#!/usr/bin/env node
import { basename, dirname, extname, join } from 'node:path'
import { parseArgs, usage, type RunCommand } from './cli/parse-args'
import { buildTagAssistantExport } from './export/tag-assistant'
import { readRawSession, writeJson, type SavedRawSession } from './export/write'
import { buildReport } from './report/parse-records'
import type { SessionReport } from './report/types'
import { writeReport } from './report/write'
import { loadScenario, ScenarioError } from './scenario/schema'
import { DriverError } from './session/driver'
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

async function run(command: RunCommand): Promise<number> {
  const scenario = await loadScenario(command.scenario)
  if (command.hits) scenario.hits = command.hits
  const stem = basename(command.scenario, extname(command.scenario))
  const out = command.out ?? join('reports', `${stem}.json`)
  const raw = await runSession(scenario, {
    headless: !command.headed,
    pause: command.kind === 'record',
    log: (l) => console.error(l),
  })
  const meta = {
    scenario: { name: scenario.name, startUrl: scenario.startUrl },
    container: { id: scenario.container.id, environment: scenario.container.environment },
    hitPolicy: scenario.hits,
  }
  const report = buildReport(raw, meta)
  await writeReport(out, report)
  console.log(summarise(report))
  console.log(`report written to ${out}`)
  if (command.raw) {
    const saved: SavedRawSession = {
      ...raw,
      meta: {
        scenario: scenario.name,
        startUrl: scenario.startUrl,
        containerId: scenario.container.id,
        environment: scenario.container.environment,
        hitPolicy: scenario.hits,
        capturedAt: new Date().toISOString(),
      },
    }
    await writeJson(command.raw, saved)
    console.log(`raw session written to ${command.raw}`)
  }
  if (command.tagAssistant) {
    const doc = buildTagAssistantExport(raw, {
      containerId: scenario.container.id,
      environment: scenario.container.environment,
      authCode: scenario.authCode,
      includeAuth: command.includeAuth,
      startUrl: scenario.startUrl,
      containerName: scenario.name,
    })
    await writeJson(command.tagAssistant, doc)
    console.log(`Tag Assistant import file written to ${command.tagAssistant}`)
  }
  return report.container.debugBuildLoaded ? 0 : 1
}

async function exportCommand(
  command: Extract<ReturnType<typeof parseArgs>, { kind: 'export' }>,
): Promise<number> {
  const saved = await readRawSession(command.raw)
  const out =
    command.out ??
    join(dirname(command.raw), `${basename(command.raw, extname(command.raw))}.tag-assistant.json`)
  if (command.includeAuth) {
    console.error(
      'raw sessions are saved with the authorization code redacted, so --include-auth has nothing to include; set it on run instead',
    )
  }
  const doc = buildTagAssistantExport(saved, {
    containerId: saved.meta.containerId,
    environment: saved.meta.environment,
    startUrl: saved.meta.startUrl,
    containerName: saved.meta.scenario,
  })
  await writeJson(out, doc)
  console.log(`Tag Assistant import file written to ${out}`)
  return 0
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
  try {
    switch (command.kind) {
      case 'help':
        console.log(usage())
        return 0
      case 'run':
      case 'record':
        return await run(command)
      case 'export':
        return await exportCommand(command)
    }
  } catch (err) {
    if (
      err instanceof ScenarioError ||
      err instanceof ContainerLoadError ||
      err instanceof StepError ||
      err instanceof DriverError
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
