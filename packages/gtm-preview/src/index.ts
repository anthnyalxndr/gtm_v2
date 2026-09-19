#!/usr/bin/env node
import { basename, dirname, extname, join } from 'node:path'
import { parseArgs, usage, type RunCommand } from './cli/parse-args'
import { buildTagAssistantExport } from './export/tag-assistant'
import { readRawSession, writeJson, type SavedRawSession } from './export/write'
import { buildReport } from './report/parse-records'
import type { SessionReport } from './report/types'
import { writeReport } from './report/write'
import {
  loadScenario,
  runnableFromEnv,
  ScenarioError,
  type LoadedScenario,
  type RunnableScenario,
} from './scenario/schema'
import { defaultCacheFile } from './auth/code-cache'
import { EnvironmentCodeError, EnvironmentCodeResolver } from './auth/environment-codes'
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
  for (const e of report.events) {
    for (const m of e.mismatches) {
      lines.push(
        m.kind === 'tag_without_hit'
          ? `  mismatch #${e.eventId} ${e.eventName}: tag "${m.tag}" (${m.tagType}) executed but no hit left the browser`
          : `  mismatch #${e.eventId} ${e.eventName}: ${m.vendor} hit${m.eventName ? ` "${m.eventName}"` : ''} to ${m.host} with no tag to explain it`,
      )
    }
  }
  for (const h of report.unattributedHits) {
    lines.push(
      `  mismatch before any event: ${h.vendor} hit${h.eventName ? ` "${h.eventName}"` : ''} to ${h.host}`,
    )
  }
  if (report.summary.mismatches)
    lines.push(
      `${report.summary.mismatches} mismatch${report.summary.mismatches === 1 ? '' : 'es'}`,
    )
  for (const err of report.errors) lines.push(`  warning: ${err}`)
  return lines.join('\n')
}

/** Turn a loaded scenario into a runnable one: code from the environment, or from the API. */
async function prepare(
  loaded: LoadedScenario,
  resolver: EnvironmentCodeResolver,
  refresh: boolean,
): Promise<RunnableScenario> {
  if (loaded.container.authCodeEnv) return runnableFromEnv(loaded)
  const code = await resolver.resolve(loaded.container.id, loaded.container.environment, {
    refresh,
  })
  console.error(
    `environment ${code.environmentName || code.environmentId} (env-${code.environmentId}) code from ${code.source}`,
  )
  return {
    ...loaded,
    authCode: code.authCode,
    container: { ...loaded.container, environment: code.environmentId },
    codeSource: code.source,
  }
}

async function run(command: RunCommand): Promise<number> {
  const loaded = await loadScenario(command.scenario)
  if (command.hits) loaded.hits = command.hits
  const stem = basename(command.scenario, extname(command.scenario))
  const out = command.out ?? join('reports', `${stem}.json`)
  const resolver = new EnvironmentCodeResolver({ cacheFile: defaultCacheFile() })
  if (command.versionFromWorkspace) {
    const { versionPath } = await resolver.createVersionFromWorkspace(
      loaded.container.id,
      command.versionFromWorkspace,
      `gtm-preview ${new Date().toISOString()}`,
    )
    console.error(
      `created ${versionPath} from workspace "${command.versionFromWorkspace}"; Latest now points at it`,
    )
  }
  const runOpts = {
    headless: !command.headed,
    pause: command.kind === 'record',
    log: (l: string) => console.error(l),
  }
  let scenario = await prepare(loaded, resolver, command.refresh)
  let raw
  try {
    raw = await runSession(scenario, runOpts)
  } catch (err) {
    // A cached code that stopped working means the environment was reauthorized. Try once more.
    if (!(err instanceof ContainerLoadError) || scenario.codeSource !== 'cache') throw err
    console.error('container rejected the cached code; refetching it and retrying once')
    await resolver.invalidate(scenario.container.id, scenario.container.environment)
    scenario = await prepare(loaded, resolver, true)
    raw = await runSession(scenario, runOpts)
  }
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
  if (!report.container.debugBuildLoaded) return 1
  if (command.failOnMismatch && report.summary.mismatches > 0) return 3
  return 0
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
      err instanceof DriverError ||
      err instanceof EnvironmentCodeError
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
