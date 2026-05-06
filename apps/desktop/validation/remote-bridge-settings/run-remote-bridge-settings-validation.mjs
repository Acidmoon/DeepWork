import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')
const panelsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'panels.ts')
const settingsManagerPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'settings-manager.ts')
const rendererStorePath = join(repoRoot, 'apps', 'desktop', 'src', 'renderer', 'src', 'store.ts')
const settingsPanelPath = join(repoRoot, 'apps', 'desktop', 'src', 'renderer', 'src', 'panel-content', 'settings-panel.tsx')
const terminalPanelPath = join(repoRoot, 'apps', 'desktop', 'src', 'renderer', 'src', 'panel-content', 'terminal-panel.tsx')
const i18nPath = join(repoRoot, 'apps', 'desktop', 'src', 'renderer', 'src', 'i18n.ts')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function importSettingsModule() {
  const source = readFileSync(settingsPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: settingsPath
  })
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`

  return import(moduleUrl)
}

const {
  MIN_REMOTE_BRIDGE_OUTPUT_CHARACTERS,
  defaultAppSettings,
  isRemoteBridgeReady,
  normalizeRemoteBridgeSettings,
  validateRemoteBridgeSettings
} = await importSettingsModule()

const defaultSettings = normalizeRemoteBridgeSettings(undefined)
assert(defaultSettings.enabled === false, 'Remote bridge must be disabled by default.')
assert(defaultSettings.targetMode === 'pty', 'Remote bridge must default to PTY target mode.')
assert(defaultSettings.intakeMode === 'polling', 'Remote bridge must default to polling intake mode.')
assert(defaultSettings.enabledPanelIds.length === 1, 'Default remote bridge panel list should contain one MVP panel.')
assert(defaultSettings.enabledPanelIds[0] === 'codex-cli', 'Default remote bridge panel should be codex-cli.')
assert(validateRemoteBridgeSettings(defaultSettings).length === 0, 'Disabled remote bridge should not require credentials.')
assert(defaultAppSettings.remoteBridge.enabled === false, 'App settings snapshot should include a disabled remote bridge.')

const invalidEnabledSettings = normalizeRemoteBridgeSettings({
  enabled: true,
  credentials: { appId: '', appSecret: '' },
  allowedChatIds: [],
  allowedUserIds: []
})
const invalidErrors = validateRemoteBridgeSettings(invalidEnabledSettings)
assert(invalidErrors.some((error) => error.includes('app id')), 'Enabled remote bridge should require Feishu app id.')
assert(invalidErrors.some((error) => error.includes('app secret')), 'Enabled remote bridge should require Feishu app secret.')
assert(invalidErrors.some((error) => error.includes('chat id')), 'Enabled remote bridge should require chat allowlist.')
assert(invalidErrors.some((error) => error.includes('user id')), 'Enabled remote bridge should require user allowlist.')
assert(!isRemoteBridgeReady(invalidEnabledSettings), 'Invalid enabled remote bridge should not be ready.')

const mismatchedPanelSettings = normalizeRemoteBridgeSettings({
  enabled: true,
  credentials: { appId: 'cli_a', appSecret: 'secret' },
  allowedChatIds: ['chat-1'],
  allowedUserIds: ['user-1'],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'claude-code'
})
assert(
  validateRemoteBridgeSettings(mismatchedPanelSettings).some((error) => error.includes('default remote bridge panel')),
  'Default panel must be included in enabledPanelIds.'
)

const unknownPanelSettings = normalizeRemoteBridgeSettings({
  enabled: true,
  credentials: { appId: 'cli_a', appSecret: 'secret' },
  allowedChatIds: ['chat-1'],
  allowedUserIds: ['user-1'],
  enabledPanelIds: ['unknown-panel'],
  defaultPanelId: 'unknown-panel'
})
assert(
  validateRemoteBridgeSettings(unknownPanelSettings, ['codex-cli']).some((error) => error.includes('unknown-panel')),
  'Remote bridge validation should reject unavailable panels when a panel set is provided.'
)

const validSettings = normalizeRemoteBridgeSettings({
  enabled: true,
  credentials: {
    appId: ' cli_valid ',
    appSecret: ' secret ',
    verificationToken: ' token ',
    encryptKey: ' key '
  },
  allowedChatIds: [' chat-a ', 'chat-a', '', 42, 'chat-b'],
  allowedUserIds: [' user-a ', 'user-a', 'user-b'],
  adminUserIds: [' admin-a ', 'admin-a'],
  enabledPanelIds: [' codex-cli ', 'codex-cli'],
  defaultPanelId: ' codex-cli ',
  output: {
    maxMessageCharacters: 10,
    maxTailCharacters: 60000,
    debounceMs: 1,
    proactiveDelivery: true
  }
})
assert(validSettings.credentials.appId === 'cli_valid', 'Feishu app id should be trimmed.')
assert(JSON.stringify(validSettings.allowedChatIds) === JSON.stringify(['chat-a', 'chat-b']), 'Chat allowlist should trim and dedupe.')
assert(JSON.stringify(validSettings.allowedUserIds) === JSON.stringify(['user-a', 'user-b']), 'User allowlist should trim and dedupe.')
assert(JSON.stringify(validSettings.adminUserIds) === JSON.stringify(['admin-a']), 'Admin allowlist should trim and dedupe.')
assert(validSettings.output.maxMessageCharacters === MIN_REMOTE_BRIDGE_OUTPUT_CHARACTERS, 'Output limits should clamp to minimum.')
assert(isRemoteBridgeReady(validSettings, ['codex-cli']), 'Valid enabled remote bridge should be ready.')

const panelsSource = readFileSync(panelsPath, 'utf8')
assert(panelsSource.includes('remoteBridge: RemoteBridgeSettings'), 'SettingsPanelViewState should expose remoteBridge settings.')
assert(
  panelsSource.includes('remoteBridge: defaultAppSettings.remoteBridge'),
  'Default settings panel state should initialize remoteBridge from defaultAppSettings.'
)

const rendererStoreSource = readFileSync(rendererStorePath, 'utf8')
assert(
  rendererStoreSource.includes('remoteBridge: snapshot.remoteBridge'),
  'Renderer settings synchronization should copy remoteBridge into the Settings panel state.'
)

const settingsPanelSource = readFileSync(settingsPanelPath, 'utf8')
for (const expectedSnippet of [
  'ui.remoteBridgeSettings',
  'ui.remoteBridgeApiBase',
  'ui.remoteBridgePollingIntervalMs',
  'state.remoteBridge.enabled',
  'state.remoteBridge.credentials.appId',
  'state.remoteBridge.credentials.appSecret',
  'state.remoteBridge.allowedChatIds',
  'state.remoteBridge.allowedUserIds',
  'state.remoteBridge.enabledPanelIds',
  'window.workbenchShell.settings.update({ remoteBridge: state.remoteBridge })'
]) {
  assert(settingsPanelSource.includes(expectedSnippet), `Settings UI should include remote bridge control: ${expectedSnippet}`)
}
assert(settingsPanelSource.includes('type="password"'), 'Settings UI should use password inputs for remote bridge secrets.')

const terminalPanelSource = readFileSync(terminalPanelPath, 'utf8')
for (const expectedSnippet of [
  "panel.definition.id === 'codex-cli'",
  'const startRemoteMode = async',
  'remoteBridge: {',
  'enabled: true',
  "targetMode: 'pty'",
  'ui.remoteBridgeCliStart'
]) {
  assert(terminalPanelSource.includes(expectedSnippet), `Codex CLI panel should expose remote mode start control: ${expectedSnippet}`)
}

const settingsManagerSource = readFileSync(settingsManagerPath, 'utf8')
assert(
  settingsManagerSource.includes('const { remoteBridge: _remoteBridge, ...storedSnapshot } = snapshot'),
  'SettingsManager should scrub remoteBridge from the general settings.json payload.'
)
assert(
  settingsManagerSource.includes('writeRemoteBridgeConfigFile(this.remoteBridgeConfigPath, this.snapshot.remoteBridge)'),
  'SettingsManager should persist remote bridge settings only through the remote bridge config file.'
)

const i18nSource = readFileSync(i18nPath, 'utf8')
assert(i18nSource.includes("remoteBridgeSettings: '飞书远程操作'"), 'Remote bridge settings should have zh-CN UI text.')
assert(i18nSource.includes("remoteBridgeSettings: 'Feishu Remote Work'"), 'Remote bridge settings should have en-US UI text.')

console.log(
  JSON.stringify({
    defaultEnabled: defaultSettings.enabled,
    invalidErrors: invalidErrors.length,
    normalizedChats: validSettings.allowedChatIds,
    normalizedUsers: validSettings.allowedUserIds,
    maxMessageCharacters: validSettings.output.maxMessageCharacters,
    ready: isRemoteBridgeReady(validSettings, ['codex-cli']),
    settingsUi: true
  })
)
