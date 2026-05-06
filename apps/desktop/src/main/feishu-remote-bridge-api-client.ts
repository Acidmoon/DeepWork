import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'
import type {
  FeishuRemoteBridgeClient,
  FeishuRemoteBridgeInboundMessage
} from './feishu-remote-work-bridge'
import type { FeishuOutputClient } from './remote-output-delivery'

interface FetchResponseLike {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

type FetchLike = (
  input: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  }
) => Promise<FetchResponseLike>

interface FeishuTokenResponse {
  code?: number
  msg?: string
  tenant_access_token?: string
  expire?: number
}

interface FeishuMessageListResponse {
  code?: number
  msg?: string
  data?: {
    items?: FeishuMessageListItem[]
  }
}

interface FeishuMessageListItem {
  message_id?: string
  msg_type?: string
  create_time?: string | number
  sender?: {
    id?: string
    id_type?: string
    sender_id?: {
      user_id?: string
      open_id?: string
      union_id?: string
    }
  }
  body?: {
    content?: string
  }
  content?: string
}

interface FeishuSendMessageResponse {
  code?: number
  msg?: string
  data?: {
    message_id?: string
  }
}

interface FeishuBotInfoResponse {
  code?: number
  msg?: string
  data?: {
    bot?: {
      app_id?: string
      open_id?: string
      user_id?: string
    }
  }
}

export interface FeishuRemoteBridgeApiClientOptions {
  fetch?: FetchLike
  now?: () => number
  maxIgnoredMessageIds?: number
}

function normalizeApiBase(value: string): string {
  return value.trim().replace(/\/+$/u, '')
}

