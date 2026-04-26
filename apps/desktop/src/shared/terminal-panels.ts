import type { CustomTerminalPanelSettings } from './settings'

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

export function getTerminalPanelConfig(panelId: string): TerminalPanelConfig | undefined {
  return terminalPanelConfigMap[panelId]
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
