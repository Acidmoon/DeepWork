import type { BuiltInTerminalPanelSettings, CustomTerminalPanelSettings } from './settings'
import type { ManagedSessionContinuitySummary } from './workspace'

export type TerminalPanelStatus = 'idle' | 'starting' | 'running' | 'exited' | 'error'

export interface TerminalPanelConfig {
  id: string
  title: string
  shell: string
  shellArgs: string[]
  cwd?: string
  startupPreludeCommands?: string[]
  startupCommand: string
  env?: Record<string, string>
}

export interface TerminalPanelSnapshot {
  panelId: string
  title: string
  shell: string
  shellArgs: string[]
  cwd: string
  startupCommand: string
  status: TerminalPanelStatus
  hasSession: boolean
  isRunning: boolean
  launchCount: number
  pid: number | null
  cols: number
  rows: number
  bufferSize: number
  logPath: string
  lastExitCode: number | null
  lastExitSignal: number | null
  lastError: string | null
  contextLabel: string | null
  sessionScopeId: string | null
  threadId: string | null
  threadTitle: string | null
  continuitySummary: ManagedSessionContinuitySummary | null
}

export interface TerminalPanelAttachPayload {
  snapshot: TerminalPanelSnapshot
  buffer: string
}

export interface TerminalOutputEvent {
  panelId: string
  data: string
}

export interface TerminalResizePayload {
  cols: number
  rows: number
}

export const terminalPanelConfigs: TerminalPanelConfig[] = [
  {
    id: 'codex-cli',
    title: 'Codex CLI',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
    startupPreludeCommands: ['proxy_on'],
    startupCommand: 'codex'
  },
  {
    id: 'claude-code',
    title: 'Claude Code',
    shell: 'powershell.exe',
    shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
    startupPreludeCommands: ['proxy_on'],
    startupCommand: 'claude'
  }
]

export const terminalPanelConfigMap = Object.fromEntries(
  terminalPanelConfigs.map((config) => [config.id, config] satisfies [string, TerminalPanelConfig])
)

export function applyBuiltInTerminalPanelSettings(
  config: TerminalPanelConfig,
  settings: BuiltInTerminalPanelSettings | undefined,
  startupPreludeCommands: string[] = config.startupPreludeCommands ?? []
): TerminalPanelConfig {
  return {
    ...config,
    cwd: settings?.cwd,
    startupPreludeCommands,
    startupCommand: settings?.startupCommand ?? config.startupCommand
  }
}

export function getTerminalPanelConfig(
  panelId: string,
  builtInSettings?: Record<string, BuiltInTerminalPanelSettings>,
  startupPreludeCommands?: string[]
): TerminalPanelConfig | undefined {
  const config = terminalPanelConfigMap[panelId]
  if (!config) {
    return undefined
  }

  return applyBuiltInTerminalPanelSettings(config, builtInSettings?.[panelId], startupPreludeCommands)
}

export function createCustomTerminalPanelConfig(config: CustomTerminalPanelSettings): TerminalPanelConfig {
  return {
    id: config.id,
    title: config.title,
    shell: config.shell,
    shellArgs: config.shellArgs,
    cwd: config.cwd,
    startupCommand: config.startupCommand
  }
}
