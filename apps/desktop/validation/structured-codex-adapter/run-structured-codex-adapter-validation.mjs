import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')
const prototypePath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'codex-app-server', 'prototype-client.ts')
const structuredAdapterPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'codex-app-server', 'structured-adapter.ts')

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

class FakeThreadStore {
  constructor() {
    this.threads = new Map()
  }

  getThreadId(targetId) {
    return this.threads.get(targetId) ?? null
  }

  setThreadId(targetId, threadId) {
    this.threads.set(targetId, threadId)
  }
}

class FakeTransport {
  constructor() {
    this.requests = []
    this.events = [
      { method: 'tool/progress', params: { text: 'running shell command' } },
      { method: 'agent_message/completed', params: { text: 'final assistant answer' } },
      { method: 'turn/completed', params: { threadId: 'thread-structured', turnId: 'turn-1' } }
    ]
  }

  async request(method, params) {
    this.requests.push({ method, params })
    switch (method) {
      case 'initialize':
        assert(params.capabilities?.experimentalApi === true, 'Initialize should opt into experimental app-server fields.')
        return { ok: true }
      case 'thread/start':
        return { threadId: 'thread-structured' }
      case 'turn/start':
        return { turnId: 'turn-1' }
      case 'turn/steer':
        return { steered: true }
      case 'turn/interrupt':
        return { interrupted: true }
      default:
        throw new Error(`Unexpected method: ${method}`)
    }
  }

  async readEvent() {
    return this.events.shift() ?? null
  }
}

const { normalizeRemoteBridgeSettings } = await importTranspiled(settingsPath)
const prototypeModuleUrl = `data:text/javascript;base64,${Buffer.from(
  ts.transpileModule(readFileSync(prototypePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: prototypePath
  }).outputText,
  'utf8'
).toString('base64')}`
const {
  StructuredCodexRemoteSessionAdapter,
  createStructuredCodexAdapterIfEnabled,
  translateCodexAppServerEvent
} = await importTranspiled(structuredAdapterPath, [
  [
    "import { CodexAppServerPrototypeClient } from './prototype-client'",
    `const { CodexAppServerPrototypeClient } = await import(${JSON.stringify(prototypeModuleUrl)})`
  ]
])

const ptySettings = normalizeRemoteBridgeSettings({
  enabled: true,
  targetMode: 'pty',
  credentials: { appId: 'cli_valid', appSecret: 'secret' },
  allowedChatIds: ['chat-a'],
  allowedUserIds: ['user-a'],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'codex-cli'
})
assert(
  createStructuredCodexAdapterIfEnabled({
    settings: ptySettings,
    transport: new FakeTransport(),
    threadStore: new FakeThreadStore()
  }) === null,
  'Structured Codex adapter should not be created for PTY target mode.'
)

const settings = normalizeRemoteBridgeSettings({
  enabled: true,
  targetMode: 'codex-app-server',
  credentials: { appId: 'cli_valid', appSecret: 'secret' },
  allowedChatIds: ['chat-a'],
  allowedUserIds: ['user-a'],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'codex-cli'
})
const transport = new FakeTransport()
const threadStore = new FakeThreadStore()
const adapter = createStructuredCodexAdapterIfEnabled({
  settings,
  transport,
  threadStore,
  options: {
    cwd: 'E:\\workspace',
    title: 'Structured Codex'
  }
})
assert(adapter instanceof StructuredCodexRemoteSessionAdapter, 'Structured adapter should be created only for codex-app-server mode.')

const outputEvents = []
adapter.subscribeOutput('codex-cli', (event) => outputEvents.push(event))
const firstWrite = adapter.writeLine('codex-cli', 'start a structured turn', { userId: 'user-a', chatId: 'chat-a' })
assert(firstWrite.accepted === true, 'Structured normal text should be accepted when enabled.')
await new Promise((resolve) => setTimeout(resolve, 0))
assert(
  JSON.stringify(transport.requests.map((request) => request.method)) ===
    JSON.stringify(['initialize', 'thread/start', 'turn/start']),
  'First structured input should initialize, start a thread, and start a turn.'
)
assert(threadStore.getThreadId('codex-cli') === 'thread-structured', 'Structured adapter should associate thread identity with the target.')

const secondWrite = adapter.writeLine('codex-cli', 'steer active turn', { userId: 'user-a', chatId: 'chat-a' })
await new Promise((resolve) => setTimeout(resolve, 0))
assert(secondWrite.accepted === true, 'Structured steering text should be accepted.')
assert(
  transport.requests.some((request) => request.method === 'turn/steer'),
  'Active steerable structured turn should map normal text to turn/steer.'
)

const stop = adapter.sendControl('codex-cli', 'interrupt', { userId: 'user-a', chatId: 'chat-a' })
assert(stop.issued === true, 'Structured /stop should map to turn/interrupt when a turn is active.')
await new Promise((resolve) => setTimeout(resolve, 0))
assert(
  transport.requests.some((request) => request.method === 'turn/interrupt'),
  'Structured /stop should call turn/interrupt.'
)

const toolMessage = await adapter.pumpEvent()
const finalMessage = await adapter.pumpEvent()
const completedMessage = await adapter.pumpEvent()
assert(toolMessage?.kind === 'tool' && toolMessage.text === 'running shell command', 'Tool progress should translate to a tool message.')
assert(finalMessage?.kind === 'final' && finalMessage.text === 'final assistant answer', 'Completed agent messages should translate to final output.')
assert(completedMessage?.kind === 'status', 'Turn completion should translate to a status message.')
assert(outputEvents.some((event) => event.data === 'final assistant answer'), 'Translated structured events should publish output.')
assert(adapter.getStatus('codex-cli')?.mode === 'codex-app-server', 'Structured status should report codex-app-server mode.')

const tail = adapter.tail('codex-cli', { maxCharacters: 12 })
assert(tail?.truncated === true, 'Structured adapter should expose bounded output tail.')
assert(translateCodexAppServerEvent({ method: 'error', params: { message: 'boom' } })?.kind === 'error', 'Error events should translate to error messages.')

console.log(
  JSON.stringify({
    requestMethods: transport.requests.map((request) => request.method),
    threadId: threadStore.getThreadId('codex-cli'),
    outputEvents: outputEvents.length,
    tailTruncated: tail.truncated,
    mode: adapter.getStatus('codex-cli')?.mode
  })
)
