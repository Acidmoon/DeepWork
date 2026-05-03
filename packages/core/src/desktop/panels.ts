import {
  defaultAppSettings,
  type CliRetrievalPreference,
  type CustomTerminalPanelSettings,
  type CustomWebPanelSettings,
  type LanguagePreference,
  type TerminalBehaviorSettings,
  type ThemePreference,
  type ThreadContinuationPreference,
  type WorkspaceProfileSettings
} from './settings'
import { getTerminalPanelConfig } from './terminal-panels'
import type { TerminalPanelSnapshot, TerminalPanelStatus, TerminalRetrievalSummary } from './terminal-panels'
import { getWebPanelConfig } from './web-panels'
import type { WebPanelSnapshot } from './web-panels'
import type {
  ArtifactRecord,
  ContextIndexEntry,
  ContextThreadSummary,
  ManagedSessionContinuitySummary,
  WorkspaceSnapshot
} from './workspace'

export type PanelKind = 'home' | 'web' | 'terminal' | 'workspace' | 'settings'

export type PanelState = 'scaffolded' | 'planned' | 'validated'

export interface PanelDefinition {
  id: string
  title: string
  sectionId: string
  group: string
  kind: PanelKind
  state: PanelState
  summary: string
  nextStep: string
  delivery: string
  signal: string
  pinned?: boolean
  defaultVisible?: boolean
  userDefined?: boolean
}

export interface NavigationSection {
  id: string
  title: string
  caption: string
  panelIds: string[]
}

export interface HomePanelViewState {
  kind: 'home'
  focusArea: string
  checklist: string[]
}

export interface WebPanelViewState {
  kind: 'web'
  homeUrl: string
  currentUrl: string
  partition: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  enabled: boolean
  sessionPersisted: boolean
  showDetails: boolean
  lastError: string | null
  contextLabel: string | null
  sessionScopeId: string | null
  threadId: string | null
  threadTitle: string | null
  continuitySummary: ManagedSessionContinuitySummary | null
}

export interface TerminalPanelViewState {
  kind: 'terminal'
  shell: string
  shellArgs: string[]
  cwd: string
  startupCommand: string
  savedShell: string
  savedShellArgs: string[]
  savedCwd: string
  savedStartupCommand: string
  draftShell: string
  draftShellArgsText: string
  draftCwd: string
  draftStartupCommand: string
  pendingRestart: boolean
  launchCount: number
  status: TerminalPanelStatus
  hasSession: boolean
  isRunning: boolean
  pid: number | null
  cols: number
  rows: number
  bufferSize: number
  logPath: string
  terminalBehavior: TerminalBehaviorSettings
  showDetails: boolean
  lastExitCode: number | null
  lastExitSignal: number | null
  lastError: string | null
  contextLabel: string | null
  sessionScopeId: string | null
  threadId: string | null
  threadTitle: string | null
  continuitySummary: ManagedSessionContinuitySummary | null
  retrievalSummary: TerminalRetrievalSummary | null
}

export interface WorkspacePanelViewState {
  kind: 'workspace'
  selectedBucket: string
  selectedOrigin: string
  threadFilterMode: 'active' | 'all'
  searchQuery: string
  draftContextLabel: string
  selectedArtifactIds: string[]
  previewArtifactId: string | null
  projectId: string
  workspaceRoot: string
  manifestPath: string
  contextIndexPath: string
  originManifestsPath: string
  threadIndexPath: string
  threadManifestsPath: string
  rulesPath: string
  initialized: boolean
  artifactCount: number
  bucketCounts: Record<string, number>
  contextEntries: ContextIndexEntry[]
  threads: ContextThreadSummary[]
  activeThreadId: string | null
  activeThreadTitle: string | null
  artifacts: ArtifactRecord[]
  recentArtifacts: ArtifactRecord[]
  lastSavedArtifactId: string | null
  lastError: string | null
}

export interface SettingsOptionPlaceholder {
  id: string
  label: string
  description: string
  status: 'planned' | 'placeholder'
}

