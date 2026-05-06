export interface CleanedOutput {
  content: string
  changed: boolean
}

export interface TruncatedOutput {
  content: string
  truncated: boolean
}

export interface RemoteOutputCoalescerOptions {
  maxMessageCharacters: number
  debounceMs: number
  proactiveDelivery: boolean
  schedule?: (callback: () => void, delayMs: number) => unknown
  cancel?: (handle: unknown) => void
}

export interface FeishuOutputClient {
  sendText(chatId: string, text: string): Promise<{ messageId: string | null }>
  updateCard?(messageId: string, text: string): Promise<void>
  sendCard?(chatId: string, text: string): Promise<{ messageId: string | null }>
}

export interface FeishuOutputDeliveryInput {
  chatId: string
  text: string
  mode: 'text' | 'card'
  messageId?: string | null
}

export interface FeishuOutputDeliveryResult {
  ok: boolean
  messageId: string | null
  usedFallback: boolean
  error: string | null
}

const ANSI_PATTERN =
  /[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/gu
const OSC_PATTERN = /\u001b\][^\u0007]*(?:\u0007|\u001b\\)/gu
const REDRAW_CLEAR_LINE_PATTERN = /\u001b\[[0-9;?]*[JK]/gu
const IMPORTANT_OUTPUT_PATTERN = /\b(error|failed|complete|completed|done|finished|approval|required|permission)\b/iu
const TRUNCATION_NOTICE = '[Output truncated]\n'

export function cleanTerminalOutput(value: string): CleanedOutput {
  const original = value
  let content = value.replace(OSC_PATTERN, '').replace(REDRAW_CLEAR_LINE_PATTERN, '').replace(ANSI_PATTERN, '')

  while (/[^\b]\u0008/u.test(content)) {
    content = content.replace(/[^\b]\u0008/gu, '')
  }

  content = content
    .split(/\n/u)
    .map((line) => {
      const carriageParts = line.split('\r')
      return carriageParts.at(-1) ?? ''
    })
    .join('\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/gu, '')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()

  return {
    content,
    changed: content !== original
  }
}

export function truncateFeishuOutput(value: string, maxCharacters: number): TruncatedOutput {
  const normalizedMax = Math.max(1, Math.floor(maxCharacters))
  if (value.length <= normalizedMax) {
    return {
      content: value,
      truncated: false
    }
  }

  const tailLength = Math.max(1, normalizedMax - TRUNCATION_NOTICE.length)
  return {
    content: `${TRUNCATION_NOTICE}${value.slice(value.length - tailLength)}`,
    truncated: true
  }
}

export function isImportantRemoteOutput(value: string): boolean {
  return IMPORTANT_OUTPUT_PATTERN.test(value)
}

export class RemoteOutputCoalescer {
  private pending = ''
  private timer: unknown = null
  private readonly schedule: (callback: () => void, delayMs: number) => unknown
  private readonly cancel: (handle: unknown) => void

  constructor(
    private readonly deliver: (output: TruncatedOutput) => void,
    private readonly options: RemoteOutputCoalescerOptions
  ) {
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs))
    this.cancel = options.cancel ?? ((handle) => clearTimeout(handle as NodeJS.Timeout))
  }

  push(chunk: string): void {
    const cleaned = cleanTerminalOutput(chunk)
    if (!cleaned.content) {
      return
    }

    this.pending += chunk
    if (this.options.proactiveDelivery && isImportantRemoteOutput(cleaned.content)) {
      this.flush()
      return
    }

    this.armTimer()
  }

  flush(): void {
    if (this.timer) {
      this.cancel(this.timer)
      this.timer = null
    }
    if (!this.pending) {
      return
    }

    const cleaned = cleanTerminalOutput(this.pending)
    this.pending = ''
    if (!cleaned.content) {
      return
    }

    const output = truncateFeishuOutput(cleaned.content, this.options.maxMessageCharacters)
    this.deliver(output)
  }

  private armTimer(): void {
    if (this.timer) {
      this.cancel(this.timer)
    }

    this.timer = this.schedule(() => {
      this.timer = null
      this.flush()
    }, Math.max(0, Math.floor(this.options.debounceMs)))
  }
}

export async function deliverFeishuOutput(
  client: FeishuOutputClient,
  input: FeishuOutputDeliveryInput
): Promise<FeishuOutputDeliveryResult> {
  if (input.mode === 'card' && input.messageId && client.updateCard) {
    try {
      await client.updateCard(input.messageId, input.text)
      return {
        ok: true,
        messageId: input.messageId,
        usedFallback: false,
        error: null
      }
    } catch {
      const fallback = await client.sendText(input.chatId, input.text)
      return {
        ok: true,
        messageId: fallback.messageId,
        usedFallback: true,
        error: null
      }
    }
  }

  if (input.mode === 'card' && client.sendCard) {
    try {
      const sent = await client.sendCard(input.chatId, input.text)
      return {
        ok: true,
        messageId: sent.messageId,
        usedFallback: false,
        error: null
      }
    } catch {
      const fallback = await client.sendText(input.chatId, input.text)
      return {
        ok: true,
        messageId: fallback.messageId,
        usedFallback: true,
        error: null
      }
    }
  }

  try {
    const sent = await client.sendText(input.chatId, input.text)
    return {
      ok: true,
      messageId: sent.messageId,
      usedFallback: false,
      error: null
    }
  } catch (error) {
    return {
      ok: false,
      messageId: null,
      usedFallback: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
