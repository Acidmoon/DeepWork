import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const clientPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'feishu-remote-bridge-api-client.ts')
const servicePath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'feishu-remote-bridge-service.ts')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')
const mainPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'index.ts')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function transpileSource(path, replacements = []) {
  let source = readFileSync(path, 'utf8')
  for (const [pattern, replacement] of replacements) {
    source = source.replace(pattern, replacement)
  }

  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: path
  }).outputText
}

const settingsModuleUrl = `data:text/javascript;base64,${Buffer.from(transpileSource(settingsPath), 'utf8').toString('base64')}`
const { normalizeRemoteBridgeSettings } = await import(settingsModuleUrl)

const clientModuleUrl = `data:text/javascript;base64,${Buffer.from(
  transpileSource(clientPath, [
    [
      "import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'",
      `const { normalizeRemoteBridgeSettings } = await import(${JSON.stringify(settingsModuleUrl)})`
    ]
  ]),
  'utf8'
).toString('base64')}`
const { FeishuRemoteBridgeApiClient } = await import(clientModuleUrl)

const serviceSource = readFileSync(servicePath, 'utf8')
const mainSource = readFileSync(mainPath, 'utf8')
for (const [source, snippet] of [
  [serviceSource, 'RemoteWorkCommandRouter'],
  [serviceSource, 'deliverFeishuOutput'],
  [serviceSource, 'pollingIntervalMs'],
  [serviceSource, 'subscribeOutput'],
  [serviceSource, 'new RemoteOutputCoalescer'],
  [serviceSource, "mode: 'text'"],
  [mainSource, 'syncRemoteBridgeService(initialSettings)'],
  [mainSource, 'syncRemoteBridgeService(snapshot)'],
  [mainSource, 'remoteBridgeService?.dispose()'],
  [mainSource, 'Failed to dispose remote bridge service'],
  [mainSource, 'Failed to start remote bridge service']
]) {
  assert(source.includes(snippet), `Expected snippet: ${snippet}`)
}
assert(
  !serviceSource.includes('if (!this.options.settings.output.proactiveDelivery)'),
  'Remote bridge output subscription should run even when proactive delivery is disabled.'
)

const calls = []
const tokenResponse = {
  code: 0,
  tenant_access_token: 'tenant-token',
  expire: 7200
}
const botResponse = {
  code: 0,
  data: {
    bot: {
      user_id: 'bot-user'
    }
  }
}
const listResponse = {
  code: 0,
  data: {
    items: [
      {
        message_id: 'msg-1',
        msg_type: 'text',
        create_time: '1001000',
        sender: { id: 'ou-user' },
        body: { content: JSON.stringify({ text: '/status' }) }
      }
    ]
  }
}
const sendResponse = {
  code: 0,
  data: {
    message_id: 'reply-1'
  }
}

const fetch = async (input, init = {}) => {
  calls.push({
    url: String(input),
    method: init.method ?? 'GET',
    body: init.body ?? null
  })

  if (String(input).includes('/auth/v3/tenant_access_token/internal')) {
    return { ok: true, status: 200, json: async () => tokenResponse }
  }

  if (String(input).includes('/bot/v3/bot/get')) {
    return { ok: true, status: 200, json: async () => botResponse }
  }

  if (String(input).includes('/im/v1/messages?') && (init.method ?? 'GET') === 'GET') {
    return { ok: true, status: 200, json: async () => listResponse }
  }

  if (String(input).includes('/im/v1/messages') && (init.method ?? 'GET') === 'POST') {
    return { ok: true, status: 200, json: async () => sendResponse }
  }

  throw new Error(`Unexpected fetch: ${String(input)}`)
}

const settings = normalizeRemoteBridgeSettings({
  enabled: true,
  apiBase: 'https://open.feishu.cn/open-apis',
  pollingIntervalMs: 5000,
  credentials: {
    appId: 'cli_app',
    appSecret: 'cli_secret'
  },
  allowedChatIds: ['chat-1'],
  allowedUserIds: ['ou-user'],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'codex-cli'
})
const client = new FeishuRemoteBridgeApiClient(settings, {
  fetch,
  now: () => 1000000
})

const messages = await client.fetchMessages()
assert(messages.length === 1, 'Feishu client should fetch allowed chat messages.')
assert(messages[0].messageId === 'msg-1', 'Feishu client should preserve message id.')
assert(messages[0].userId === 'ou-user', 'Feishu client should preserve sender id.')
assert(messages[0].text === '/status', 'Feishu client should parse text payload.')

const sent = await client.sendText('chat-1', 'Remote session is ready.')
assert(sent.messageId === 'reply-1', 'Feishu client should return send response ids.')

assert(calls.some((call) => call.url.includes('/auth/v3/tenant_access_token/internal')), 'Feishu client should request tenant access token.')
assert(calls.some((call) => call.url.includes('/bot/v3/bot/get')), 'Feishu client should fetch bot info for self filtering.')
assert(calls.some((call) => call.url.includes('/im/v1/messages?receive_id_type=chat_id') && call.method === 'POST'), 'Feishu client should send chat messages.')

console.log(
  JSON.stringify({
    fetchedMessages: messages.length,
    sentMessageId: sent.messageId,
    calls: calls.length,
    ready: true
  })
)
