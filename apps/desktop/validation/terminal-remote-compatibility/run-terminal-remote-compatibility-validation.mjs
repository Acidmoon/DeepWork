import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const adapterPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-session-adapter.ts')
const terminalManagerPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'terminal-manager.ts')

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

function snapshot(overrides = {}) {
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
    launchCount: 1,
    pid: 4101,
    cols: 120,
    rows: 32,
    bufferSize: 20,
    logPath: 'E:\\logs\\codex-cli.log',
    lastExitCode: null,
    lastExitSignal: null,
    lastError: null,
    contextLabel: 'session-0001',
    sessionScopeId: 'codex-cli__session-0001',
    threadId: 'thread-codex',
    threadTitle: 'Codex Work',
    continuitySummary: null,
    retrievalSummary: null,
    lastOutputAt: '2026-05-06T09:00:00.000Z',
    ...overrides
  }
}

class CompatibleTerminalHost {
  constructor() {
    this.snapshots = {
      'codex-cli': snapshot(),
      'claude-code': snapshot({
        panelId: 'claude-code',
        title: 'Claude Code',
        startupCommand: 'claude',
        status: 'idle',
        hasSession: false,
        isRunning: false,
        launchCount: 0,
        pid: null,
        bufferSize: 0,
        lastOutputAt: null
      })
    }
    this.buffers = {
      'codex-cli': 'initial codex output\r\n',
      'claude-code': ''
    }
    this.localCalls = []
    this.remoteOutputListeners = new Set()
    this.activePanelId = 'codex-cli'
    this.lastLocalInputAt = null
  }

  attach(panelId) {
    this.localCalls.push({ method: 'attach', panelId })
    const current = this.snapshots[panelId]
    return current ? { snapshot: current, buffer: this.buffers[panelId] ?? '' } : null
  }

  getSnapshot(panelId) {
    this.localCalls.push({ method: 'getSnapshot', panelId })
    return this.snapshots[panelId] ?? null
  }

  start(panelId) {
    this.localCalls.push({ method: 'start', panelId })
    const current = this.snapshots[panelId]
    if (!current) {
      return null
    }
    this.snapshots[panelId] = {
      ...current,
      status: 'running',
      hasSession: true,
      isRunning: true,
      launchCount: current.launchCount + 1,
      pid: 5000 + current.launchCount
    }
    return this.snapshots[panelId]
  }

  restart(panelId) {
    this.localCalls.push({ method: 'restart', panelId })
    return this.start(panelId)
  }

  write(panelId, data, source = 'local') {
    this.localCalls.push({ method: 'write', panelId, data, source })
    if (source === 'local') {
      this.lastLocalInputAt = '2026-05-06T09:01:00.000Z'
    }
    this.buffers[panelId] = `${this.buffers[panelId] ?? ''}${data}`
  }

  resize(panelId, size) {
    this.localCalls.push({ method: 'resize', panelId, size })
    const current = this.snapshots[panelId]
    if (current) {
      this.snapshots[panelId] = { ...current, cols: size.cols, rows: size.rows }
    }
  }

  clearBuffer(panelId) {
    this.localCalls.push({ method: 'clearBuffer', panelId })
    const current = this.snapshots[panelId]
    if (!current) {
      return null
    }
    this.buffers[panelId] = ''
    this.snapshots[panelId] = { ...current, bufferSize: 0 }
    return { snapshot: this.snapshots[panelId], buffer: '' }
  }

  getLastLocalInputAt(panelId) {
    return panelId === 'codex-cli' ? this.lastLocalInputAt : null
  }

  subscribeOutput(listener) {
    this.remoteOutputListeners.add(listener)
    return () => this.remoteOutputListeners.delete(listener)
  }

  switchPanel(panelId) {
    this.activePanelId = panelId
  }

  emitOutput(panelId, data) {
    this.buffers[panelId] = `${this.buffers[panelId] ?? ''}${data}`
    for (const listener of this.remoteOutputListeners) {
      listener({ panelId, data })
    }
  }
}

