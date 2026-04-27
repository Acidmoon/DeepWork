import type { CustomTerminalPanelSettings, CustomWebPanelSettings, LanguagePreference, ThemePreference } from './settings'
import { getTerminalPanelConfig } from './terminal-panels'
import type { TerminalPanelSnapshot, TerminalPanelStatus } from './terminal-panels'
import { getWebPanelConfig } from './web-panels'
import type { WebPanelSnapshot } from './web-panels'
import type { ArtifactRecord, ContextIndexEntry, WorkspaceSnapshot } from './workspace'

export type PanelKind = 'home' | 'web' | 'terminal' | 'workspace' | 'tool' | 'settings'

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
}

export interface TerminalPanelViewState {
  kind: 'terminal'
  shell: string
  cwd: string
  startupCommand: string
  launchCount: number
  status: TerminalPanelStatus
  hasSession: boolean
  isRunning: boolean
  pid: number | null
  cols: number
  rows: number
  bufferSize: number
  logPath: string
  showDetails: boolean
  lastExitCode: number | null
  lastExitSignal: number | null
  lastError: string | null
}

export interface WorkspacePanelViewState {
  kind: 'workspace'
  selectedBucket: string
  selectedOrigin: string
  searchQuery: string
  draftContextLabel: string
  selectedArtifactIds: string[]
  previewArtifactId: string | null
  promptTargetPanelId: string
  promptDraft: string
  projectId: string
  workspaceRoot: string
  manifestPath: string
  contextIndexPath: string
  originManifestsPath: string
  rulesPath: string
  initialized: boolean
  artifactCount: number
  bucketCounts: Record<string, number>
  contextEntries: ContextIndexEntry[]
  artifacts: ArtifactRecord[]
  recentArtifacts: ArtifactRecord[]
  lastSavedArtifactId: string | null
  lastError: string | null
}

export interface ToolPanelViewState {
  kind: 'tool'
  outputFormat: string
  lastArtifact: string
  notes: string
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
  terminalPreludeText: string
  placeholders: SettingsOptionPlaceholder[]
  notes: string
}

export type PanelViewState =
  | HomePanelViewState
  | WebPanelViewState
  | TerminalPanelViewState
  | WorkspacePanelViewState
  | ToolPanelViewState
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
    summary: '工作台壳层、真实 Web Panel、真实 Terminal Panel 与首版公共 Workspace 已经接入到正式应用。',
    nextStep: '继续推进 Phase 5，把 Artifact List 与 Preview 从当前基础索引升级为真正可操作视图。',
    delivery: 'Phase 4 交付物：公共 Workspace 已完成初始化并能保存剪贴板 Artifact。',
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
    nextStep: '后续在 Artifact 阶段增加网页内容捕获与工作区索引联动能力。',
    delivery: 'Phase 2 交付物：真实网页面板可导航、可保活。',
    signal: 'Persistent web session'
  },
  {
    id: 'minimax-web',
    title: 'MiniMax Web',
    sectionId: 'web',
    group: 'Web Apps',
    kind: 'web',
    state: 'scaffolded',
    summary: '保留为配置驱动的预留网页入口，当前版本不创建真实浏览器实例。',
    nextStep: '后续只需把配置切到 enabled，即可挂载真实 Web Panel。',
    delivery: '保留扩展位。',
    signal: 'Reserved config'
  },
  {
    id: 'codex-cli',
    title: 'Codex CLI',
    sectionId: 'agents',
    group: 'CLI Agents',
    kind: 'terminal',
    state: 'validated',
    summary: 'Codex CLI 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
    nextStep: '继续强化自动工作区检索，让 CLI 在提到某个会话时直接定位相关上下文。',
    delivery: 'Phase 3 交付物：Codex 终端面板已可启动与保活。',
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
    nextStep: '继续强化自动工作区检索，让 CLI 在提到某个会话时直接定位相关上下文。',
    delivery: 'Phase 3 交付物：Claude Code 终端面板已可启动与保活。',
    signal: 'Claude terminal live'
  },
  {
    id: 'artifacts',
    title: 'Artifacts',
    sectionId: 'workspace',
    group: 'Workspace',
    kind: 'workspace',
    state: 'validated',
    summary: '工作区目录、manifest 和剪贴板保存入口已落地，当前展示基础索引与最近 Artifact。',
    nextStep: '在 Phase 5 里接更完整的 Artifact List、选中态和预览入口。',
    delivery: 'Phase 4 交付物：Workspace + artifacts.json 第一版。',
    signal: 'Manifest live'
  },
  {
    id: 'logs',
    title: 'Logs',
    sectionId: 'workspace',
    group: 'Workspace',
    kind: 'workspace',
    state: 'scaffolded',
    summary: '公共 Workspace 已建立 logs 桶位，后续 CLI 与渲染日志会统一归档到这里。',
    nextStep: '在后续阶段补充真实日志索引、筛选和打开路径能力。',
    delivery: 'Phase 4 交付物：日志目录结构已落地。',
    signal: 'Log bucket ready'
  },
  {
    id: 'html-preview',
    title: 'HTML Preview',
    sectionId: 'tools',
    group: 'Tools',
    kind: 'tool',
    state: 'planned',
    summary: '后续会承接 HTML Artifact 的预览与导出入口。',
    nextStep: '在 Phase 7 接 Playwright 渲染和结果回写 manifest。',
    delivery: '预留工具视图。',
    signal: 'Render service pending'
  },
  {
    id: 'settings',
    title: 'Settings',
    sectionId: 'system',
    group: 'System',
    kind: 'settings',
    state: 'scaffolded',
    summary: '设置面板开始承接应用级偏好项，当前先落地语言选项与后续能力的占位配置。',
    nextStep: '继续把 CLI 工作区检索策略、默认工作区、终端启动策略等接入可配置项。',
    delivery: '首版设置面板：语言切换入口 + 可扩展占位。',
    signal: 'Preferences scaffolded'
  }
]

