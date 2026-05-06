import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export const REQUIRED_CODEX_APP_SERVER_METHODS = [
  'initialize',
  'thread/start',
  'thread/resume',
  'turn/start',
  'turn/steer',
  'turn/interrupt'
] as const

export interface CodexAppServerFeatureDetection {
  codexAvailable: boolean
  version: string | null
  appServerAvailable: boolean
  generateTypesAvailable: boolean
  generateJsonSchemaAvailable: boolean
  supportedMethods: string[]
  missingMethods: string[]
  error: string | null
}

function runCodex(args: string[]): { ok: boolean; output: string; error: string | null } {
  const command = process.platform === 'win32' ? 'codex.cmd' : 'codex'
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false
  })

  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    error: result.error ? result.error.message : result.status === 0 ? null : `codex exited with ${result.status ?? 'null'}`
  }
}

export function detectCodexAppServerFeatures(protocolRoot: string): CodexAppServerFeatureDetection {
  const versionResult = runCodex(['--version'])
  const appServerHelp = runCodex(['app-server', '--help'])
  const generateTypesHelp = runCodex(['app-server', 'generate-ts', '--help'])
  const generateSchemaHelp = runCodex(['app-server', 'generate-json-schema', '--help'])
  const supportedMethods = detectGeneratedProtocolMethods(protocolRoot)
  const missingMethods = REQUIRED_CODEX_APP_SERVER_METHODS.filter((method) => !supportedMethods.includes(method))

  return {
    codexAvailable: versionResult.ok,
    version: versionResult.ok ? versionResult.output.split(/\r?\n/u)[0]?.trim() || null : null,
    appServerAvailable: appServerHelp.ok && appServerHelp.output.includes('Run the app server'),
    generateTypesAvailable: generateTypesHelp.ok && generateTypesHelp.output.includes('Generate TypeScript bindings'),
    generateJsonSchemaAvailable: generateSchemaHelp.ok && generateSchemaHelp.output.includes('Generate JSON Schema'),
    supportedMethods,
    missingMethods,
    error:
      versionResult.error ??
      appServerHelp.error ??
      generateTypesHelp.error ??
      generateSchemaHelp.error ??
      (missingMethods.length > 0 ? `Missing app-server methods: ${missingMethods.join(', ')}` : null)
  }
}

export function detectGeneratedProtocolMethods(protocolRoot: string): string[] {
  const clientRequestPath = join(protocolRoot, 'ts', 'ClientRequest.ts')
  if (!existsSync(clientRequestPath)) {
    return []
  }

  const source = readFileSync(clientRequestPath, 'utf8')
  const matches = source.matchAll(/"method":\s*"([^"]+)"/gu)
  return Array.from(new Set(Array.from(matches, (match) => match[1]).filter(Boolean))).sort()
}
