import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'
import { isRemoteBridgeReady } from '@ai-workbench/core/desktop/settings'
import type { RemoteBridgeAuditSink } from './remote-bridge-audit'
import { createRemoteBridgeAuditRecord } from './remote-bridge-audit'

export type FeishuRemoteCommandName = 'status' | 'start' | 'tail' | 'stop' | 'lock' | 'unlock'

export interface FeishuRemoteBridgeInboundMessage {
  messageId: string
  chatId: string
  userId: string
  text: string
  senderId?: string | null
  isFromBot?: boolean
  timestamp?: string | null
}

export interface FeishuRemoteBridgeClient {
  fetchMessages(): Promise<FeishuRemoteBridgeInboundMessage[]>
}

export interface FeishuRemoteBridgeCommand {
  kind: 'command'
  command: FeishuRemoteCommandName
  args: string[]
  rawText: string
}

export interface FeishuRemoteBridgeTextInput {
  kind: 'text'
  text: string
  rawText: string
}

export type FeishuRemoteBridgeParsedInput = FeishuRemoteBridgeCommand | FeishuRemoteBridgeTextInput

export type FeishuRemoteBridgeResultStatus =
  | 'disabled'
  | 'duplicate'
  | 'bot-self'
  | 'unauthorized-chat'
  | 'unauthorized-user'
  | 'empty'
  | 'unknown-command'
  | 'accepted'

export interface FeishuRemoteBridgeProcessResult {
  status: FeishuRemoteBridgeResultStatus
  message: FeishuRemoteBridgeInboundMessage | null
  parsed: FeishuRemoteBridgeParsedInput | null
  reason: string | null
}

export interface FeishuRemoteWorkBridgeOptions {
  botUserId?: string | null
  availablePanelIds?: ReadonlySet<string> | readonly string[]
  maxSeenMessageIds?: number
  auditSink?: RemoteBridgeAuditSink
}

const COMMANDS = new Set<FeishuRemoteCommandName>(['status', 'start', 'tail', 'stop', 'lock', 'unlock'])

function normalizeText(value: string): string {
  return value.trim()
}

export function parseFeishuRemoteInput(text: string): FeishuRemoteBridgeParsedInput | null {
  const rawText = normalizeText(text)
  if (!rawText) {
    return null
  }

  if (!rawText.startsWith('/')) {
    return {
      kind: 'text',
      text: rawText,
      rawText
    }
  }

  const [commandToken = '', ...args] = rawText.slice(1).split(/\s+/u).filter(Boolean)
  const command = commandToken.toLowerCase()
  if (!COMMANDS.has(command as FeishuRemoteCommandName)) {
    return null
  }

  return {
    kind: 'command',
    command: command as FeishuRemoteCommandName,
    args,
    rawText
  }
}

export class FeishuRemoteWorkBridge {
  private readonly seenMessageIds: string[] = []
  private readonly seenMessageIdSet = new Set<string>()
  private readonly allowedChatIds: ReadonlySet<string>
  private readonly allowedUserIds: ReadonlySet<string>
  private readonly maxSeenMessageIds: number

  constructor(
    private readonly settings: RemoteBridgeSettings,
    private readonly client: FeishuRemoteBridgeClient,
    private readonly options: FeishuRemoteWorkBridgeOptions = {}
  ) {
    this.allowedChatIds = new Set(settings.allowedChatIds)
    this.allowedUserIds = new Set(settings.allowedUserIds)
    this.maxSeenMessageIds = Math.max(1, Math.floor(options.maxSeenMessageIds ?? 1000))
  }

  async pollOnce(): Promise<FeishuRemoteBridgeProcessResult[]> {
    if (!isRemoteBridgeReady(this.settings, this.options.availablePanelIds)) {
      return [
        {
          status: 'disabled',
          message: null,
          parsed: null,
          reason: 'Feishu remote bridge is disabled or not fully configured.'
        }
      ]
    }

    const messages = await this.client.fetchMessages()
    return messages.map((message) => this.processMessage(message))
  }

  processMessage(message: FeishuRemoteBridgeInboundMessage): FeishuRemoteBridgeProcessResult {
    if (this.isDuplicate(message.messageId)) {
      return {
        status: 'duplicate',
        message,
        parsed: null,
        reason: 'Duplicate Feishu message was ignored.'
      }
    }

    this.rememberMessageId(message.messageId)

    if (message.isFromBot || (this.options.botUserId && message.senderId === this.options.botUserId)) {
      return {
        status: 'bot-self',
        message,
        parsed: null,
        reason: 'Bot-authored Feishu message was ignored.'
      }
    }

    if (!this.allowedChatIds.has(message.chatId)) {
      this.auditRejected(message, 'unauthorized-chat', 'Feishu chat is not allowlisted.')
      return {
        status: 'unauthorized-chat',
        message,
        parsed: null,
        reason: 'Feishu chat is not allowlisted.'
      }
    }

    if (!this.allowedUserIds.has(message.userId)) {
      this.auditRejected(message, 'unauthorized-user', 'Feishu user is not allowlisted.')
      return {
        status: 'unauthorized-user',
        message,
        parsed: null,
        reason: 'Feishu user is not allowlisted.'
      }
    }

    const parsed = parseFeishuRemoteInput(message.text)
    if (!parsed) {
      this.auditRejected(
        message,
        normalizeText(message.text) ? 'unknown-command' : 'empty',
        normalizeText(message.text) ? 'Unsupported Feishu remote command.' : 'Empty Feishu message was ignored.'
      )
      return {
        status: normalizeText(message.text) ? 'unknown-command' : 'empty',
        message,
        parsed: null,
        reason: normalizeText(message.text) ? 'Unsupported Feishu remote command.' : 'Empty Feishu message was ignored.'
      }
    }

    return {
      status: 'accepted',
      message,
      parsed,
      reason: null
    }
  }

  private isDuplicate(messageId: string): boolean {
    return this.seenMessageIdSet.has(messageId)
  }

  private rememberMessageId(messageId: string): void {
    this.seenMessageIds.push(messageId)
    this.seenMessageIdSet.add(messageId)

    while (this.seenMessageIds.length > this.maxSeenMessageIds) {
      const expiredMessageId = this.seenMessageIds.shift()
      if (expiredMessageId) {
        this.seenMessageIdSet.delete(expiredMessageId)
      }
    }
  }

  private auditRejected(message: FeishuRemoteBridgeInboundMessage, command: string | null, reason: string): void {
    this.options.auditSink?.record(
      createRemoteBridgeAuditRecord({
        timestamp: message.timestamp,
        action: 'rejected',
        result: 'rejected',
        actorUserId: message.userId,
        chatId: message.chatId,
        targetPanelId: null,
        command,
        reason,
        inputLength: null
      })
    )
  }
}
