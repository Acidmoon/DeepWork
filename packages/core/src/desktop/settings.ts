export type LanguagePreference = 'system' | 'zh-CN' | 'en-US'
export type ThemePreference = 'system' | 'light' | 'dark'
export type ThreadContinuationPreference = 'continue-active-thread' | 'start-new-thread-per-scope'
export type CliRetrievalPreference = 'thread-first' | 'global-first'

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

export interface BuiltInTerminalPanelSettings {
  cwd?: string
  startupCommand?: string
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
  threadContinuationPreference: ThreadContinuationPreference
  cliRetrievalPreference: CliRetrievalPreference
  webPanels: Record<string, StoredWebPanelSettings>
  builtInTerminalPanels: Record<string, BuiltInTerminalPanelSettings>
  customWebPanels: CustomWebPanelSettings[]
  customTerminalPanels: CustomTerminalPanelSettings[]
}

export interface AppSettingsUpdate {
  language?: LanguagePreference
  theme?: ThemePreference
  workspaceRoot?: string | null
  terminalPreludeCommands?: string[]
  threadContinuationPreference?: ThreadContinuationPreference
  cliRetrievalPreference?: CliRetrievalPreference
  webPanels?: Record<string, StoredWebPanelSettings>
  builtInTerminalPanels?: Record<string, BuiltInTerminalPanelSettings>
  customWebPanels?: CustomWebPanelSettings[]
  customTerminalPanels?: CustomTerminalPanelSettings[]
}

export function normalizeThreadContinuationPreference(value: unknown): ThreadContinuationPreference {
  return value === 'start-new-thread-per-scope' ? 'start-new-thread-per-scope' : 'continue-active-thread'
}

export function normalizeCliRetrievalPreference(value: unknown): CliRetrievalPreference {
  return value === 'global-first' ? 'global-first' : 'thread-first'
}

export const defaultAppSettings: AppSettingsSnapshot = {
  language: 'system',
  theme: 'system',
  workspaceRoot: null,
  terminalPreludeCommands: ['proxy_on'],
  threadContinuationPreference: 'continue-active-thread',
  cliRetrievalPreference: 'thread-first',
  webPanels: {},
  builtInTerminalPanels: {},
  customWebPanels: [],
  customTerminalPanels: []
}
