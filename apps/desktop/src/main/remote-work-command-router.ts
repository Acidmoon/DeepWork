import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'
import type {
  FeishuRemoteBridgeInboundMessage,
  FeishuRemoteBridgeParsedInput
} from './feishu-remote-work-bridge'
import type { RemoteBridgeAuditSink } from './remote-bridge-audit'
import { createRemoteBridgeAuditRecord } from './remote-bridge-audit'
import type { RemoteSessionAdapter, RemoteSessionStatus } from './remote-session-adapter'

export interface RemoteWorkCommandRouteResult {
  ok: boolean
  response: string
}

function formatTimestamp(value: string | null): string {
  return value ?? 'never'
}

function formatRunning(value: boolean): string {
  return value ? 'running' : 'not running'
}

export function formatRemoteStatus(status: RemoteSessionStatus | null): string {
  if (!status) {
    return 'Remote session is unavailable.'
  }

  const lock = status.lock
    ? `locked by ${status.lock.ownerUserId} in ${status.lock.chatId} until ${status.lock.expiresAt}`
    : 'unlocked'

  return [
    `Target: ${status.title} (${status.panelId}, ${status.mode})`,
    `State: ${formatRunning(status.isRunning)} (${status.status})`,
    `PID: ${status.pid ?? 'none'}`,
    `CWD: ${status.cwd}`,
    `Launches: ${status.launchCount}`,
    `Buffer: ${status.bufferSize} chars`,
    `Last output: ${formatTimestamp(status.lastOutputAt)}`,
    `Lock: ${lock}`
  ].join('\n')
}

function parseTailLimit(args: string[], fallback: number): number {
  const rawLimit = args[0]
  if (!rawLimit) {
    return fallback
  }

  const parsedLimit = Number(rawLimit)
  if (!Number.isFinite(parsedLimit)) {
    return fallback
  }

  return Math.max(1, Math.min(fallback, Math.floor(parsedLimit)))
}

export class RemoteWorkCommandRouter {
  constructor(
    private readonly settings: RemoteBridgeSettings,
    private readonly adapter: RemoteSessionAdapter,
    private readonly auditSink: RemoteBridgeAuditSink | null = null
  ) {}

  route(input: FeishuRemoteBridgeParsedInput, message: FeishuRemoteBridgeInboundMessage): RemoteWorkCommandRouteResult {
    const panelId = this.settings.defaultPanelId
    const actor = {
      userId: message.userId,
      chatId: message.chatId
    }

    if (input.kind === 'text') {
      const result = this.adapter.writeLine(panelId, input.text, actor)
      this.auditSink?.record(
        createRemoteBridgeAuditRecord({
          timestamp: message.timestamp,
          action: 'input',
          result: result.accepted ? 'accepted' : 'rejected',
          actorUserId: actor.userId,
          chatId: actor.chatId,
          targetPanelId: panelId,
          command: null,
          reason: result.error,
          inputLength: input.text.length
        })
      )
      return {
        ok: result.accepted,
        response:
          result.accepted && result.status?.mode === 'codex-app-server'
            ? ''
            : result.accepted
              ? 'Remote input sent.'
              : result.error ?? 'Remote input was rejected.'
      }
    }

    switch (input.command) {
      case 'status':
        return this.auditCommand(input.command, message, panelId, {
          ok: true,
          response: formatRemoteStatus(this.adapter.getStatus(panelId))
        })
      case 'start': {
        const status = this.adapter.ensureSession(panelId)
        return this.auditCommand(input.command, message, panelId, {
          ok: Boolean(status),
          response: status ? formatRemoteStatus(status) : 'Remote session could not be started.'
        })
      }
      case 'tail': {
        const tail = this.adapter.tail(panelId, {
          maxCharacters: parseTailLimit(input.args, this.settings.output.maxTailCharacters)
        })
        if (!tail) {
          return this.auditCommand(input.command, message, panelId, {
            ok: false,
            response: 'Remote session output is unavailable.'
          })
        }

        return this.auditCommand(input.command, message, panelId, {
          ok: true,
          response: tail.truncated ? `[Output truncated]\n${tail.content}` : tail.content || 'No output yet.'
        })
      }
      case 'stop': {
        const result = this.adapter.sendControl(panelId, 'interrupt', actor)
        return this.auditCommand(input.command, message, panelId, {
          ok: result.issued,
          response: result.issued ? 'Stop request issued.' : result.error ?? 'Stop request was rejected.'
        })
      }
      case 'lock': {
        const result = this.adapter.acquireLock(panelId, actor)
        return this.auditCommand(input.command, message, panelId, {
          ok: result.ok,
          response: result.ok
            ? `Remote lock acquired until ${result.lock?.expiresAt ?? 'unknown'}.`
            : result.error ?? 'Remote lock was rejected.'
        })
      }
      case 'unlock': {
        const result = this.adapter.releaseLock(panelId, actor)
        return this.auditCommand(input.command, message, panelId, {
          ok: result.ok,
          response: result.ok ? 'Remote lock released.' : result.error ?? 'Remote unlock was rejected.'
        })
      }
    }
  }

  private auditCommand(
    command: string,
    message: FeishuRemoteBridgeInboundMessage,
    panelId: string,
    result: RemoteWorkCommandRouteResult
  ): RemoteWorkCommandRouteResult {
    this.auditSink?.record(
      createRemoteBridgeAuditRecord({
        timestamp: message.timestamp,
        action: 'command',
        result: result.ok ? 'succeeded' : 'failed',
        actorUserId: message.userId,
        chatId: message.chatId,
        targetPanelId: panelId,
        command,
        reason: result.ok ? null : result.response,
        inputLength: null
      })
    )
    return result
  }
}