export interface SettingsPanelViewState {
  kind: 'settings'
  language: LanguagePreference
  theme: ThemePreference
  workspaceRoot: string | null
  workspaceProfiles: WorkspaceProfileSettings[]
  defaultWorkspaceProfileId: string | null
  workspaceProfileDraftName: string
  workspaceProfileError: string | null
  terminalPreludeText: string
  terminalBehavior: TerminalBehaviorSettings
  threadContinuationPreference: ThreadContinuationPreference
  cliRetrievalPreference: CliRetrievalPreference
  placeholders: SettingsOptionPlaceholder[]
  notes: string
}

export type PanelViewState =
  | HomePanelViewState
  | WebPanelViewState
  | TerminalPanelViewState
  | WorkspacePanelViewState
  | SettingsPanelViewState

export interface ManagedPanel {
  definition: PanelDefinition
  isVisible: boolean
  hasBeenOpened: boolean
  activationCount: number
  lastActivatedAt: string
  lastStatusCheckAt: string
  statusText: string
  viewState: PanelViewState
}

export type WebPanelStateUpdate = WebPanelSnapshot
export type TerminalPanelStateUpdate = TerminalPanelSnapshot
export type WorkspaceStateUpdate = WorkspaceSnapshot

export const panelRegistry: PanelDefinition[] = [
  {
    id: 'home',
    title: 'Project Home',
    sectionId: 'overview',
    group: 'Workbench',
    kind: 'home',
    state: 'scaffolded',
    summary: '工作台壳层、Web/Terminal 面板、Workspace 检索与档案设置已经接入正式应用。',
    nextStep: '先选择或恢复工作区，再从网页、CLI 和工作区检查面继续当前任务。',
    delivery: '当前版本已支持工作区选择、网页捕获、终端会话、工件索引、线程连续性和设置同步。',
    signal: 'Workspace live',
    pinned: true,
    defaultVisible: true
  },
  {
    id: 'deepseek-web',
    title: 'DeepSeek Web',
    sectionId: 'web',
    group: 'Web Apps',
    kind: 'web',
    state: 'validated',
    summary: 'DeepSeek 现已通过独立 WebContentsView 接入，并使用 persist partition 保持登录态。',
    nextStep: '网页会话可通过工作区同步保存，并与当前线程和范围元数据关联。',
    delivery: '托管网页面板：安全导航、持久分区、捕获同步与配置恢复。',
    signal: 'Persistent web session'
  },
  {
    id: 'minimax-web',
    title: 'MiniMax Web',
    sectionId: 'web',
    group: 'Web Apps',
    kind: 'web',
    state: 'validated',
    summary: 'MiniMax 作为内置网页预设接入托管 WebContentsView，并使用 persist partition 保持登录态。',
    nextStep: '需要固定 MiniMax 入口时直接打开，也可以通过配置面板禁用或调整主页。',
    delivery: '托管网页面板：内置 MiniMax 预设、持久分区、安全导航与配置覆盖。',
    signal: 'Persistent web session'
  },
  {
    id: 'codex-cli',
    title: 'Codex CLI',
    sectionId: 'agents',
    group: 'CLI Agents',
    kind: 'terminal',
    state: 'validated',
    summary: 'Codex CLI 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
    nextStep: 'CLI 会话会携带当前工作区与线程身份，按设置优先检索相关上下文。',
    delivery: '托管终端面板：PTY 会话、配置持久化、终端行为设置与检索审计。',
    signal: 'Codex terminal live'
  },
  {
    id: 'claude-code',
    title: 'Claude Code',
    sectionId: 'agents',
    group: 'CLI Agents',
    kind: 'terminal',
    state: 'validated',
    summary: 'Claude Code 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
    nextStep: 'CLI 会话会携带当前工作区与线程身份，按设置优先检索相关上下文。',
    delivery: '托管终端面板：PTY 会话、配置持久化、终端行为设置与检索审计。',
    signal: 'Claude terminal live'
  },
  {
    id: 'artifacts',
    title: 'Artifacts',
    sectionId: 'workspace',
    group: 'Workspace',
    kind: 'workspace',
    state: 'validated',
    summary: '工作区清单、线程、搜索、筛选、多选和工件预览已接入检查面。',
    nextStep: '用这里检查保存的手动、网页、终端和检索审计记录。',
    delivery: 'Workspace 检查面：索引、线程、范围、工件预览和修复入口。',
    signal: 'Manifest live'
  },
  {
    id: 'logs',
    title: 'Logs',
    sectionId: 'workspace',
    group: 'Workspace',
    kind: 'workspace',
    state: 'validated',
    summary: 'Workspace 日志检查面可按 logs/ 桶位查看终端转录、检索审计和其他日志类记录。',
    nextStep: '用这里筛选、搜索和预览归档到 logs/ 的审计或排障材料。',
    delivery: 'Workspace 日志检查面：日志桶筛选、元数据列表和文本预览。',
    signal: 'Logs inspector live'
  },
  {
    id: 'settings',
    title: 'Settings',
    sectionId: 'system',
    group: 'System',
    kind: 'settings',
    state: 'scaffolded',
    summary: '设置面板承接应用级偏好项，当前版本已支持工作区档案、语言、主题、CLI 前置命令、终端行为与跨会话连续性设置。',
    nextStep: '继续根据真实使用补充更细粒度的应用偏好。',
    delivery: '设置面板：工作区档案、外观、终端行为、跨会话连续性和 CLI 检索默认值。',
    signal: 'Preferences live'
  }
]

