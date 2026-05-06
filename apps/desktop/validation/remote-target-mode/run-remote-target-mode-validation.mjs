import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')
const targetModePath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-target-mode.ts')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function importTranspiled(path, replacements = []) {
  let source = readFileSync(path, 'utf8')
  for (const [pattern, replacement] of replacements) {
    source = source.replace(pattern, replacement)
  }

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: path
  })
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`

  return import(moduleUrl)
}

const settingsModuleUrl = `data:text/javascript;base64,${Buffer.from(
  ts.transpileModule(readFileSync(settingsPath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: settingsPath
  }).outputText,
  'utf8'
).toString('base64')}`
const { normalizeRemoteBridgeSettings } = await import(settingsModuleUrl)
const { RemoteTargetModeRegistry, rollbackStructuredMode } = await importTranspiled(targetModePath, [
  [
    "import { normalizeRemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'",
    `const { normalizeRemoteBridgeSettings } = await import(${JSON.stringify(settingsModuleUrl)})`
  ]
])

let nowIndex = 0
const times = ['2026-05-06T09:10:00.000Z', '2026-05-06T09:11:00.000Z', '2026-05-06T09:12:00.000Z']
const registry = new RemoteTargetModeRegistry('codex-cli', 'pty', () => times[nowIndex++] ?? times.at(-1))

const initialTarget = registry.getTarget('chat-a')
assert(initialTarget.mode === 'pty', 'Conversations should default to explicit PTY mode.')
assert(initialTarget.panelId === 'codex-cli', 'Conversations should default to the configured panel.')

const implicitSwitch = registry.resolveForMessage('chat-a', 'codex-app-server')
assert(implicitSwitch.ok === false, 'Conversations must not silently switch target modes from message context.')
assert(implicitSwitch.target?.mode === 'pty', 'Implicit switch rejection should preserve the existing mode.')

const unauthorizedSwitch = registry.selectMode('chat-a', 'codex-app-server', false)
assert(unauthorizedSwitch.ok === false, 'Unauthorized actors must not switch target modes.')
assert(unauthorizedSwitch.target?.mode === 'pty', 'Unauthorized switch should preserve the existing mode.')

const authorizedSwitch = registry.selectMode('chat-a', 'codex-app-server', true)
assert(authorizedSwitch.ok === true, 'Authorized explicit mode command should switch target mode.')
assert(authorizedSwitch.target?.mode === 'codex-app-server', 'Authorized switch should set structured mode.')

const resolvedStructured = registry.resolveForMessage('chat-a')
assert(resolvedStructured.ok === true && resolvedStructured.target?.mode === 'codex-app-server', 'Later messages should keep the explicit structured mode.')

const structuredSettings = normalizeRemoteBridgeSettings({
  enabled: true,
  targetMode: 'codex-app-server',
  credentials: { appId: 'cli_valid', appSecret: 'secret' },
  allowedChatIds: ['chat-a'],
  allowedUserIds: ['user-a'],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'codex-cli'
})
const rolledBack = rollbackStructuredMode(structuredSettings)
assert(rolledBack.targetMode === 'pty', 'Rollback should return the target mode to PTY.')
assert(rolledBack.defaultPanelId === 'codex-cli', 'Rollback should preserve the selected local terminal panel.')
assert(JSON.stringify(rolledBack.enabledPanelIds) === JSON.stringify(['codex-cli']), 'Rollback should preserve remote-enabled panels.')
assert(rolledBack.enabled === true, 'Rollback should not disable the whole bridge unless explicitly configured elsewhere.')

console.log(
  JSON.stringify({
    initialMode: initialTarget.mode,
    implicitSwitchOk: implicitSwitch.ok,
    unauthorizedSwitchOk: unauthorizedSwitch.ok,
    authorizedMode: authorizedSwitch.target?.mode,
    rolledBackMode: rolledBack.targetMode
  })
)
