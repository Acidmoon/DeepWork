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
