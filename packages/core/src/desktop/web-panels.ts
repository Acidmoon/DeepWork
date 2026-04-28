export interface WebPanelConfig {
  id: string
  title: string
  homeUrl: string
  partition: string
  enabled: boolean
  allowPopups?: boolean
  userAgent?: string
}

export interface PanelBounds {
  x: number
  y: number
  width: number
  height: number
}

export type WebPanelNavigationAction = 'back' | 'forward' | 'reload' | 'home' | 'load-url'

export interface WebPanelSnapshot {
  panelId: string
  title: string
  homeUrl: string
  currentUrl: string
  partition: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  enabled: boolean
  lastError: string | null
}

export type WebPanelUrlValidationError = 'empty' | 'invalid' | 'unsupported-protocol'

export interface WebPanelUrlValidationResult {
  ok: boolean
  url: string | null
  error: WebPanelUrlValidationError | null
}

const EXPLICIT_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//iu
const SCHEME_LIKE_PATTERN = /^[a-z][a-z0-9+.-]*:/iu
const LOOPBACK_OR_DOMAIN_WITH_OPTIONAL_PORT_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[[0-9a-f:]+\]|(?:[a-z0-9-]+\.)+[a-z0-9-]+)(?::\d+)?(?:[/?#].*)?$/iu
const LOOPBACK_WITH_OPTIONAL_PORT_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[[0-9a-f:]+\])(?::\d+)?(?:[/?#].*)?$/iu

export const webPanelConfigs: WebPanelConfig[] = [
  {
    id: 'deepseek-web',
    title: 'DeepSeek Web',
    homeUrl: 'https://chat.deepseek.com/',
    partition: 'persist:deepseek-web',
    enabled: true
  },
  {
    id: 'minimax-web',
    title: 'MiniMax Web',
    homeUrl: 'https://chat.minimax.io/',
    partition: 'persist:minimax-web',
    enabled: false
  }
]

export const webPanelConfigMap = Object.fromEntries(
  webPanelConfigs.map((config) => [config.id, config] satisfies [string, WebPanelConfig])
)

export function getWebPanelConfig(panelId: string): WebPanelConfig | undefined {
  return webPanelConfigMap[panelId]
}

export function normalizeWebPanelUrl(rawUrl: string): WebPanelUrlValidationResult {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return {
      ok: false,
      url: null,
      error: 'empty'
    }
  }

  let candidate = trimmed

  if (EXPLICIT_PROTOCOL_PATTERN.test(trimmed)) {
    candidate = trimmed
  } else if (SCHEME_LIKE_PATTERN.test(trimmed) && !LOOPBACK_OR_DOMAIN_WITH_OPTIONAL_PORT_PATTERN.test(trimmed)) {
    return {
      ok: false,
      url: null,
      error: 'unsupported-protocol'
    }
  } else {
    const protocolPrefix = LOOPBACK_WITH_OPTIONAL_PORT_PATTERN.test(trimmed) ? 'http://' : 'https://'
    candidate = `${protocolPrefix}${trimmed}`
  }

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        ok: false,
        url: null,
        error: 'unsupported-protocol'
      }
    }

    if (!parsed.hostname) {
      return {
        ok: false,
        url: null,
        error: 'invalid'
      }
    }

    return {
      ok: true,
      url: parsed.toString(),
      error: null
    }
  } catch {
    return {
      ok: false,
      url: null,
      error: 'invalid'
    }
  }
}

export function isSafeWebPanelUrl(rawUrl: string): boolean {
  return normalizeWebPanelUrl(rawUrl).ok
}
