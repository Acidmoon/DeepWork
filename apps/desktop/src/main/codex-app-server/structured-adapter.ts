import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'
import type {
  RemoteSessionActor,
  RemoteSessionAdapter,
  RemoteSessionControlAction,
  RemoteSessionControlResult,
  RemoteSessionLockResult,
  RemoteSessionOutputEvent,
  RemoteSessionStatus,
  RemoteSessionTailOptions,
  RemoteSessionTailResult,
  RemoteSessionWriteResult
} from '../remote-session-adapter'
import { CodexAppServerPrototypeClient } from './prototype-client'
import type { CodexAppServerRuntimePolicy, CodexAppServerTransport } from './prototype-client'

export interface StructuredCodexThreadIdentityStore {
  getThreadId(targetId: string): string | null
  setThreadId(targetId: string, threadId: string): void
}

export interface StructuredCodexRemoteSessionAdapterOptions {
  enabled: boolean
  targetId?: string
  title?: string
  cwd?: string
  runtimePolicy?: CodexAppServerRuntimePolicy
}

export type StructuredCodexRemoteMessageKind = 'progress' | 'tool' | 'final' | 'error' | 'status'

export interface StructuredCodexRemoteMessage {
  kind: StructuredCodexRemoteMessageKind
  text: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, key: string): string | null {
  return isRecord(value) && typeof value[key] === 'string' ? value[key] : null
}

function readParams(event: unknown): Record<string, unknown> {
  return isRecord(event) && isRecord(event.params) ? event.params : {}
}

export function translateCodexAppServerEvent(event: unknown): StructuredCodexRemoteMessage | null {
  const method = readString(event, 'method') ?? readString(event, 'type')
  const params = readParams(event)
  const item = isRecord(params.item) ? params.item : {}
  const itemType = readString(item, 'type')
  const text =
    readString(params, 'text') ??
    readString(params, 'message') ??
    readString(params, 'delta') ??
    readString(params, 'summary') ??
    readString(item, 'text') ??
    readString(item, 'aggregatedOutput') ??
    readString(event, 'text')

  switch (method) {
    case 'item/completed':
      if (itemType === 'agentMessage' || itemType === 'agent_message' || itemType === 'message') {
        return text ? { kind: 'final', text } : null
      }
      if (itemType === 'commandExecution' || itemType === 'mcpToolCall' || itemType === 'fileChange') {
        return text ? { kind: 'tool', text } : null
      }
      return null
    case 'thread/status/changed':
      if (isRecord(params.status) && readString(params.status, 'type') === 'idle') {
        return { kind: 'status', text: 'Turn completed.' }
      }
      return null
    case 'agent_message/completed':
    case 'agentMessage/completed':
    case 'message/completed':
      return text ? { kind: 'final', text } : null
    case 'tool/progress':
    case 'mcp_tool_call/progress':
    case 'command_execution/output_delta':
      return text ? { kind: 'tool', text } : null
    case 'turn/completed':
      return { kind: 'status', text: 'Turn completed.' }
    case 'turn/error':
    case 'error':
      return { kind: 'error', text: text ?? 'Codex app-server reported an error.' }
    case 'turn/started':
    case 'turn/status':
      return text ? { kind: 'progress', text } : null
    default:
      return null
  }
}

export function createStructuredCodexAdapterIfEnabled(input: {
  settings: RemoteBridgeSettings
  transport: CodexAppServerTransport
  threadStore: StructuredCodexThreadIdentityStore
  options?: Omit<StructuredCodexRemoteSessionAdapterOptions, 'enabled'>
}): StructuredCodexRemoteSessionAdapter | null {
  if (input.settings.targetMode !== 'codex-app-server') {
    return null
  }

  return new StructuredCodexRemoteSessionAdapter(input.transport, input.threadStore, {
    enabled: true,
    targetId: input.options?.targetId ?? input.settings.defaultPanelId,
    title: input.options?.title,
    cwd: input.options?.cwd
  })
}

export class StructuredCodexRemoteSessionAdapter implements RemoteSessionAdapter {
  private readonly client: CodexAppServerPrototypeClient
  private readonly targetId: string
  private readonly title: string
  private readonly cwd: string
  private readonly outputListeners = new Set<(event: RemoteSessionOutputEvent) => void>()
  private readonly outputBuffer: string[] = []
  private readonly pendingFinalMessages: string[] = []
  private initialized = false
  private threadId: string | null = null
  private activeTurnId: string | null = null
  private activeTurnSteerable = false
  private lastOutputAt: string | null = null

  constructor(
    private readonly transport: CodexAppServerTransport,
    private readonly threadStore: StructuredCodexThreadIdentityStore,
    private readonly options: StructuredCodexRemoteSessionAdapterOptions
  ) {
    this.client = new CodexAppServerPrototypeClient(transport, {
      approvalPolicy: options.runtimePolicy?.approvalPolicy ?? 'never',
      sandbox: options.runtimePolicy?.sandbox ?? 'danger-full-access'
    })
    this.targetId = options.targetId ?? 'codex-cli'
    this.title = options.title ?? 'Codex App Server'
    this.cwd = options.cwd ?? ''
  }

  ensureSession(panelId: string): RemoteSessionStatus | null {
    if (!this.isAvailable(panelId)) {
      return null
    }

    this.threadId = this.threadStore.getThreadId(this.targetId)
    return this.getStatus(panelId)
  }