const { PtyRemoteSessionAdapter } = await importTranspiled(adapterPath)
const host = new CompatibleTerminalHost()
const remoteAdapter = new PtyRemoteSessionAdapter(host, ['codex-cli'], {
  localActivityBlockMs: 0
})

const attachPayload = host.attach('codex-cli')
assert(attachPayload?.buffer.includes('initial codex output'), 'Local attach should still return the existing terminal buffer.')
const startSnapshot = host.start('claude-code')
assert(startSnapshot?.isRunning === true, 'Local start should still work while the remote adapter exists.')
const restartSnapshot = host.restart('claude-code')
assert(restartSnapshot?.launchCount === 2, 'Local restart should still relaunch the local terminal session.')
host.write('codex-cli', 'local input\r', 'local')
assert(host.getLastLocalInputAt('codex-cli') === '2026-05-06T09:01:00.000Z', 'Local writes should still update local activity.')
host.resize('codex-cli', { cols: 100, rows: 28 })
assert(host.snapshots['codex-cli'].cols === 100 && host.snapshots['codex-cli'].rows === 28, 'Local resize should still update terminal dimensions.')
const clearPayload = host.clearBuffer('codex-cli')
assert(clearPayload?.buffer === '', 'Local clear should still clear the local terminal buffer.')

const remoteOutputs = []
remoteAdapter.subscribeOutput('codex-cli', (event) => remoteOutputs.push(event))
host.switchPanel('claude-code')
host.emitOutput('codex-cli', 'remote-visible output\r\n')
host.emitOutput('claude-code', 'ignored output\r\n')
assert(remoteOutputs.length === 1, 'Remote output subscription should survive renderer panel switches and filter selected panel output.')
assert(remoteOutputs[0].data === 'remote-visible output\r\n', 'Remote subscription should receive selected PTY output.')

const remoteWrite = remoteAdapter.writeLine('codex-cli', 'remote input', {
  userId: 'user-a',
  chatId: 'chat-a'
})
assert(remoteWrite.accepted === true, 'Remote write should still target the existing session.')
const remoteWriteCalls = host.localCalls.filter((call) => call.method === 'write' && call.source === 'remote')
assert(
  remoteWriteCalls.at(-1)?.data === '\x1b[200~remote input\x1b[201~\r',
  'Remote write should paste the text payload and append Enter only in the adapter layer.'
)

const terminalManagerSource = readFileSync(terminalManagerPath, 'utf8')
assert(
  terminalManagerSource.includes("write(panelId: string, data: string, source: 'local' | 'remote' = 'local')"),
  'TerminalManager.write should distinguish local and remote sources.'
)
assert(
  terminalManagerSource.includes("if (source === 'local') {\n        session.lastLocalInputAt = new Date().toISOString()\n      }"),
  'Only local writes should update local activity timestamps.'
)
assert(
  terminalManagerSource.includes('session.hasMeaningfulUserInput = true') &&
    terminalManagerSource.indexOf('session.hasMeaningfulUserInput = true') >
      terminalManagerSource.indexOf("if (source === 'local')"),
  'Remote writes should still pass through the existing meaningful-input transcript path.'
)
assert(
  terminalManagerSource.includes('this.scheduleTranscriptPersist(session)') &&
    terminalManagerSource.includes('this.scheduleRetrievalAuditSync(session)'),
  'PTY output should still schedule transcript persistence and retrieval audit sync.'
)
assert(
  !/syncWorkspaceRoot[\s\S]*?session\.ptyProcess\.write\(\s*`\$\{createWorkspaceBootstrap/u.test(terminalManagerSource),
  'Workspace root sync must not paste bootstrap commands into an already-running agent TUI.'
)
assert(
  !/syncCliRetrievalPreference[\s\S]*?session\.ptyProcess\.write\(/u.test(terminalManagerSource),
  'CLI retrieval preference sync must not paste bootstrap commands into an already-running agent TUI.'
)

console.log(
  JSON.stringify({
    localMethods: host.localCalls.map((call) => call.method),
    remoteOutputs: remoteOutputs.length,
    activePanelId: host.activePanelId,
    remoteWriteAccepted: remoteWrite.accepted,
    transcriptPathIntact: true
  })
)