export const navigationSections: NavigationSection[] = [
  {
    id: 'overview',
    title: 'Workbench',
    caption: '当前工作台已接入真实网页、终端、工作区检查和设置同步能力。',
    panelIds: ['home']
  },
  {
    id: 'web',
    title: 'Web Apps',
    caption: 'DeepSeek、MiniMax 与自定义网页共用同一套托管网页面板生命周期。',
    panelIds: ['deepseek-web', 'minimax-web']
  },
  {
    id: 'agents',
    title: 'CLI Agents',
    caption: 'Codex CLI 与 Claude Code 现在都由主进程 PTY 托管，切换标签时会话不会丢。',
    panelIds: ['codex-cli', 'claude-code']
  },
  {
    id: 'workspace',
    title: 'Workspace',
    caption: '工作区已经落地到真实目录与 manifest，并支持工件、日志、预览、线程和自动检索检查。',
    panelIds: ['artifacts', 'logs']
  },
  {
    id: 'system',
    title: 'System',
    caption: '应用级配置集中在这里，当前已支持工作区档案、终端行为与连续性设置。',
    panelIds: ['settings']
  }
]

const DEFAULT_TERMINAL_COLS = 120
const DEFAULT_TERMINAL_ROWS = 32
const DISABLED_WEB_PANEL_ERROR = 'Disabled until enabled'

function shellArgsToEditorText(shellArgs: string[]): string {
  return shellArgs.join('\n')
}

export const defaultSettingsPlaceholders: SettingsOptionPlaceholder[] = [
]