  getStatus(panelId: string): RemoteSessionStatus | null {
    if (!this.isAvailable(panelId)) {
      return null
    }

    return {
      mode: 'codex-app-server',
      panelId: this.targetId,
      title: this.title,
      remoteCapable: true,
      status: this.threadId ? 'running' : 'idle',
      hasSession: Boolean(this.threadId),
      isRunning: Boolean(this.activeTurnId),
      pid: null,
      cwd: this.cwd,
      bufferSize: this.outputBuffer.join('\n').length,
      launchCount: this.threadId ? 1 : 0,
      lastOutputAt: this.lastOutputAt,
      lock: null
    }
  }

  writeLine(panelId: string, text: string, _actor: RemoteSessionActor): RemoteSessionWriteResult {
    if (!this.isAvailable(panelId)) {
      return {
        accepted: false,
        status: this.getStatus(panelId),
        error: 'Structured Codex app-server mode is not enabled for this target.',
        inputLength: text.length
      }
    }

    void this.routeText(text)
      .then(() => {})
      .catch((error: unknown) => {
        this.publishOutput(error instanceof Error ? error.message : String(error))
      })

    return {
      accepted: true,
      status: this.getStatus(panelId),
      error: null,
      inputLength: text.length
    }
  }

  sendControl(
    panelId: string,
    action: RemoteSessionControlAction,
    _actor: RemoteSessionActor
  ): RemoteSessionControlResult {
    if (!this.isAvailable(panelId)) {
      return {
        issued: false,
        status: this.getStatus(panelId),
        error: 'Structured Codex app-server mode is not enabled for this target.'
      }
    }
    if (action !== 'interrupt' || !this.threadId || !this.activeTurnId) {
      return {
        issued: false,
        status: this.getStatus(panelId),
        error: 'No active structured Codex turn can be interrupted.'
      }
    }

    void this.client.interruptTurn(this.threadId, this.activeTurnId).then(() => {
      this.activeTurnId = null
      this.activeTurnSteerable = false
    })

    return {
      issued: true,
      status: this.getStatus(panelId),
      error: null
    }
  }

  acquireLock(panelId: string, _actor: RemoteSessionActor): RemoteSessionLockResult {
    return {
      ok: this.isAvailable(panelId),
      status: this.getStatus(panelId),
      lock: null,
      error: this.isAvailable(panelId) ? null : 'Structured Codex app-server mode is not enabled for this target.'
    }
  }

  releaseLock(panelId: string, _actor: RemoteSessionActor): RemoteSessionLockResult {
    return this.acquireLock(panelId, _actor)
  }

  tail(panelId: string, options: RemoteSessionTailOptions): RemoteSessionTailResult | null {
    if (!this.isAvailable(panelId)) {
      return null
    }

    const content = this.outputBuffer.join('\n')
    const maxCharacters = Math.max(1, Math.floor(options.maxCharacters))
    const truncated = content.length > maxCharacters
    return {
      panelId,
      content: truncated ? content.slice(content.length - maxCharacters) : content,
      truncated
    }
  }

  subscribeOutput(panelId: string, listener: (event: RemoteSessionOutputEvent) => void): () => void {
    if (!this.isAvailable(panelId)) {
      return () => {}
    }

    this.outputListeners.add(listener)
    return () => {
      this.outputListeners.delete(listener)
    }
  }

  async pumpEvent(): Promise<StructuredCodexRemoteMessage | null> {
    const event = await this.client.readEvent()
    if (event === null) {
      throw new Error('Codex app-server transport closed.')
    }

    const message = translateCodexAppServerEvent(event)
    if (!message) {
      return null
    }

    if (message.kind === 'final') {
      this.pendingFinalMessages.push(message.text)
      return message
    }

    if (message.kind === 'status' && message.text === 'Turn completed.') {
      this.activeTurnId = null
      this.activeTurnSteerable = false
      this.flushFinalMessages()
      return message
    }

    if (message.kind === 'error') {
      this.publishOutput(message.text)
    }

    return message
  }

  dispose(): void {
    ;(this.transport as unknown as { dispose?: () => void }).dispose?.()
  }

  markActiveTurnSteerable(steerable: boolean): void {
    this.activeTurnSteerable = steerable
  }

  private async routeText(text: string): Promise<void> {
    await this.ensureInitialized()
    const threadId = await this.ensureThread()

    if (this.activeTurnId && this.activeTurnSteerable) {
      await this.client.steerTurn(threadId, this.activeTurnId, text)
      return
    }

    const turn = await this.client.startTurn(threadId, text)
    this.activeTurnId = turn.turnId
    this.activeTurnSteerable = true
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return
    }

    await this.client.initialize()
    this.initialized = true
  }

  private async ensureThread(): Promise<string> {
    const storedThreadId = this.threadStore.getThreadId(this.targetId)
    if (storedThreadId) {
      this.threadId = storedThreadId
      return storedThreadId
    }

    const thread = await this.client.startThread({
      cwd: this.cwd || null
    })
    this.threadId = thread.threadId
    this.threadStore.setThreadId(this.targetId, thread.threadId)
    return thread.threadId
  }

  private publishOutput(data: string): void {
    this.lastOutputAt = new Date().toISOString()
    this.outputBuffer.push(data)
    for (const listener of this.outputListeners) {
      listener({
        panelId: this.targetId,
        data
      })
    }
  }

  private flushFinalMessages(): void {
    const text = this.pendingFinalMessages.splice(0).join('\n\n').trim()
    if (text) {
      this.publishOutput(text)
    }
  }

  private isAvailable(panelId: string): boolean {
    return this.options.enabled && panelId === this.targetId
  }
}