export const navigationSections: NavigationSection[] = [
  {
    id: 'overview',
    title: 'Workbench',
    caption: '当前工作台已接入真实网页和终端面板，下一步进入公共工作区能力。',
    panelIds: ['home']
  },
  {
    id: 'web',
    title: 'Web Apps',
    caption: 'DeepSeek 已正式接入，MiniMax 仍按配置保留为后续扩展位。',
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
    caption: '工作区已经落地到真实目录与 manifest，后续会继续把列表、预览和自动检索支撑接进来。',
    panelIds: ['artifacts', 'logs']
  },
  {
    id: 'tools',
    title: 'Tools',
    caption: '本地工具面板负责预览和导出，不直接承载编辑逻辑。',
    panelIds: ['html-preview']
  },
  {
    id: 'system',
    title: 'System',
    caption: '应用级配置集中在这里，当前先提供语言与后续功能占位。',
    panelIds: ['settings']
  }
]

const DEFAULT_TERMINAL_COLS = 120
const DEFAULT_TERMINAL_ROWS = 32
const DISABLED_WEB_PANEL_ERROR = 'Disabled until enabled'

export const defaultSettingsPlaceholders: SettingsOptionPlaceholder[] = [
  {
    id: 'cli-prompt-template',
    label: 'CLI Workspace Retrieval',
    description: '后续允许为 Codex / Claude 配置默认检索策略、会话提示偏好与自动索引行为。',
    status: 'planned'
  },
  {
    id: 'default-workspace',
    label: 'Default Workspace',
    description: '后续允许指定默认项目目录、Artifact 桶和启动时加载的工作区。',
    status: 'placeholder'
  },
  {
    id: 'terminal-behavior',
    label: 'Terminal Behavior',
    description: '后续允许自定义 shell、启动命令、复制策略和终端交互偏好。',
    status: 'placeholder'
  }
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
        lastError: config?.enabled === false ? DISABLED_WEB_PANEL_ERROR : null
      }
    }
    case 'terminal': {
      const config = getTerminalPanelConfig(panel.id)

      return {
        kind: 'terminal',
        shell: config?.shell ?? 'powershell.exe',
        cwd: '.',
        startupCommand: config?.startupCommand ?? (panel.id === 'codex-cli' ? 'codex' : 'claude'),
        launchCount: 0,
        status: 'idle',
        hasSession: false,
        isRunning: false,
        pid: null,
        cols: DEFAULT_TERMINAL_COLS,
        rows: DEFAULT_TERMINAL_ROWS,
        bufferSize: 0,
        logPath: '',
        showDetails: false,
        lastExitCode: null,
        lastExitSignal: null,
        lastError: null
      }
    }
    case 'workspace':
      return {
        kind: 'workspace',
        selectedBucket: panel.id === 'artifacts' ? 'artifacts/' : 'logs/',
        selectedOrigin: 'all',
        searchQuery: '',
        draftContextLabel: '',
        selectedArtifactIds: [],
        previewArtifactId: null,
        promptTargetPanelId: 'codex-cli',
        promptDraft: '',
        projectId: 'default',
        workspaceRoot: '',
        manifestPath: '',
        contextIndexPath: '',
        originManifestsPath: '',
        rulesPath: '',
        initialized: false,
        artifactCount: 0,
        bucketCounts: {
          'artifacts/': 0,
          'outputs/': 0,
          'logs/': 0
        },
        contextEntries: [],
        artifacts: [],
        recentArtifacts: [],
        lastSavedArtifactId: null,
        lastError: null
      }
    case 'tool':
      return {
        kind: 'tool',
        outputFormat: 'pdf',
        lastArtifact: 'sample-render-input.html',
        notes: ''
      }
    case 'settings':
      return {
        kind: 'settings',
        language: 'system',
        theme: 'system',
        terminalPreludeText: 'proxy_on',
        placeholders: defaultSettingsPlaceholders,
        notes: 'Settings panel scaffolded for future preferences.'
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
    lastError: config.enabled ? null : DISABLED_WEB_PANEL_ERROR
  }
}

export function createCustomTerminalPanelViewState(config: CustomTerminalPanelSettings): TerminalPanelViewState {
  return {
    kind: 'terminal',
    shell: config.shell,
    cwd: config.cwd ?? '.',
    startupCommand: config.startupCommand,
    launchCount: 0,
    status: 'idle',
    hasSession: false,
    isRunning: false,
    pid: null,
    cols: DEFAULT_TERMINAL_COLS,
    rows: DEFAULT_TERMINAL_ROWS,
    bufferSize: 0,
    logPath: '',
    showDetails: false,
    lastExitCode: null,
    lastExitSignal: null,
    lastError: null
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
