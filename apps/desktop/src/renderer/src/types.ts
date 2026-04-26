import type { WebPanelSnapshot } from '../../shared/web-panels'
import type { TerminalPanelSnapshot } from '../../shared/terminal-panels'
import type { ArtifactRecord, ContextIndexEntry, WorkspaceSnapshot } from '../../shared/workspace'

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
  status: 'idle' | 'starting' | 'running' | 'exited' | 'error'
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
  language: 'system' | 'zh-CN' | 'en-US'
  theme: 'system' | 'light' | 'dark'
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
