import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'
import { isRemoteBridgeReady } from '@ai-workbench/core/desktop/settings'
import type { FeishuRemoteBridgeClient } from './feishu-remote-work-bridge'
import { FeishuRemoteWorkBridge } from './feishu-remote-work-bridge'
import type { RemoteBridgeAuditSink } from './remote-bridge-audit'
import type { FeishuOutputClient } from './remote-output-delivery'
import { deliverFeishuOutput, RemoteOutputCoalescer } from './remote-output-delivery'
import type { RemoteSessionAdapter } from './remote-session-adapter'
import { RemoteWorkCommandRouter } from './remote-work-command-router'

interface PumpableRemoteSessionAdapter {
  pumpEvent(): Promise<{ kind: string; text: string } | null>
}

function isPumpableAdapter(adapter: RemoteSessionAdapter): adapter is RemoteSessionAdapter & PumpableRemoteSessionAdapter {
  return typeof (adapter as Partial<PumpableRemoteSessionAdapter>).pumpEvent === 'function'
}

export interface FeishuRemoteBridgeServiceClient extends FeishuRemoteBridgeClient, FeishuOutputClient {}

export interface FeishuRemoteBridgeServiceOptions {
  settings: RemoteBridgeSettings
  availablePanelIds: ReadonlySet<string> | readonly string[]
  adapter: RemoteSessionAdapter
  client: FeishuRemoteBridgeServiceClient
  auditSink?: RemoteBridgeAuditSink
  schedule?: (callback: () => void, delayMs: number) => unknown
  cancel?: (handle: unknown) => void
}

export interface FeishuRemoteBridgeServiceState {
  running: boolean
  lastPollAt: string | null
  lastError: string | null
  lastActiveChatId: string | null
}

export class FeishuRemoteBridgeService {
  private readonly bridge: FeishuRemoteWorkBridge
  private readonly router: RemoteWorkCommandRouter
  private readonly schedule: (callback: () => void, delayMs: number) => unknown
  private readonly cancel: (handle: unknown) => void
  private pollingTimer: unknown = null
  private polling = false
  private running = false
  private outputUnsubscribe: (() => void) | null = null
  private outputCoalescer: RemoteOutputCoalescer | null = null
  private outputPumpRunning = false
  private lastPollAt: string | null = null
  private lastError: string | null = null
  private lastActiveChatId: string | null = null

  constructor(private readonly options: FeishuRemoteBridgeServiceOptions) {
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs))
    this.cancel = options.cancel ?? ((handle) => clearTimeout(handle as NodeJS.Timeout))
    this.bridge = new FeishuRemoteWorkBridge(options.settings, options.client, {
      availablePanelIds: options.availablePanelIds,
      auditSink: options.auditSink
    })
    this.router = new RemoteWorkCommandRouter(options.settings, options.adapter, options.auditSink ?? null)
  }

  start(): boolean {
    if (this.running) {
      return true
    }
    if (!isRemoteBridgeReady(this.options.settings, this.options.availablePanelIds)) {
      return false
    }

    this.running = true
    this.subscribeOutput()
    this.startOutputPump()
    void this.pollCycle()
    return true
  }

  async pollOnce(): Promise<void> {
    const results = await this.bridge.pollOnce()
    this.lastPollAt = new Date().toISOString()

    for (const result of results) {
      if (result.status !== 'accepted' || !result.message || !result.parsed) {
        continue
      }

      this.lastActiveChatId = result.message.chatId
      const routeResult = this.router.route(result.parsed, result.message)
      if (routeResult.response.trim()) {
        await deliverFeishuOutput(this.options.client, {
          chatId: result.message.chatId,
          text: routeResult.response,
          mode: 'text'
        })
      }
    }
  }

  dispose(): void {
    this.running = false
    if (this.pollingTimer) {
      this.cancel(this.pollingTimer)
      this.pollingTimer = null
    }
    this.outputCoalescer?.flush()
    this.outputCoalescer = null
    this.outputUnsubscribe?.()
    this.outputUnsubscribe = null
    ;(this.options.adapter as unknown as { dispose?: () => void }).dispose?.()
  }

  getState(): FeishuRemoteBridgeServiceState {
    return {
      running: this.running,
      lastPollAt: this.lastPollAt,
      lastError: this.lastError,
      lastActiveChatId: this.lastActiveChatId
    }
  }

  private async pollCycle(): Promise<void> {
    if (!this.running || this.polling) {
      return
    }

    this.polling = true
    try {
      await this.pollOnce()
      this.lastError = null
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error)
      console.warn(`[remote-bridge] ${this.lastError}`)
    } finally {
      this.polling = false
      if (this.running) {
        this.pollingTimer = this.schedule(() => {
          this.pollingTimer = null
          void this.pollCycle()
        }, this.options.settings.pollingIntervalMs)
      }
    }
  }

  private subscribeOutput(): void {
    if (this.options.settings.targetMode === 'pty' && !this.options.settings.output.proactiveDelivery) {
      return
    }

    this.outputCoalescer = new RemoteOutputCoalescer(
      (output) => {
        const chatId = this.lastActiveChatId
        if (!chatId) {
          return
        }
        void deliverFeishuOutput(this.options.client, {
          chatId,
          text: output.content,
          mode: 'text'
        })
      },
      {
        maxMessageCharacters: this.options.settings.output.maxMessageCharacters,
        debounceMs: this.options.settings.output.debounceMs,
        proactiveDelivery: this.options.settings.output.proactiveDelivery
      }
    )
    this.outputUnsubscribe = this.options.adapter.subscribeOutput(this.options.settings.defaultPanelId, (event) => {
      this.outputCoalescer?.push(event.data)
    })
  }

  private startOutputPump(): void {
    if (!isPumpableAdapter(this.options.adapter) || this.outputPumpRunning) {
      return
    }

    this.outputPumpRunning = true
    void this.outputPumpLoop()
  }

  private async outputPumpLoop(): Promise<void> {
    const adapter = this.options.adapter
    if (!isPumpableAdapter(adapter)) {
      this.outputPumpRunning = false
      return
    }

    try {
      while (this.running) {
        await adapter.pumpEvent()
      }
    } catch (error) {
      if (this.running) {
        this.lastError = error instanceof Error ? error.message : String(error)
        console.warn(`[remote-bridge] structured output pump failed: ${this.lastError}`)
      }
    } finally {
      this.outputPumpRunning = false
    }
  }
}