export function createDefaultPanelViewState(panel: PanelDefinition): PanelViewState {
  switch (panel.kind) {
    case 'home':
      return {
        kind: 'home',
        focusArea: 'Terminal Manager',
        checklist: ['Electron shell live', 'Web panel manager live', 'Terminal manager live']
      }
    case 'web': {
      const config = getWebPanelConfig(panel.id)
      const homeUrl = config?.homeUrl ?? 'https://example.com/'

      return {
        kind: 'web',
        homeUrl,
        currentUrl: homeUrl,
        partition: config?.partition ?? `persist:${panel.id}`,
        title: panel.title,
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        enabled: config?.enabled ?? false,
        sessionPersisted: (config?.partition ?? '').startsWith('persist:'),
        showDetails: false,
        lastError: config?.enabled === false ? DISABLED_WEB_PANEL_ERROR : null,
        contextLabel: null,
        sessionScopeId: null,
        threadId: null,
        threadTitle: null,
        continuitySummary: null
      }
    }
    case 'terminal': {
      const config = getTerminalPanelConfig(panel.id)

      return {
        kind: 'terminal',
        shell: config?.shell ?? 'powershell.exe',
        shellArgs: config?.shellArgs ?? [],
        cwd: '.',
        startupCommand: config?.startupCommand ?? (panel.id === 'codex-cli' ? 'codex' : 'claude'),
        savedShell: config?.shell ?? 'powershell.exe',
        savedShellArgs: config?.shellArgs ?? [],
        savedCwd: '',
        savedStartupCommand: '',
        draftShell: config?.shell ?? 'powershell.exe',
        draftShellArgsText: shellArgsToEditorText(config?.shellArgs ?? []),
        draftCwd: '',
        draftStartupCommand: '',
        pendingRestart: false,
        launchCount: 0,
        status: 'idle',
        hasSession: false,
        isRunning: false,
        pid: null,
        cols: DEFAULT_TERMINAL_COLS,
        rows: DEFAULT_TERMINAL_ROWS,
        bufferSize: 0,
        logPath: '',
        terminalBehavior: defaultAppSettings.terminalBehavior,
        showDetails: false,
        lastExitCode: null,
        lastExitSignal: null,
        lastError: null,
        contextLabel: null,
        sessionScopeId: null,
        threadId: null,
        threadTitle: null,
        continuitySummary: null,
        retrievalSummary: null
      }
    }
    case 'workspace':
      return {
        kind: 'workspace',
        selectedBucket: panel.id === 'artifacts' ? 'artifacts/' : 'logs/',
        selectedOrigin: 'all',
        threadFilterMode: 'active',
        searchQuery: '',
        draftContextLabel: '',
        selectedArtifactIds: [],
        previewArtifactId: null,
        projectId: 'default',
        workspaceRoot: '',
        manifestPath: '',
        contextIndexPath: '',
        originManifestsPath: '',
        threadIndexPath: '',
        threadManifestsPath: '',
        rulesPath: '',
        initialized: false,
        artifactCount: 0,
        bucketCounts: {
          'artifacts/': 0,
          'outputs/': 0,
          'logs/': 0
        },
        contextEntries: [],
        threads: [],
        activeThreadId: null,
        activeThreadTitle: null,
        artifacts: [],
        recentArtifacts: [],
        lastSavedArtifactId: null,
        lastError: null
      }
    case 'settings':
      return {
        kind: 'settings',
        language: defaultAppSettings.language,
        theme: defaultAppSettings.theme,
        workspaceRoot: defaultAppSettings.workspaceRoot,
        workspaceProfiles: defaultAppSettings.workspaceProfiles,
        defaultWorkspaceProfileId: defaultAppSettings.defaultWorkspaceProfileId,
        workspaceProfileDraftName: '',
        workspaceProfileError: null,
        terminalPreludeText: defaultAppSettings.terminalPreludeCommands.join('\n'),
        terminalBehavior: defaultAppSettings.terminalBehavior,
        threadContinuationPreference: defaultAppSettings.threadContinuationPreference,
        cliRetrievalPreference: defaultAppSettings.cliRetrievalPreference,
        placeholders: defaultSettingsPlaceholders,
        notes: 'Settings panel now includes workspace profiles, terminal behavior, continuity defaults, and CLI retrieval preferences.'
      }
  }
}

export function createManagedPanel(panel: PanelDefinition, timestamp: string): ManagedPanel {
  return {
    definition: panel,
    isVisible: panel.defaultVisible ?? false,
    hasBeenOpened: panel.defaultVisible ?? false,
    activationCount: panel.defaultVisible ? 1 : 0,
    lastActivatedAt: panel.defaultVisible ? timestamp : 'Not opened yet',
    lastStatusCheckAt: panel.defaultVisible ? timestamp : 'Not checked yet',
    statusText: panel.defaultVisible ? 'Workbench ready' : 'Registered and waiting',
    viewState: createDefaultPanelViewState(panel)
  }
}

export function createInitialPanels(timestamp: string, panels: PanelDefinition[] = panelRegistry): Record<string, ManagedPanel> {
  return Object.fromEntries(panels.map((panel) => [panel.id, createManagedPanel(panel, timestamp)]))
}

