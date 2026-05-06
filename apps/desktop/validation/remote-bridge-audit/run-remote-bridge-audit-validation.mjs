import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const auditPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-bridge-audit.ts')
const settingsPath = join(repoRoot, 'packages', 'core', 'src', 'desktop', 'settings.ts')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function importTranspiled(path) {
  const source = readFileSync(path, 'utf8')
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

const {
  JsonlRemoteBridgeAuditSink,
  MemoryRemoteBridgeAuditSink,
  createRemoteBridgeAuditRecord,
  createRemoteBridgeDiagnostics,
  summarizeRemoteBridgeAudit
} = await importTranspiled(auditPath)
const { normalizeRemoteBridgeSettings } = await importTranspiled(settingsPath)

const memorySink = new MemoryRemoteBridgeAuditSink()
memorySink.record(
  createRemoteBridgeAuditRecord({
    timestamp: '2026-05-06T08:00:00.000Z',
    action: 'input',
    result: 'accepted',
    actorUserId: 'user-a',
    chatId: 'chat-a',
    targetPanelId: 'codex-cli',
    command: null,
    reason: null,
    inputLength: 17
  })
)
memorySink.record(
  createRemoteBridgeAuditRecord({
    timestamp: '2026-05-06T08:01:00.000Z',
    action: 'command',
    result: 'succeeded',
    actorUserId: 'user-a',
    chatId: 'chat-a',
    targetPanelId: 'codex-cli',
    command: 'stop',
    reason: null,
    inputLength: null
  })
)
memorySink.record(
  createRemoteBridgeAuditRecord({
    timestamp: '2026-05-06T08:02:00.000Z',
    action: 'rejected',
    result: 'rejected',
    actorUserId: 'user-b',
    chatId: 'chat-z',
    targetPanelId: null,
    command: 'unauthorized-chat',
    reason: 'Feishu chat is not allowlisted.',
    inputLength: null
  })
)

const summary = memorySink.readSummary()
assert(summary.recordCount === 3, 'Audit summary should count all records.')
assert(summary.acceptedInputCount === 1, 'Audit summary should count accepted remote input.')
assert(summary.commandCount === 1, 'Audit summary should count command records.')
assert(summary.rejectedCount === 1, 'Audit summary should count rejected actions.')
assert(summary.latestRecord?.command === 'unauthorized-chat', 'Audit summary should expose the latest record.')

const tempDir = mkdtempSync(join(tmpdir(), 'deepwork-remote-audit-'))
try {
  const auditFile = join(tempDir, 'remote-bridge.jsonl')
  const fileSink = new JsonlRemoteBridgeAuditSink(auditFile)
  for (const record of memorySink.records) {
    fileSink.record(record)
  }
  const fileSummary = fileSink.readSummary()
  assert(fileSummary.recordCount === 3, 'JSONL audit sink should persist readable audit records.')
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}

const settings = normalizeRemoteBridgeSettings({
  enabled: true,
  credentials: { appId: 'cli_valid', appSecret: 'secret' },
  allowedChatIds: ['chat-a'],
  allowedUserIds: ['user-a'],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'codex-cli'
})
const diagnostics = createRemoteBridgeDiagnostics({
  settings,
  ready: true,
  status: {
    mode: 'pty',
    panelId: 'codex-cli',
    title: 'Codex CLI',
    remoteCapable: true,
    status: 'running',
    hasSession: true,
    isRunning: true,
    pid: 4101,
    cwd: 'E:\\workspace',
    bufferSize: 100,
    launchCount: 2,
    lastOutputAt: '2026-05-06T08:03:00.000Z',
    lock: null
  },
  auditSummary: summarizeRemoteBridgeAudit(memorySink.records)
})
assert(diagnostics.enabled === true && diagnostics.ready === true, 'Diagnostics should surface bridge enablement and readiness.')
assert(diagnostics.status?.panelId === 'codex-cli', 'Diagnostics should surface selected remote status.')
assert(diagnostics.audit.rejectedCount === 1, 'Diagnostics should include audit summary.')
assert(diagnostics.allowedChatCount === 1 && diagnostics.allowedUserCount === 1, 'Diagnostics should include allowlist counts without leaking values.')

console.log(
  JSON.stringify({
    recordCount: summary.recordCount,
    acceptedInputCount: summary.acceptedInputCount,
    commandCount: summary.commandCount,
    rejectedCount: summary.rejectedCount,
    diagnosticsReady: diagnostics.ready,
    diagnosticsPanel: diagnostics.status?.panelId
  })
)
