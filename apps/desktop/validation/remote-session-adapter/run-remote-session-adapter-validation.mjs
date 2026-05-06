import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const adapterPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-session-adapter.ts')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function importAdapterModule() {
  const source = readFileSync(adapterPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: adapterPath
  })
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`

  return import(moduleUrl)
}

function createSnapshot(overrides = {}) {
  return {
    panelId: 'codex-cli',
    title: 'Codex CLI',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo'],
    cwd: 'E:\\workspace',
    startupCommand: 'codex',
    status: 'running',
    hasSession: true,
    isRunning: true,
    launchCount: 3,
    pid: 4101,
    cols: 120,
    rows: 32,
    bufferSize: 42,
    logPath: 'E:\\logs\\codex-cli.log',
    lastExitCode: null,
    lastExitSignal: null,
    lastError: null,
    contextLabel: 'session-0003',
    sessionScopeId: 'codex-cli__session-0003',
    threadId: 'thread-remote',
    threadTitle: 'Remote Session',
    continuitySummary: null,
    retrievalSummary: null,
    lastOutputAt: '2026-05-06T08:30:00.000Z',
    ...overrides
  }
}

class FakeTerminalHost {
  constructor(snapshot = createSnapshot(), buffer = 'first output\r\nsecond output\r\n') {
    this.snapshot = snapshot
    this.buffer = buffer
    this.startCalls = 0
    this.writes = []
    this.outputListeners = new Set()
    this.lastLocalInputAt = null
  }

  attach(panelId) {
    return panelId === this.snapshot.panelId ? { snapshot: this.snapshot, buffer: this.buffer } : null
  }

  getSnapshot(panelId) {
    return panelId === this.snapshot.panelId ? this.snapshot : null
  }

  getLastLocalInputAt(panelId) {
    return panelId === this.snapshot.panelId ? this.lastLocalInputAt : null
  }

  start(panelId) {
    this.startCalls += 1
    if (panelId !== this.snapshot.panelId) {
      return null
    }

    this.snapshot = createSnapshot({
      status: 'running',
      hasSession: true,
      isRunning: true,
      launchCount: this.snapshot.launchCount + 1,
      pid: 5200 + this.startCalls
    })
    return this.snapshot
  }

  write(panelId, data, source = 'local') {
    this.writes.push({ panelId, data, source })
  }

  subscribeOutput(listener) {
    this.outputListeners.add(listener)
    return () => {
      this.outputListeners.delete(listener)
    }
  }

  emitOutput(event) {
    for (const listener of this.outputListeners) {
      listener(event)
    }
  }
}

const { PtyRemoteSessionAdapter, createRemotePtySubmitSequence } = await importAdapterModule()
assert(
  createRemotePtySubmitSequence('hello') === '\x1b[200~hello\x1b[201~\r',
  'Remote PTY submit should mimic bracketed paste followed by Enter.'
)
assert(
  createRemotePtySubmitSequence('\x1b[200~hello\x1b[201~') === '\x1b[200~hello\x1b[201~\r',
  'Remote PTY submit should strip nested bracketed-paste markers from Feishu text.'
)

const runningHost = new FakeTerminalHost()
const runningAdapter = new PtyRemoteSessionAdapter(runningHost, ['codex-cli'])
const runningStatus = runningAdapter.ensureSession('codex-cli')
assert(runningStatus?.isRunning === true, 'Running PTY status should be returned.')
assert(runningStatus.lastOutputAt === '2026-05-06T08:30:00.000Z', 'PTY status should include last output timestamp.')
assert(runningHost.startCalls === 0, 'ensureSession must attach to an existing running PTY instead of starting a duplicate.')

const writeResult = runningAdapter.writeLine('codex-cli', 'continue from Feishu', {
  userId: 'user-a',
  chatId: 'chat-a'
})
assert(writeResult.accepted === true, 'Remote write should be accepted for a running remote-capable PTY.')
assert(runningHost.startCalls === 0, 'Remote write must not spawn a duplicate CLI process.')
assert(runningHost.writes.length === 1, 'Remote write should issue one atomic terminal submit sequence.')
assert(
  runningHost.writes[0].data === '\x1b[200~continue from Feishu\x1b[201~\r',
  'Remote write should paste the text payload and submit with carriage return.'
)

const controlResult = runningAdapter.sendControl('codex-cli', 'interrupt', {
  userId: 'user-a',
  chatId: 'chat-a'
})
assert(controlResult.issued === true, 'Remote interrupt should be issued for a running PTY.')
assert(runningHost.writes.at(-1).data === '\u0003', 'Remote interrupt should write Ctrl+C to the existing PTY.')

const tailResult = runningAdapter.tail('codex-cli', { maxCharacters: 15 })
assert(tailResult?.content === 'second output\r\n', 'Remote tail should return the bounded buffer tail.')
assert(tailResult.truncated === true, 'Remote tail should report truncation when the buffer is longer than the limit.')

const outputEvents = []
const unsubscribe = runningAdapter.subscribeOutput('codex-cli', (event) => outputEvents.push(event))
runningHost.emitOutput({ panelId: 'claude-code', data: 'ignored' })
runningHost.emitOutput({ panelId: 'codex-cli', data: 'remote output' })
unsubscribe()
runningHost.emitOutput({ panelId: 'codex-cli', data: 'after unsubscribe' })
assert(outputEvents.length === 1, 'Remote output subscription should filter by selected panel and unsubscribe cleanly.')
assert(outputEvents[0].data === 'remote output', 'Remote output subscription should forward selected panel output.')

const idleHost = new FakeTerminalHost(
  createSnapshot({
    status: 'idle',
    hasSession: false,
    isRunning: false,
    launchCount: 0,
    pid: null,
    bufferSize: 0,
    lastOutputAt: null
  }),
  ''
)
const idleAdapter = new PtyRemoteSessionAdapter(idleHost, ['codex-cli'])
const startedStatus = idleAdapter.ensureSession('codex-cli')
assert(startedStatus?.isRunning === true, 'ensureSession should start an idle remote-capable PTY through the managed lifecycle.')
assert(idleHost.startCalls === 1, 'ensureSession should call the managed start flow exactly once for an idle PTY.')

const unavailableResult = runningAdapter.writeLine('claude-code', 'hello', {
  userId: 'user-a',
  chatId: 'chat-a'
})
assert(unavailableResult.accepted === false, 'Non-selected panels should reject remote writes.')

const actorA = { userId: 'user-a', chatId: 'chat-a' }
const actorB = { userId: 'user-b', chatId: 'chat-a' }
const adminActor = { userId: 'admin-a', chatId: 'chat-a' }
let nowMs = Date.parse('2026-05-06T08:00:00.000Z')
const lockingHost = new FakeTerminalHost()
const lockingAdapter = new PtyRemoteSessionAdapter(lockingHost, ['codex-cli'], {
  lockTimeoutMs: 1000,
  localActivityBlockMs: 1000,
  adminUserIds: ['admin-a'],
  now: () => new Date(nowMs)
})
const lockResult = lockingAdapter.acquireLock('codex-cli', actorA)
assert(lockResult.ok === true, 'Lock owner should acquire the remote lock.')
assert(lockResult.lock?.ownerUserId === actorA.userId, 'Remote lock should record owner user.')
assert(lockResult.lock?.chatId === actorA.chatId, 'Remote lock should record chat id.')

const nonOwnerWrite = lockingAdapter.writeLine('codex-cli', 'non-owner input', actorB)
assert(nonOwnerWrite.accepted === false, 'Non-owner remote text should be rejected while the lock is active.')
const nonOwnerUnlock = lockingAdapter.releaseLock('codex-cli', actorB)
assert(nonOwnerUnlock.ok === false, 'Non-owner unlock should be rejected.')
const adminUnlock = lockingAdapter.releaseLock('codex-cli', adminActor)
assert(adminUnlock.ok === true, 'Administrator should be able to release a remote lock.')

lockingAdapter.acquireLock('codex-cli', actorA)
nowMs += 1200
const expiredLockWrite = lockingAdapter.writeLine('codex-cli', 'after expiry', actorB)
assert(expiredLockWrite.accepted === true, 'Expired remote lock should not block later input.')

lockingHost.lastLocalInputAt = new Date(nowMs).toISOString()
const localActivityRejected = lockingAdapter.writeLine('codex-cli', 'during local typing', actorA)
assert(localActivityRejected.accepted === false, 'Recent local terminal input should reject remote normal text.')

const lockOwnerLocalActivityRejected = lockingAdapter.acquireLock('codex-cli', actorA)
assert(lockOwnerLocalActivityRejected.ok === true, 'Lock owner should be able to reacquire the remote lock after expiry.')
const lockOwnerBlocked = lockingAdapter.writeLine('codex-cli', 'owner during local typing', actorA)
assert(lockOwnerBlocked.accepted === false, 'Default policy should still block the lock owner during local activity.')

const lockOwnerAllowedHost = new FakeTerminalHost()
lockOwnerAllowedHost.lastLocalInputAt = new Date(nowMs).toISOString()
const lockOwnerAllowedAdapter = new PtyRemoteSessionAdapter(lockOwnerAllowedHost, ['codex-cli'], {
  lockTimeoutMs: 1000,
  localActivityBlockMs: 1000,
  allowLockOwnerDuringLocalActivity: true,
  now: () => new Date(nowMs)
})
lockOwnerAllowedAdapter.acquireLock('codex-cli', actorA)
const lockOwnerAllowed = lockOwnerAllowedAdapter.writeLine('codex-cli', 'owner allowed', actorA)
assert(lockOwnerAllowed.accepted === true, 'Policy should allow lock owner input during local activity when configured.')

console.log(
  JSON.stringify({
    runningStartCalls: runningHost.startCalls,
    writeCount: runningHost.writes.length,
    tailTruncated: tailResult.truncated,
    outputEvents: outputEvents.length,
    idleStartCalls: idleHost.startCalls,
    unavailableAccepted: unavailableResult.accepted,
    nonOwnerWriteAccepted: nonOwnerWrite.accepted,
    localActivityAccepted: localActivityRejected.accepted,
    lockOwnerAllowed: lockOwnerAllowed.accepted
  })
)