export function createCustomWebPanelDefinition(
  config: CustomWebPanelSettings,
  sections: NavigationSection[] = navigationSections
): PanelDefinition {
  const section = sections.find((item) => item.id === config.sectionId)

  return {
    id: config.id,
    title: config.title,
    sectionId: config.sectionId,
    group: section?.title ?? config.sectionId,
    kind: 'web',
    state: config.enabled ? 'validated' : 'scaffolded',
    summary: 'User-defined web page that can be opened and managed inside the workbench.',
    nextStep: 'Edit the target URL, partition, and enabled state directly from the panel.',
    delivery: 'Custom web page configuration.',
    signal: 'Custom webpage',
    userDefined: true
  }
}

export function createCustomTerminalPanelDefinition(
  config: CustomTerminalPanelSettings,
  sections: NavigationSection[] = navigationSections
): PanelDefinition {
  const section = sections.find((item) => item.id === config.sectionId)

  return {
    id: config.id,
    title: config.title,
    sectionId: config.sectionId,
    group: section?.title ?? config.sectionId,
    kind: 'terminal',
    state: 'validated',
    summary: 'User-defined terminal panel.',
    nextStep: 'Open the terminal and run the target CLI or workflow directly from the shell session.',
    delivery: 'Custom terminal configuration.',
    signal: 'Custom CLI',
    userDefined: true
  }
}

export function createCustomWebPanelViewState(config: CustomWebPanelSettings): WebPanelViewState {
  return {
    kind: 'web',
    homeUrl: config.homeUrl,
    currentUrl: config.homeUrl,
    partition: config.partition,
    title: config.title,
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    enabled: config.enabled,
    sessionPersisted: config.partition.startsWith('persist:'),
    showDetails: false,
    lastError: config.enabled ? null : DISABLED_WEB_PANEL_ERROR,
    contextLabel: null,
    sessionScopeId: null,
    threadId: null,
    threadTitle: null,
    continuitySummary: null
  }
}

export function createCustomTerminalPanelViewState(
  config: CustomTerminalPanelSettings,
  terminalBehavior: TerminalBehaviorSettings = defaultAppSettings.terminalBehavior
): TerminalPanelViewState {
  return {
    kind: 'terminal',
    shell: config.shell,
    shellArgs: config.shellArgs,
    cwd: config.cwd ?? '.',
    startupCommand: config.startupCommand,
    savedShell: config.shell,
    savedShellArgs: config.shellArgs,
    savedCwd: config.cwd ?? '',
    savedStartupCommand: config.startupCommand,
    draftShell: config.shell,
    draftShellArgsText: shellArgsToEditorText(config.shellArgs),
    draftCwd: config.cwd ?? '',
    draftStartupCommand: config.startupCommand,
    pendingRestart: false,
    launchCount: 0,
    status: 'idle',
    hasSession: false,
    isRunning: false,
    pid: null,
    cols: DEFAULT_TERMINAL_COLS,
    rows: DEFAULT_TERMINAL_ROWS,
    bufferSize: 0,
    logPath: '',
    terminalBehavior,
    showDetails: false,
    lastExitCode: null,
    lastExitSignal: null,
    lastError: null,
    contextLabel: null,
    sessionScopeId: null,
    threadId: null,
    threadTitle: null,
    continuitySummary: null,
    retrievalSummary: null
  }
}

export function nextActivePanelId(panels: Record<string, ManagedPanel>, preferredPanelId?: string): string {
  if (preferredPanelId && panels[preferredPanelId]?.isVisible) {
    return preferredPanelId
  }

  const visiblePanel = Object.values(panels).find((panel) => panel.isVisible)
  return visiblePanel?.definition.id ?? 'home'
}

export function getManagedPanel(panelId: string, panels: Record<string, ManagedPanel>): ManagedPanel | undefined {
  return panels[panelId]
}

export function getSectionPanels(
  sectionId: string,
  panels: Record<string, ManagedPanel>,
  panelOrder: string[] = Object.keys(panels)
): ManagedPanel[] {
  return panelOrder.map((panelId) => panels[panelId]).filter((panel) => panel?.definition.sectionId === sectionId)
}
