import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const routerPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-work-command-router.ts')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')
const auditPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-bridge-audit.ts')

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

const { normalizeRemoteBridgeSettings } = await importTranspiled(settingsPath)
const auditModule = await importTranspiled(auditPath)
const auditModuleUrl = `data:text/javascript;base64,${Buffer.from(
  ts.transpileModule(readFileSync(auditPath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: auditPath
  }).outputText,
  'utf8'
).toString('base64')}`
const { MemoryRemoteBridgeAuditSink } = auditModule
const { RemoteWorkCommandRouter, formatRemoteStatus } = await importTranspiled(routerPath, [
  [
    "import { createRemoteBridgeAuditRecord } from './remote-bridge-audit'",
    `const { createRemoteBridgeAuditRecord } = await import(${JSON.stringify(auditModuleUrl)})`
  ]
])

function status(overrides = {}) {
  return {
    mode: 'pty',
    panelId: 'codex-cli',
    title: 'Codex CLI',
    remoteCapable: true,
    status: 'running',
    hasSession: true,
    isRunning: true,
    pid: 4101,
    cwd: 'E:\\workspace',
    bufferSize: 120,
    launchCount: 2,
    lastOutputAt: '2026-05-06T08:40:00.000Z',
    lock: null,
    ...overrides
  }
}

class FakeRemoteSessionAdapter {
  constructor() {
    this.calls = []
    this.currentStatus = status()
    this.tailContent = 'line one\r\nline two\r\nline three\r\n'
    this.writeAccepted = true
  }

  ensureSession(panelId) {
    this.calls.push({ method: 'ensureSession', panelId })
    this.currentStatus = status({ launchCount: this.currentStatus.launchCount + 1 })
    return this.currentStatus
  }

  getStatus(panelId) {
    this.calls.push({ method: 'getStatus', panelId })
    return this.currentStatus
  }

  writeLine(panelId, text, actor) {
    this.calls.push({ method: 'writeLine', panelId, text, actor })
    return {
      accepted: this.writeAccepted,
      status: this.currentStatus,
      error: this.writeAccepted ? null : 'write rejected',
      inputLength: text.length
    }
  }

  sendControl(panelId, action, actor) {
    this.calls.push({ method: 'sendControl', panelId, action, actor })
    return {
      issued: true,
      status: this.currentStatus,
      error: null
    }
  }

  acquireLock(panelId, actor) {
    this.calls.push({ method: 'acquireLock', panelId, actor })
    this.currentStatus = status({
      lock: {
        ownerUserId: actor.userId,
        chatId: actor.chatId,
        acquiredAt: '2026-05-06T08:41:00.000Z',
        expiresAt: '2026-05-06T08:56:00.000Z'
      }
    })
    return {
      ok: true,
      status: this.currentStatus,
      lock: this.currentStatus.lock,
      error: null
    }
  }

  releaseLock(panelId, actor) {
    this.calls.push({ method: 'releaseLock', panelId, actor })
    this.currentStatus = status({ lock: null })
    return {
      ok: true,
      status: this.currentStatus,
      lock: null,
      error: null
    }
  }

  tail(panelId, options) {
    this.calls.push({ method: 'tail', panelId, options })
    const truncated = this.tailContent.length > options.maxCharacters
    return {
      panelId,
      content: truncated ? this.tailContent.slice(this.tailContent.length - options.maxCharacters) : this.tailContent,
      truncated
    }
  }

  subscribeOutput() {
    return () => {}
  }
}

function command(command, args = []) {
  return {
    kind: 'command',
    command,
    args,
    rawText: `/${command}${args.length ? ` ${args.join(' ')}` : ''}`
  }
}

const message = {
  messageId: 'm-1',
  chatId: 'chat-a',
  userId: 'user-a',
  text: '',
  senderId: 'user-a'
}
const settings = normalizeRemoteBridgeSettings({
  enabled: true,
  credentials: { appId: 'cli_valid', appSecret: 'secret' },
  allowedChatIds: ['chat-a'],
  allowedUserIds: ['user-a'],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'codex-cli',
  output: {
    maxTailCharacters: 10
  }
})
const adapter = new FakeRemoteSessionAdapter()
const auditSink = new MemoryRemoteBridgeAuditSink()
const router = new RemoteWorkCommandRouter(settings, adapter, auditSink)

const statusResponse = router.route(command('status'), message)
assert(statusResponse.ok === true, '/status should succeed.')
assert(statusResponse.response.includes('Codex CLI'), '/status should include the target panel.')
assert(statusResponse.response.includes('Last output: 2026-05-06T08:40:00.000Z'), '/status should include last output time.')

const startResponse = router.route(command('start'), message)
assert(startResponse.ok === true, '/start should call ensureSession.')
assert(adapter.calls.some((call) => call.method === 'ensureSession'), '/start should use the managed start/attach flow.')

const tailResponse = router.route(command('tail', ['5']), message)
assert(tailResponse.ok === true, '/tail should succeed.')
assert(tailResponse.response.startsWith('[Output truncated]'), '/tail should include a truncation notice when bounded.')
assert(adapter.calls.find((call) => call.method === 'tail')?.options.maxCharacters === 5, '/tail should honor a bounded numeric argument.')

const stopResponse = router.route(command('stop'), message)
assert(stopResponse.ok === true, '/stop should issue an interrupt.')
assert(
  adapter.calls.some((call) => call.method === 'sendControl' && call.action === 'interrupt'),
  '/stop should map to the adapter interrupt action.'
)

const lockResponse = router.route(command('lock'), message)
assert(lockResponse.ok === true, '/lock should acquire the adapter lock.')
assert(lockResponse.response.includes('Remote lock acquired'), '/lock should return an acquisition response.')
const unlockResponse = router.route(command('unlock'), message)
assert(unlockResponse.ok === true, '/unlock should release the adapter lock.')

const textResponse = router.route(
  {
    kind: 'text',
    text: 'continue implementation',
    rawText: 'continue implementation'
  },
  message
)
assert(textResponse.ok === true, 'Normal text should route to writeLine.')
const writeCall = adapter.calls.find((call) => call.method === 'writeLine')
assert(writeCall?.text === 'continue implementation', 'Normal text should preserve input without appending a newline in the router.')
assert(writeCall.actor.userId === 'user-a' && writeCall.actor.chatId === 'chat-a', 'Normal text should pass actor metadata.')

adapter.writeAccepted = false
const rejectedTextResponse = router.route(
  {
    kind: 'text',
    text: 'blocked input',
    rawText: 'blocked input'
  },
  message
)
assert(rejectedTextResponse.ok === false, 'Rejected adapter writes should produce a failed route result.')
assert(rejectedTextResponse.response === 'write rejected', 'Rejected adapter writes should preserve adapter error text.')
assert(auditSink.records.some((record) => record.action === 'input' && record.result === 'accepted'), 'Accepted input should be audited.')
assert(auditSink.records.some((record) => record.action === 'input' && record.result === 'rejected'), 'Rejected input should be audited.')
assert(auditSink.records.some((record) => record.action === 'command' && record.command === 'stop'), 'Control commands should be audited.')

assert(formatRemoteStatus(null) === 'Remote session is unavailable.', 'Status formatter should handle missing sessions.')

console.log(
  JSON.stringify({
    calls: adapter.calls.map((call) => call.method),
    statusOk: statusResponse.ok,
    startOk: startResponse.ok,
    tailResponse: tailResponse.response,
    stopOk: stopResponse.ok,
    textOk: textResponse.ok,
    rejectedTextOk: rejectedTextResponse.ok,
    auditRecords: auditSink.records.length
  })
)
