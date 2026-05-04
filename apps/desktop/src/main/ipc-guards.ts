import type { AppSettingsUpdate } from '@ai-workbench/core/desktop/settings'
import type { TerminalResizePayload } from '@ai-workbench/core/desktop/terminal-panels'
import type { PanelBounds, WebPanelConfig, WebPanelNavigationAction } from '@ai-workbench/core/desktop/web-panels'
import type { SaveClipboardOptions } from '@ai-workbench/core/desktop/workspace'

const MAX_ID_LENGTH = 256
const MAX_TITLE_LENGTH = 240
const MAX_URL_LENGTH = 4096
const MAX_PARTITION_LENGTH = 256
const MAX_TERMINAL_WRITE_LENGTH = 1_000_000
const MAX_PANEL_EDGE = 20_000
const MAX_TERMINAL_DIMENSION = 1000
const SAFE_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9:._-]*$/iu
const WEB_PANEL_NAVIGATION_ACTIONS = new Set<WebPanelNavigationAction>(['back', 'forward', 'reload', 'home', 'load-url'])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) {
    return null
  }

  return trimmed
}

export function guardIdentifier(value: unknown): string | null {
  const candidate = normalizeBoundedString(value, MAX_ID_LENGTH)
  return candidate && SAFE_IDENTIFIER_PATTERN.test(candidate) ? candidate : null
}

export function guardOptionalIdentifier(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return guardIdentifier(value)
}

export function guardOptionalTitle(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return normalizeBoundedString(value, MAX_TITLE_LENGTH)
}

export function guardPanelBounds(value: unknown): PanelBounds | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const x = Number(value.x)
  const y = Number(value.y)
  const width = Number(value.width)
  const height = Number(value.height)

  if (![x, y, width, height].every(Number.isFinite)) {
    return null
  }

  if (Math.abs(x) > MAX_PANEL_EDGE || Math.abs(y) > MAX_PANEL_EDGE) {
    return null
  }

  if (width < 0 || height < 0 || width > MAX_PANEL_EDGE || height > MAX_PANEL_EDGE) {
    return null
  }

  return { x, y, width, height }
}

export function guardTerminalWrite(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_TERMINAL_WRITE_LENGTH) {
    return null
  }

  return value
}

export function guardTerminalResize(value: unknown): TerminalResizePayload | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const cols = Number(value.cols)
  const rows = Number(value.rows)
  if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
    return null
  }

  if (cols < 1 || rows < 1 || cols > MAX_TERMINAL_DIMENSION || rows > MAX_TERMINAL_DIMENSION) {
    return null
  }

  return { cols, rows }
}

export function guardWebPanelNavigationAction(value: unknown): WebPanelNavigationAction | null {
  return WEB_PANEL_NAVIGATION_ACTIONS.has(value as WebPanelNavigationAction)
    ? (value as WebPanelNavigationAction)
    : null
}

export function guardOptionalUrl(value: unknown): string | undefined | null {
  if (value === null || value === undefined) {
    return undefined
  }

  return normalizeBoundedString(value, MAX_URL_LENGTH)
}

export function guardWebPanelConfigUpdate(value: unknown): Pick<WebPanelConfig, 'homeUrl' | 'partition' | 'enabled'> | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const homeUrl = normalizeBoundedString(value.homeUrl, MAX_URL_LENGTH)
  const partition = normalizeBoundedString(value.partition, MAX_PARTITION_LENGTH)
  if (!homeUrl || !partition || typeof value.enabled !== 'boolean') {
    return null
  }

  return {
    homeUrl,
    partition,
    enabled: value.enabled
  }
}

export function guardSettingsUpdate(value: unknown): AppSettingsUpdate | null {
  return isPlainRecord(value) ? (value as AppSettingsUpdate) : null
}

export function guardSaveClipboardOptions(value: unknown): SaveClipboardOptions | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const origin = normalizeBoundedString(value.origin, MAX_ID_LENGTH)
  if (!origin) {
    return null
  }

  const contextLabel = value.contextLabel === undefined ? undefined : guardOptionalTitle(value.contextLabel)
  const threadId = value.threadId === undefined ? undefined : guardOptionalIdentifier(value.threadId)

  if ((value.contextLabel !== undefined && contextLabel === null) || (value.threadId !== undefined && threadId === null)) {
    return null
  }

  return {
    origin,
    ...(contextLabel ? { contextLabel } : {}),
    ...(threadId ? { threadId } : {})
  }
}
