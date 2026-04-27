export interface CapturedMessage {
  id: string
  role: string
  text: string
}

export function normalizeCapturedMessages(
  messages:
    | Array<{
        id?: string
        role?: string
        text?: string
      }>
    | undefined
): CapturedMessage[] {
  if (!messages) {
    return []
  }

  return messages
    .map((message, index) => ({
      id: message.id?.trim() || `message-${String(index + 1).padStart(3, '0')}`,
      role: message.role?.trim() || 'unknown',
      text: message.text?.trim() || ''
    }))
    .filter((message) => message.text.length >= 12)
}

export function deriveWebContextLabel(url: string, title: string, messages: CapturedMessage[]): string {
  const meaningfulMessage = messages.find((message) => message.role === 'user' || message.role === 'assistant')
  if (meaningfulMessage) {
    const seed = meaningfulMessage.text
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .slice(0, 5)

    if (seed.length > 0) {
      return seed.join('-')
    }
  }

  try {
    const parsed = new URL(url)
    const pathSegments = `${parsed.pathname} ${parsed.hash}`
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .slice(0, 5)

    if (pathSegments.length > 0) {
      return pathSegments.join('-')
    }

    const titleSegments = title
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .slice(0, 5)

    if (titleSegments.length > 0) {
      return titleSegments.join('-')
    }

    return parsed.hostname.replace(/[^a-z0-9]+/g, '-')
  } catch {
    const fallback = title
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .slice(0, 5)

    return fallback.length > 0 ? fallback.join('-') : 'default-context'
  }
}
