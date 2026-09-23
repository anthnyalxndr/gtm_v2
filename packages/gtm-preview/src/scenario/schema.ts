import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { z } from 'zod'

export const HitPolicySchema = z.enum(['dry', 'debug', 'live'])
export type HitPolicy = z.infer<typeof HitPolicySchema>

const selector = z.string().min(1)

export const StepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('navigate'), url: z.string().url() }),
  z.object({ kind: z.literal('click'), selector }),
  z.object({ kind: z.literal('fill'), selector, value: z.string() }),
  z.object({ kind: z.literal('scroll'), y: z.number().int().positive().default(1000) }),
  z.object({ kind: z.literal('wait'), ms: z.number().int().positive() }),
  z.object({
    kind: z.literal('waitForEvent'),
    event: z.string().min(1),
    timeoutMs: z.number().int().positive().default(10_000),
    /** Wait until this many events with the name have started on the current page. */
    count: z.number().int().positive().default(1),
  }),
  z.object({ kind: z.literal('push'), data: z.record(z.unknown()) }),
])
export type Step = z.infer<typeof StepSchema>

export const ScenarioSchema = z
  .object({
    name: z.string().min(1),
    startUrl: z.string().url(),
    container: z.object({
      id: z.string().regex(/^GTM-[A-Z0-9]{5,10}$/, 'must look like GTM-XXXXXXX'),
      /** Environment number, or a name such as Live, Latest, or a custom environment. */
      environment: z.union([z.number().int().positive(), z.string().min(1)]),
      /**
       * Environment variable holding the authorization code. When omitted the code is
       * resolved through the Tag Manager API (gtm-client) and cached per user.
       */
      authCodeEnv: z.string().min(1).optional(),
    }),
    hits: HitPolicySchema.default('dry'),
    settleMs: z.number().int().nonnegative().default(1500),
    steps: z.array(StepSchema).default([]),
    /**
     * Path, relative to the scenario file, of a module whose default export is
     * `async (page, ctx) => void`. Drives the session instead of `steps`. Executed code.
     */
    driver: z.string().min(1).optional(),
  })
  .refine((s) => !(s.driver && s.steps.length > 0), {
    message: 'use either steps or driver, not both',
    path: ['driver'],
  })
export type Scenario = z.infer<typeof ScenarioSchema>

/** A scenario read from disk, with the code taken from the environment when it names one. */
export type LoadedScenario = Scenario & {
  authCode?: string
  /** Absolute path of the driver module when the scenario names one. */
  driverPath?: string
}

/** A scenario the runner can execute: code present, environment numeric. */
export type RunnableScenario = Omit<LoadedScenario, 'authCode' | 'container'> & {
  authCode: string
  container: Scenario['container'] & { environment: number }
  codeSource: 'env' | 'cache' | 'api'
  /** The environment's name and type in Tag Manager, when the API supplied the code. */
  environmentName?: string
  environmentType?: string
}

export class ScenarioError extends Error {}

function formatIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('; ')
}

export function parseScenario(json: unknown): Scenario {
  const result = ScenarioSchema.safeParse(json)
  if (!result.success) throw new ScenarioError(`invalid scenario: ${formatIssues(result.error)}`)
  return result.data
}

export function resolveScenario(
  scenario: Scenario,
  env: Record<string, string | undefined>,
  scenarioDir = process.cwd(),
): LoadedScenario {
  const loaded: LoadedScenario = { ...scenario }
  if (scenario.container.authCodeEnv) {
    const authCode = env[scenario.container.authCodeEnv]
    if (!authCode) {
      throw new ScenarioError(
        `environment variable ${scenario.container.authCodeEnv} is not set (it must hold the GTM environment authorization code)`,
      )
    }
    if (typeof scenario.container.environment !== 'number') {
      throw new ScenarioError(
        'container.environment must be a number when authCodeEnv is used; names need the API',
      )
    }
    loaded.authCode = authCode
  }
  if (scenario.driver) {
    loaded.driverPath = isAbsolute(scenario.driver)
      ? scenario.driver
      : resolve(scenarioDir, scenario.driver)
  }
  return loaded
}

export async function loadScenario(
  path: string,
  env: Record<string, string | undefined> = process.env,
): Promise<LoadedScenario> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (err) {
    throw new ScenarioError(`cannot read scenario ${path}: ${(err as Error).message}`)
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (err) {
    throw new ScenarioError(`scenario ${path} is not valid JSON: ${(err as Error).message}`)
  }
  return resolveScenario(parseScenario(json), env, dirname(resolve(path)))
}

/** Finish a scenario that already has its code from the environment variable. */
export function runnableFromEnv(scenario: LoadedScenario): RunnableScenario {
  if (!scenario.authCode || typeof scenario.container.environment !== 'number') {
    throw new ScenarioError('scenario has no authorization code from the environment')
  }
  return {
    ...scenario,
    authCode: scenario.authCode,
    container: { ...scenario.container, environment: scenario.container.environment },
    codeSource: 'env',
  }
}
