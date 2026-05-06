import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface, type Interface } from 'node:readline'
import { existsSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'

export interface CodexAppServerTransport {
  request(method: string, params: unknown): Promise<unknown>
  notify?(method: string, params: unknown): Promise<void>
  readEvent(): Promise<unknown | null>
}

export interface CodexAppServerPrototypeThread {
  threadId: string
  raw: unknown
}

export interface CodexAppServerPrototypeTurn {
  turnId: string
  raw: unknown
}

export interface CodexAppServerRuntimePolicy {
  approvalPolicy?: 'never' | 'on-request' | 'on-failure' | 'untrusted'
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'
}

export interface CodexAppServerStdioTransportOptions {
  cwd?: string
  command?: string
  args?: string[]
  env?: NodeJS.ProcessEnv
  requestTimeoutMs?: number
  autoApproveServerRequests?: boolean
}

interface CodexAppServerCommand {
  command: string
  args: string[]
}

function readStringProperty(value: unknown, keys: readonly string[]): string | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  for (const key of keys) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
  }

  return null
}

function readNestedStringProperty(value: unknown, paths: readonly (readonly string[])[]): string | null {
  for (const path of paths) {
    let current: unknown = value
    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        current = null
        break
      }
      current = (current as Record<string, unknown>)[segment]
    }
    if (typeof current === 'string' && current.trim()) {
      return current
    }
  }

  return null
}

