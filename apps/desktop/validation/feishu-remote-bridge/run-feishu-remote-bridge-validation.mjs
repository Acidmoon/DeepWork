import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const bridgePath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'feishu-remote-work-bridge.ts')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')
const auditPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-bridge-audit.ts')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function importTranspiledModule(path, replacements = []) {
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

const settingsModule = await importTranspiledModule(settingsPath)
const auditModuleSource = ts.transpileModule(readFileSync(auditPath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true
  },
  fileName: auditPath
}).outputText
const auditModuleUrl = `data:text/javascript;base64,${Buffer.from(auditModuleSource, 'utf8').toString('base64')}`
const bridgeModuleUrl = `data:text/javascript;base64,${Buffer.from(
  ts.transpileModule(
    readFileSync(bridgePath, 'utf8')
      .replace(
        "import { isRemoteBridgeReady } from '@ai-workbench/core/desktop/settings'",
        `const { isRemoteBridgeReady } = await import(${JSON.stringify(
          `data:text/javascript;base64,${Buffer.from(
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
        )})`
      )
      .replace(
        "import { createRemoteBridgeAuditRecord } from './remote-bridge-audit'",
        `const { createRemoteBridgeAuditRecord } = await import(${JSON.stringify(auditModuleUrl)})`
      ),
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        strict: true
      },
      fileName: bridgePath
    }
  ).outputText,
  'utf8'
).toString('base64')}`
const { FeishuRemoteWorkBridge, parseFeishuRemoteInput } = await import(bridgeModuleUrl)
const { normalizeRemoteBridgeSettings } = settingsModule
const { MemoryRemoteBridgeAuditSink } = await import(auditModuleUrl)

class FakeFeishuClient {
  constructor(messages) {
    this.messages = messages
    this.fetchCount = 0
  }

  async fetchMessages() {
    this.fetchCount += 1
    return this.messages
  }
}

function message(overrides) {
  return {
    messageId: 'message-1',
    chatId: 'chat-a',
    userId: 'user-a',
    text: '/status',
    senderId: 'user-a',
    timestamp: '2026-05-06T08:00:00.000Z',
    ...overrides
  }
}

const disabledClient = new FakeFeishuClient([message({})])
const disabledBridge = new FeishuRemoteWorkBridge(normalizeRemoteBridgeSettings(undefined), disabledClient)
const disabledResults = await disabledBridge.pollOnce()
assert(disabledResults.length === 1, 'Disabled bridge should return one disabled result.')
assert(disabledResults[0].status === 'disabled', 'Bridge should not poll Feishu while disabled or invalid.')
assert(disabledClient.fetchCount === 0, 'Disabled bridge must not fetch Feishu messages.')

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
const client = new FakeFeishuClient([
  message({ messageId: 'm-unauthorized-chat', chatId: 'chat-z', text: '/tail' }),
  message({ messageId: 'm-unauthorized-user', userId: 'user-z', text: 'hello' }),
  message({ messageId: 'm-bot-flag', isFromBot: true, text: '/status' }),
  message({ messageId: 'm-bot-id', senderId: 'bot-user', text: '/status' }),
  message({ messageId: 'm-status', text: '/status' }),
  message({ messageId: 'm-tail', text: '/tail 200' }),
  message({ messageId: 'm-start', text: '/start' }),
  message({ messageId: 'm-stop', text: '/stop' }),
  message({ messageId: 'm-lock', text: '/lock' }),
  message({ messageId: 'm-unlock', text: '/unlock' }),
  message({ messageId: 'm-text', text: 'continue the current task' }),
  message({ messageId: 'm-unknown', text: '/panel codex-cli' }),
  message({ messageId: 'm-empty', text: '   ' }),
  message({ messageId: 'm-status', text: '/status' })
])
const auditSink = new MemoryRemoteBridgeAuditSink()
const bridge = new FeishuRemoteWorkBridge(settings, client, {
  botUserId: 'bot-user',
  availablePanelIds: ['codex-cli'],
  auditSink
})
const results = await bridge.pollOnce()
const statuses = results.map((result) => result.status)
assert(client.fetchCount === 1, 'Enabled bridge should fetch Feishu messages once per poll.')
assert(statuses.includes('unauthorized-chat'), 'Bridge should reject messages from unauthorized chats.')
assert(statuses.includes('unauthorized-user'), 'Bridge should reject messages from unauthorized users.')
assert(statuses.filter((status) => status === 'bot-self').length === 2, 'Bridge should ignore bot-authored messages.')
assert(statuses.includes('duplicate'), 'Bridge should suppress duplicate message ids.')
assert(statuses.includes('unknown-command'), 'Bridge should report unsupported slash commands.')
assert(statuses.includes('empty'), 'Bridge should ignore empty messages.')

const accepted = results.filter((result) => result.status === 'accepted')
const acceptedCommands = accepted
  .map((result) => result.parsed)
  .filter((parsed) => parsed?.kind === 'command')
  .map((parsed) => parsed.command)
assert(
  JSON.stringify(acceptedCommands) === JSON.stringify(['status', 'tail', 'start', 'stop', 'lock', 'unlock']),
  `Bridge should parse all supported commands before routing: ${JSON.stringify(acceptedCommands)}`
)
const textInput = accepted.map((result) => result.parsed).find((parsed) => parsed?.kind === 'text')
assert(textInput?.text === 'continue the current task', 'Bridge should parse normal text input.')
assert(auditSink.records.some((record) => record.result === 'rejected' && record.command === 'unauthorized-chat'), 'Unauthorized chat should be audited without terminal content.')
assert(auditSink.records.some((record) => record.result === 'rejected' && record.command === 'unauthorized-user'), 'Unauthorized user should be audited without terminal content.')

const parsedTail = parseFeishuRemoteInput('/tail 300')
assert(parsedTail?.kind === 'command' && parsedTail.command === 'tail', 'Parser should recognize /tail.')
assert(JSON.stringify(parsedTail.args) === JSON.stringify(['300']), 'Parser should preserve command arguments.')
assert(parseFeishuRemoteInput('/unknown') === null, 'Parser should reject unknown slash commands.')

console.log(
  JSON.stringify({
    disabledFetchCount: disabledClient.fetchCount,
    fetchedMessages: client.fetchCount,
    acceptedCommands,
    textInput: textInput?.text,
    duplicateCount: statuses.filter((status) => status === 'duplicate').length,
    botSelfCount: statuses.filter((status) => status === 'bot-self').length,
    auditRecords: auditSink.records.length
  })
)
