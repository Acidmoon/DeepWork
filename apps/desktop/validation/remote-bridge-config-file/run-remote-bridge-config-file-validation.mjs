import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const configFilePath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-bridge-config-file.ts')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')
const gitignorePath = join(repoRoot, '.gitignore')
const exampleConfigPath = join(repoRoot, 'config', 'remote-bridge.example.json')

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
const { normalizeRemoteBridgeSettings, validateRemoteBridgeSettings } = await import(settingsModuleUrl)
const {
  readFeishuEnvRemoteBridgeConfig,
  readRemoteBridgeConfigFile,
  resolveRemoteBridgeConfigPath,
  writeRemoteBridgeConfigFile
} = await importTranspiled(configFilePath, [
  [
    "import { normalizeRemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'",
    `const { normalizeRemoteBridgeSettings } = await import(${JSON.stringify(settingsModuleUrl)})`
  ]
])

const gitignore = readFileSync(gitignorePath, 'utf8')
assert(
  gitignore.includes('config/remote-bridge.local.json'),
  'Git ignore rules should exclude the local remote bridge config with credentials.'
)
assert(
  gitignore.includes('config/remote-bridge.*.local.json'),
  'Git ignore rules should exclude named local remote bridge config variants.'
)

const exampleConfig = JSON.parse(readFileSync(exampleConfigPath, 'utf8')).remoteBridge
assert(exampleConfig.enabled === false, 'Example remote bridge config should stay disabled.')
assert(exampleConfig.apiBase === 'https://open.feishu.cn/open-apis', 'Example remote bridge config should include Feishu API base.')
assert(exampleConfig.pollingIntervalMs === 5000, 'Example remote bridge config should include polling interval.')
assert(exampleConfig.credentials.appId === '', 'Example remote bridge config should not include an app id.')
assert(exampleConfig.credentials.appSecret === '', 'Example remote bridge config should not include an app secret.')
assert(Array.isArray(exampleConfig.allowedChatIds) && exampleConfig.allowedChatIds.length === 0, 'Example chat allowlist should be empty.')
assert(Array.isArray(exampleConfig.allowedUserIds) && exampleConfig.allowedUserIds.length === 0, 'Example user allowlist should be empty.')

const tempDir = mkdtempSync(join(tmpdir(), 'deepwork-remote-bridge-config-'))
try {
  const defaultPath = resolveRemoteBridgeConfigPath(tempDir, '', tempDir)
  assert(defaultPath.endsWith('remote-bridge.json'), 'Default remote bridge config path should use remote-bridge.json.')
  const overridePath = join(tempDir, 'release-remote-bridge.json')
  assert(resolveRemoteBridgeConfigPath(tempDir, overridePath, tempDir) === overridePath, 'Explicit remote bridge config path should be honored.')

  const portableDir = join(tempDir, 'config')
  const portableLocalPath = join(portableDir, 'remote-bridge.local.json')

  const settings = normalizeRemoteBridgeSettings({
    enabled: true,
    credentials: {
      appId: 'cli_valid',
      appSecret: 'secret'
    },
    allowedChatIds: ['chat-a'],
    allowedUserIds: ['user-a'],
    enabledPanelIds: ['codex-cli'],
    defaultPanelId: 'codex-cli'
  })
  writeRemoteBridgeConfigFile(overridePath, settings)
  writeRemoteBridgeConfigFile(portableLocalPath, settings)
  assert(
    resolveRemoteBridgeConfigPath(tempDir, '', tempDir) === portableLocalPath,
    'Portable local remote bridge config should be detected before user-data fallback.'
  )
  const nestedWorkspacePath = join(tempDir, 'apps', 'desktop')
  assert(
    resolveRemoteBridgeConfigPath(tempDir, '', nestedWorkspacePath) === portableLocalPath,
    'Portable local remote bridge config should be found from nested workspace cwd.'
  )
  const loaded = readRemoteBridgeConfigFile(overridePath)
  assert(loaded.enabled === true, 'Remote bridge config file should persist enabled state.')
  assert(loaded.credentials.appId === 'cli_valid', 'Remote bridge config file should persist app id.')
  assert(loaded.allowedChatIds[0] === 'chat-a', 'Remote bridge config file should persist allowed chat ids.')
  assert(validateRemoteBridgeSettings(loaded, ['codex-cli']).length === 0, 'Loaded remote bridge config should validate.')

  const envPath = join(tempDir, '.env')
  writeFileSync(
    envPath,
    [
      'FEISHU_APP_ID=cli_from_env',
      'FEISHU_APP_SECRET=secret_from_env',
      'ALLOWED_USER_ID=ou_user',
      'FEISHU_CHAT_ID=oc_chat',
      'FEISHU_API_BASE=https://open.feishu.cn/open-apis'
    ].join('\n'),
    'utf8'
  )
  const imported = readFeishuEnvRemoteBridgeConfig(envPath)
  assert(imported.enabled === false, 'Imported Feishu env config should stay disabled until explicitly enabled.')
  assert(imported.credentials.appId === 'cli_from_env', 'Feishu env import should map app id.')
  assert(imported.credentials.appSecret === 'secret_from_env', 'Feishu env import should map app secret.')
  assert(imported.allowedUserIds[0] === 'ou_user', 'Feishu env import should map allowed user.')
  assert(imported.allowedChatIds[0] === 'oc_chat', 'Feishu env import should map allowed chat.')

  console.log(
    JSON.stringify({
      defaultFile: defaultPath.endsWith('remote-bridge.json'),
      loadedEnabled: loaded.enabled,
      importedEnabled: imported.enabled,
      importedChatCount: imported.allowedChatIds.length,
      importedUserCount: imported.allowedUserIds.length
    })
  )
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