function requireNestedResponseId(value: unknown, paths: readonly (readonly string[])[], label: string): string {
  const id = readNestedStringProperty(value, paths)
  if (!id) {
    throw new Error(`Codex app-server ${label} response did not include an id.`)
  }

  return id
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createApprovalResponse(method: string, params: unknown): unknown {
  switch (method) {
    case 'item/commandExecution/requestApproval':
    case 'item/fileChange/requestApproval':
    case 'execCommandApproval':
    case 'applyPatchApproval':
      return { decision: 'accept' }
    case 'item/permissions/requestApproval':
      return {
        permissions: isRecord(params) ? (params.permissions ?? {}) : {},
        scope: 'turn'
      }
    case 'item/tool/call':
      return {
        success: false,
        contentItems: [{ type: 'inputText', text: 'Tool is not available on this client.' }]
      }
    default:
      return null
  }
}

function normalizePathEntry(pathEntry: string): string {
  return pathEntry.trim().replace(/^"|"$/gu, '')
}

function resolveCommandOnPath(commandName: string): string | null {
  for (const rawEntry of (process.env.PATH ?? '').split(delimiter)) {
    const directory = normalizePathEntry(rawEntry)
    if (!directory) {
      continue
    }

    const candidate = join(directory, commandName)
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

function resolveWindowsCodexAppServerCommand(defaultArgs: string[]): CodexAppServerCommand {
  const codexExe = resolveCommandOnPath('codex.exe')
  if (codexExe) {
    return { command: codexExe, args: defaultArgs }
  }

  const codexCmd = resolveCommandOnPath('codex.cmd')
  if (codexCmd) {
    const npmBinDirectory = dirname(codexCmd)
    const bundledCodexExe = join(
      npmBinDirectory,
      'node_modules',
      '@openai',
      'codex',
      'node_modules',
      '@openai',
      'codex-win32-x64',
      'vendor',
      'x86_64-pc-windows-msvc',
      'codex',
      'codex.exe'
    )
    if (existsSync(bundledCodexExe)) {
      return { command: bundledCodexExe, args: defaultArgs }
    }

    const codexScript = join(npmBinDirectory, 'node_modules', '@openai', 'codex', 'bin', 'codex.js')
    const nodeExe = resolveCommandOnPath('node.exe') ?? resolveCommandOnPath('node')
    if (existsSync(codexScript) && nodeExe) {
      return { command: nodeExe, args: [codexScript, ...defaultArgs] }
    }
  }

  return { command: 'codex', args: defaultArgs }
}

function resolveCodexAppServerCommand(options: CodexAppServerStdioTransportOptions): CodexAppServerCommand {
  const args = options.args ?? ['app-server']
  if (options.command) {
    return { command: options.command, args }
  }

  if (process.platform === 'win32') {
    return resolveWindowsCodexAppServerCommand(args)
  }

  return { command: 'codex', args }
}

export class CodexAppServerStdioTransport implements CodexAppServerTransport {
  private readonly requestTimeoutMs: number
  private readonly autoApproveServerRequests: boolean
  private process: ChildProcessWithoutNullStreams | null = null
  private lines: Interface | null = null
  private nextId = 1
  private closed = false
  private closeReason: Error | null = null
  private readonly pending = new Map<
    number,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  >()
  private readonly eventQueue: unknown[] = []
  private readonly eventWaiters: ((value: unknown | null) => void)[] = []

  constructor(private readonly options: CodexAppServerStdioTransportOptions = {}) {
    this.requestTimeoutMs = Math.max(1000, Math.floor(options.requestTimeoutMs ?? 120_000))
    this.autoApproveServerRequests = options.autoApproveServerRequests !== false
  }

  request(method: string, params: unknown): Promise<unknown> {
    const startupError = this.ensureStarted()
    if (startupError) {
      return Promise.reject(startupError)
    }

    const child = this.process
    if (this.closed || !child?.stdin.writable) {
      return Promise.reject(this.closeReason ?? new Error('Codex app-server transport is closed.'))
    }

    const id = this.nextId++
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Codex app-server ${method} timed out.`))
      }, this.requestTimeoutMs)

      this.pending.set(id, { resolve, reject, timeout })
      child.stdin.write(`${JSON.stringify(payload)}\n`, 'utf8', (error) => {
        if (!error) {
          return
        }
        clearTimeout(timeout)
        this.pending.delete(id)
        reject(error)
      })
    })
  }

  notify(method: string, params: unknown): Promise<void> {
    const startupError = this.ensureStarted()
    if (startupError) {
      return Promise.reject(startupError)
    }

    const child = this.process
    if (this.closed || !child?.stdin.writable) {
      return Promise.reject(this.closeReason ?? new Error('Codex app-server transport is closed.'))
    }

    return new Promise((resolve, reject) => {
      const payload = {
        jsonrpc: '2.0',
        method,
        params
      }
      child.stdin.write(`${JSON.stringify(payload)}\n`, 'utf8', (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }

  readEvent(): Promise<unknown | null> {
    const event = this.eventQueue.shift()
    if (event) {
      return Promise.resolve(event)
    }
    if (this.closed) {
      return Promise.resolve(null)
    }

    return new Promise((resolve) => {
      this.eventWaiters.push(resolve)
    })
  }

  dispose(): void {
    const child = this.process
    this.closeTransport(new Error('Codex app-server transport closed.'))
    child?.kill()
  }

  private ensureStarted(): Error | null {
    if (this.process) {
      return null
    }
    if (this.closed) {
      return this.closeReason ?? new Error('Codex app-server transport is closed.')
    }

    return this.start()
  }

  private start(): Error | null {
    const { command, args } = resolveCodexAppServerCommand(this.options)
    try {
      this.process = spawn(command, args, {
        cwd: this.options.cwd,
        env: this.options.env ?? process.env,
        windowsHide: true
      })
    } catch (error) {
      const startupError = error instanceof Error ? error : new Error(String(error))
      this.closeTransport(startupError)
      return startupError
    }

    this.lines = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    })
    this.lines.on('line', (line) => {
      this.handleLine(line)
    })
    this.process.stderr.on('data', (chunk) => {
      const text = String(chunk).trim()
      if (text) {
        console.warn(`[codex-app-server] ${text}`)
      }
    })
    this.process.on('error', (error) => {
      this.closeTransport(error)
    })
    this.process.on('exit', (code, signal) => {
      this.closeTransport(new Error(`Codex app-server exited with code ${code ?? 'null'} signal ${signal ?? 'null'}.`))
    })
    return null
  }

  private handleLine(line: string): void {
    let message: unknown
    try {
      message = JSON.parse(line)
    } catch {
      return
    }
    if (!isRecord(message)) {
      return
    }

    const id = typeof message.id === 'number' ? message.id : null
    const method = typeof message.method === 'string' ? message.method : null
    if (id !== null && !method) {
      this.resolveResponse(id, message)
      return
    }
    if (id !== null && method) {
      this.handleServerRequest(id, method, message.params)
      return
    }

    this.pushEvent(message)
  }

  private resolveResponse(id: number, message: Record<string, unknown>): void {
    const pending = this.pending.get(id)
    if (!pending) {
      return
    }
    this.pending.delete(id)
    clearTimeout(pending.timeout)
    if (isRecord(message.error)) {
      pending.reject(new Error(typeof message.error.message === 'string' ? message.error.message : 'Codex app-server error.'))
      return
    }
    pending.resolve(message.result ?? null)
  }

  private handleServerRequest(id: number, method: string, params: unknown): void {
    const result = this.autoApproveServerRequests ? createApprovalResponse(method, params) : null
    const response =
      result === null
        ? {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: 'method not found' }
          }
        : {
            jsonrpc: '2.0',
            id,
            result
          }
    this.process?.stdin.write(`${JSON.stringify(response)}\n`)
  }

  private pushEvent(event: unknown): void {
    const waiter = this.eventWaiters.shift()
    if (waiter) {
      waiter(event)
      return
    }
    this.eventQueue.push(event)
  }

  private resolveEventWaiters(value: unknown | null): void {
    while (this.eventWaiters.length > 0) {
      this.eventWaiters.shift()?.(value)
    }
  }

  private failAll(error: Error): void {
    for (const [id, pending] of this.pending) {
      this.pending.delete(id)
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
  }

  private closeTransport(error: Error): void {
    this.closeReason = error
    this.failAll(error)
    this.closed = true
    this.lines?.close()
    this.lines = null
    this.process = null
    this.resolveEventWaiters(null)
  }
}

export class CodexAppServerPrototypeClient {
  constructor(
    private readonly transport: CodexAppServerTransport,
    private readonly policy: CodexAppServerRuntimePolicy = {}
  ) {}

  initialize(): Promise<unknown> {
    return this.transport
      .request('initialize', {
        clientInfo: {
          name: 'DeepWork',
          version: '0.1.0'
        },
        capabilities: {
          experimentalApi: true,
          optOutNotificationMethods: []
        }
      })
      .then(async (response) => {
        await this.transport.notify?.('initialized', {})
        return response
      })
  }

  async startThread(input: { cwd?: string | null; model?: string | null } = {}): Promise<CodexAppServerPrototypeThread> {
    const raw = await this.transport.request('thread/start', {
      cwd: input.cwd ?? null,
      model: input.model ?? null,
      approvalPolicy: this.policy.approvalPolicy ?? null,
      sandbox: this.policy.sandbox ?? null,
      experimentalRawEvents: false,
      persistExtendedHistory: true
    })

    return {
      threadId:
        readStringProperty(raw, ['threadId', 'thread_id', 'id']) ??
        requireNestedResponseId(raw, [['thread', 'id']], 'thread/start'),
      raw
    }
  }

  async startTurn(threadId: string, text: string): Promise<CodexAppServerPrototypeTurn> {
    const raw = await this.transport.request('turn/start', {
      threadId,
      input: [
        {
          type: 'text',
          text,
          text_elements: []
        }
      ],
      approvalPolicy: this.policy.approvalPolicy ?? null
    })

    return {
      turnId:
        readStringProperty(raw, ['turnId', 'turn_id', 'id']) ??
        requireNestedResponseId(raw, [['turn', 'id']], 'turn/start'),
      raw
    }
  }

  async steerTurn(threadId: string, turnId: string, text: string): Promise<unknown> {
    return this.transport.request('turn/steer', {
      threadId,
      turnId,
      input: [
        {
          type: 'text',
          text
        }
      ]
    })
  }

  interruptTurn(threadId: string, turnId: string): Promise<unknown> {
    return this.transport.request('turn/interrupt', {
      threadId,
      turnId
    })
  }

  readEvent(): Promise<unknown | null> {
    return this.transport.readEvent()
  }
}