function buildUrl(apiBase: string, path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${normalizeApiBase(apiBase)}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFeishuTime(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function parseFeishuTextContent(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (isRecord(parsed)) {
      const text = parsed.text
      const content = parsed.content
      return typeof text === 'string' ? text : typeof content === 'string' ? content : value
    }
  } catch {
    return value
  }

  return value
}

function extractSenderId(item: FeishuMessageListItem): string {
  return (
    item.sender?.id ??
    item.sender?.sender_id?.user_id ??
    item.sender?.sender_id?.open_id ??
    item.sender?.sender_id?.union_id ??
    ''
  )
}

function ensureFeishuSuccess<T extends { code?: number; msg?: string }>(data: T, action: string): T {
  if (data.code !== 0) {
    throw new Error(`${action} failed: ${data.msg ?? 'unknown Feishu API error'}`)
  }
  return data
}

export class FeishuRemoteBridgeApiClient implements FeishuRemoteBridgeClient, FeishuOutputClient {
  private accessToken: string | null = null
  private tokenExpiresAt = 0
  private botUserId: string | null = null
  private readonly fetchImpl: FetchLike
  private readonly now: () => number
  private readonly ignoredMessageIds: string[] = []
  private readonly ignoredMessageIdSet = new Set<string>()
  private readonly lastPollTimeByChatId = new Map<string, number>()
  private readonly maxIgnoredMessageIds: number
  private readonly startupTime: number

  constructor(
    private readonly settings: RemoteBridgeSettings,
    options: FeishuRemoteBridgeApiClientOptions = {}
  ) {
    this.fetchImpl = options.fetch ?? fetch
    this.now = options.now ?? (() => Date.now())
    this.maxIgnoredMessageIds = Math.max(1, Math.floor(options.maxIgnoredMessageIds ?? 1000))
    this.startupTime = this.now()
    for (const chatId of settings.allowedChatIds) {
      this.lastPollTimeByChatId.set(chatId, this.startupTime)
    }
  }

  async fetchMessages(): Promise<FeishuRemoteBridgeInboundMessage[]> {
    const token = await this.getAccessToken()
    await this.ensureBotUserId(token)

    const inboundMessages: FeishuRemoteBridgeInboundMessage[] = []
    for (const chatId of this.settings.allowedChatIds) {
      inboundMessages.push(...(await this.fetchChatMessages(token, chatId)))
    }

    return inboundMessages.sort((a, b) => Date.parse(a.timestamp ?? '') - Date.parse(b.timestamp ?? ''))
  }

  async sendText(chatId: string, text: string): Promise<{ messageId: string | null }> {
    const token = await this.getAccessToken()
    const response = await this.fetchImpl(
      buildUrl(this.settings.apiBase, '/im/v1/messages', {
        receive_id_type: 'chat_id'
      }),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: 'text',
          content: JSON.stringify({ text })
        })
      }
    )
    const data = ensureFeishuSuccess((await response.json()) as FeishuSendMessageResponse, 'Send Feishu text message')
    const messageId = data.data?.message_id ?? null
    if (messageId) {
      this.rememberIgnoredMessageId(messageId)
    }
    return { messageId }
  }

  async sendCard(chatId: string, text: string): Promise<{ messageId: string | null }> {
    const token = await this.getAccessToken()
    const response = await this.fetchImpl(
      buildUrl(this.settings.apiBase, '/im/v1/messages', {
        receive_id_type: 'chat_id'
      }),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: 'interactive',
          content: JSON.stringify(this.createCardContent(text))
        })
      }
    )
    const data = ensureFeishuSuccess((await response.json()) as FeishuSendMessageResponse, 'Send Feishu card message')
    const messageId = data.data?.message_id ?? null
    if (messageId) {
      this.rememberIgnoredMessageId(messageId)
    }
    return { messageId }
  }

  async updateCard(messageId: string, text: string): Promise<void> {
    const token = await this.getAccessToken()
    const response = await this.fetchImpl(buildUrl(this.settings.apiBase, `/im/v1/messages/${messageId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        content_type: 'interactive',
        content: JSON.stringify(this.createCardContent(text))
      })
    })
    ensureFeishuSuccess((await response.json()) as FeishuSendMessageResponse, 'Update Feishu card message')
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    const response = await this.fetchImpl(buildUrl(this.settings.apiBase, '/auth/v3/tenant_access_token/internal'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: this.settings.credentials.appId,
        app_secret: this.settings.credentials.appSecret
      })
    })
    const data = ensureFeishuSuccess((await response.json()) as FeishuTokenResponse, 'Get Feishu tenant access token')
    const token = data.tenant_access_token
    if (!token) {
      throw new Error('Get Feishu tenant access token failed: empty token')
    }

    this.accessToken = token
    this.tokenExpiresAt = this.now() + Math.max(60, (data.expire ?? 7200) - 600) * 1000
    return token
  }

  private async ensureBotUserId(token: string): Promise<void> {
    if (this.botUserId !== null) {
      return
    }

    try {
      const response = await this.fetchImpl(buildUrl(this.settings.apiBase, '/bot/v3/bot/get'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const data = ensureFeishuSuccess((await response.json()) as FeishuBotInfoResponse, 'Get Feishu bot info')
      this.botUserId = data.data?.bot?.user_id ?? data.data?.bot?.open_id ?? data.data?.bot?.app_id ?? ''
    } catch {
      this.botUserId = ''
    }
  }

  private async fetchChatMessages(token: string, chatId: string): Promise<FeishuRemoteBridgeInboundMessage[]> {
    const pollStartedAt = this.now()
    const previousPollTime = this.lastPollTimeByChatId.get(chatId) ?? this.startupTime
    const response = await this.fetchImpl(
      buildUrl(this.settings.apiBase, '/im/v1/messages', {
        container_id_type: 'chat',
        container_id: chatId,
        start_time: String(Math.floor(previousPollTime / 1000)),
        end_time: String(Math.floor(pollStartedAt / 1000)),
        page_size: '50'
      }),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    const data = ensureFeishuSuccess((await response.json()) as FeishuMessageListResponse, 'List Feishu messages')
    const items = [...(data.data?.items ?? [])].sort((a, b) => parseFeishuTime(a.create_time) - parseFeishuTime(b.create_time))
    let newestMessageTime = previousPollTime
    const messages: FeishuRemoteBridgeInboundMessage[] = []

    for (const item of items) {
      const messageId = item.message_id
      if (!messageId || item.msg_type !== 'text') {
        continue
      }

      const messageTime = parseFeishuTime(item.create_time)
      if (messageTime > 0) {
        newestMessageTime = Math.max(newestMessageTime, messageTime + 1)
      }
      if (messageTime > 0 && messageTime < this.startupTime) {
        continue
      }

      const senderId = extractSenderId(item)
      const text = parseFeishuTextContent(item.body?.content ?? item.content)
      messages.push({
        messageId,
        chatId,
        userId: senderId,
        senderId,
        isFromBot: this.ignoredMessageIdSet.has(messageId) || Boolean(this.botUserId && senderId === this.botUserId),
        text,
        timestamp: messageTime > 0 ? new Date(messageTime).toISOString() : new Date(pollStartedAt).toISOString()
      })
    }

    this.lastPollTimeByChatId.set(chatId, Math.max(newestMessageTime, pollStartedAt))
    return messages
  }

  private rememberIgnoredMessageId(messageId: string): void {
    this.ignoredMessageIds.push(messageId)
    this.ignoredMessageIdSet.add(messageId)

    while (this.ignoredMessageIds.length > this.maxIgnoredMessageIds) {
      const expiredMessageId = this.ignoredMessageIds.shift()
      if (expiredMessageId) {
        this.ignoredMessageIdSet.delete(expiredMessageId)
      }
    }
  }

  private createCardContent(text: string): Record<string, unknown> {
    return {
      config: {
        wide_screen_mode: true,
        update_multi: true
      },
      header: {
        template: 'blue',
        title: {
          tag: 'plain_text',
          content: 'DeepWork'
        }
      },
      elements: [
        {
          tag: 'markdown',
          content: text
        }
      ]
    }
  }
}
