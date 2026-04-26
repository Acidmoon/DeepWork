export type LanguagePreference = 'system' | 'zh-CN' | 'en-US'
export type ThemePreference = 'system' | 'light' | 'dark'

export interface CustomWebPanelSettings {
  id: string
  title: string
  sectionId: string
  homeUrl: string
  partition: string
  enabled: boolean
}

export interface CustomTerminalPanelSettings {
  id: string
  title: string
  sectionId: string
  shell: string
  shellArgs: string[]
  cwd?: string
  startupCommand: string
}

export interface StoredWebPanelSettings {
  homeUrl: string
  partition: string
  enabled: boolean
}

export interface AppSettingsSnapshot {
  language: LanguagePreference
  theme: ThemePreference
  workspaceRoot: string | null
  terminalPreludeCommands: string[]
  webPanels: Record<string, StoredWebPanelSettings>
  customWebPanels: CustomWebPanelSettings[]
  customTerminalPanels: CustomTerminalPanelSettings[]
}

export interface AppSettingsUpdate {
  language?: LanguagePreference
  theme?: ThemePreference
  workspaceRoot?: string | null
  terminalPreludeCommands?: string[]
  webPanels?: Record<string, StoredWebPanelSettings>
  customWebPanels?: CustomWebPanelSettings[]
  customTerminalPanels?: CustomTerminalPanelSettings[]
}

export const defaultAppSettings: AppSettingsSnapshot = {
  language: 'system',
  theme: 'system',
  workspaceRoot: null,
  terminalPreludeCommands: ['proxy_on'],
  webPanels: {},
  customWebPanels: [],
  customTerminalPanels: []
}
