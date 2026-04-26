import { create } from 'zustand'
import { getLanguageLabel, getUiText, resolveLocale } from './i18n'
import { getTerminalPanelConfig } from '../../shared/terminal-panels'
import type { AppSettingsSnapshot, CustomTerminalPanelSettings, CustomWebPanelSettings } from '../../shared/settings'
import { getWebPanelConfig } from '../../shared/web-panels'
import { navigationSections, panelRegistry } from './navigation'
import type {
  ManagedPanel,
  PanelDefinition,
  PanelKind,
  PanelViewState,
  SettingsPanelViewState,
  TerminalPanelStateUpdate,
  TerminalPanelViewState,
  ToolPanelViewState,
  WebPanelStateUpdate,
  WebPanelViewState,
  WorkspaceStateUpdate,
  WorkspacePanelViewState
} from './types'

interface WorkbenchState {
  sections: typeof navigationSections
  panelOrder: string[]
  panels: Record<string, ManagedPanel>
  activePanelId: string
  openPanel: (panelId: string) => void
  hidePanel: (panelId: string) => void
  refreshActivePanelStatus: () => void
  updatePanelViewState: (panelId: string, viewState: PanelViewState) => void
  syncSettingsState: (snapshot: AppSettingsSnapshot) => void
  syncWebPanelState: (snapshot: WebPanelStateUpdate) => void
  syncTerminalPanelState: (snapshot: TerminalPanelStateUpdate) => void
  syncWorkspaceState: (snapshot: WorkspaceStateUpdate) => void
}

function nowLabel(): string {
  return new Intl.DateTimeFormat(resolveLocale('system'), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date())
}

function formatTimeLabel(locale: ReturnType<typeof resolveLocale>): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date())
}

function getCurrentLocale(panels: Record<string, ManagedPanel>): ReturnType<typeof resolveLocale> {
  const settingsPanel = panels.settings
  if (settingsPanel?.viewState.kind === 'settings') {
    return resolveLocale(settingsPanel.viewState.language)
  }

  return resolveLocale('system')
}

function createDefaultViewState(panel: PanelDefinition): PanelViewState {
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
        lastError: config?.enabled === false ? 'Reserved for later rollout' : null
      }
    }
    case 'terminal':
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
        cols: 120,
        rows: 32,
        bufferSize: 0,
        logPath: '',
        showDetails: false,
        lastExitCode: null,
        lastExitSignal: null,
        lastError: null
      }
    case 'workspace':
      return {
        kind: 'workspace',
        selectedBucket: panel.id === 'artifacts' ? 'artifacts/' : 'logs/',
        selectedOrigin: 'all',
        draftContextLabel: '',
        selectedArtifactIds: [],
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
        placeholders: [
          {
            id: 'cli-prompt-template',
            label: 'CLI Prompt Template',
            description: '后续允许为 Codex / Claude 配置默认启动提示词与发送模板。',
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
        ],
        notes: 'Settings panel scaffolded for future preferences.'
      }
  }
}

function createManagedPanel(panel: PanelDefinition): ManagedPanel {
  const timestamp = nowLabel()

  return {
    definition: panel,
    isVisible: panel.defaultVisible ?? false,
    hasBeenOpened: panel.defaultVisible ?? false,
    activationCount: panel.defaultVisible ? 1 : 0,
    lastActivatedAt: panel.defaultVisible ? timestamp : 'Not opened yet',
    lastStatusCheckAt: panel.defaultVisible ? timestamp : 'Not checked yet',
    statusText: panel.defaultVisible ? 'Workbench ready' : 'Registered and waiting',
    viewState: createDefaultViewState(panel)
  }
}

function createInitialPanels(): Record<string, ManagedPanel> {
  return Object.fromEntries(panelRegistry.map((panel) => [panel.id, createManagedPanel(panel)]))
}

function createCustomPanelDefinition(config: CustomWebPanelSettings): PanelDefinition {
  const section = navigationSections.find((item) => item.id === config.sectionId)

  return {
    id: config.id,
    title: config.title,
    sectionId: config.sectionId,
    group: section?.title ?? config.sectionId,
    kind: 'web',
    state: config.enabled ? 'validated' : 'planned',
    summary: 'User-defined web panel.',
    nextStep: 'Configure the target URL, partition, and enabled state directly from the panel.',
    delivery: 'Custom web panel configuration.',
    signal: 'Custom web',
    userDefined: true
  }
}

function createCustomTerminalPanelDefinition(config: CustomTerminalPanelSettings): PanelDefinition {
  const section = navigationSections.find((item) => item.id === config.sectionId)

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

function createCustomWebViewState(config: CustomWebPanelSettings): WebPanelViewState {
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
    lastError: config.enabled ? null : 'Reserved for later rollout'
  }
}

function createCustomTerminalViewState(config: CustomTerminalPanelSettings): TerminalPanelViewState {
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
    cols: 120,
    rows: 32,
    bufferSize: 0,
    logPath: '',
    showDetails: false,
    lastExitCode: null,
    lastExitSignal: null,
    lastError: null
  }
}

function nextActivePanelId(panels: Record<string, ManagedPanel>, preferredPanelId?: string): string {
  if (preferredPanelId && panels[preferredPanelId]?.isVisible) {
    return preferredPanelId
  }

  const visiblePanel = Object.values(panels).find((panel) => panel.isVisible)
  return visiblePanel?.definition.id ?? 'home'
}

function statusTextForPanel(kind: PanelKind, timestamp: string, locale: ReturnType<typeof resolveLocale>): string {
  const ui = getUiText(locale)

  switch (kind) {
    case 'home':
      return `${ui.appTitle}: ${timestamp}`
    case 'web':
      return `${ui.navigation} ${ui.lastSync.toLowerCase()}: ${timestamp}`
    case 'terminal':
      return `${ui.terminalLabel} ${ui.lastSync.toLowerCase()}: ${timestamp}`
    case 'workspace':
      return `${ui.workspaceDefault} ${timestamp}`
    case 'tool':
      return `${ui.toolPlaceholder}: ${timestamp}`
    case 'settings':
      return `${ui.applicationSettings}: ${timestamp}`
  }
}

function statusTextForWebSnapshot(viewState: WebPanelViewState, locale: ReturnType<typeof resolveLocale>): string {
  const ui = getUiText(locale)

  if (!viewState.enabled) {
    return ui.reservedWebPanel
  }

  if (viewState.lastError) {
    return viewState.lastError
  }

  if (viewState.isLoading) {
    return ui.loadingCurrentPage
  }

  return viewState.currentUrl
}

function statusTextForTerminalSnapshot(
  viewState: TerminalPanelViewState,
  locale: ReturnType<typeof resolveLocale>
): string {
  const ui = getUiText(locale)

  if (viewState.lastError) {
    return viewState.lastError
  }

  switch (viewState.status) {
    case 'idle':
      return ui.sessionWaitingOrExited
    case 'starting':
      return `${ui.start} ${viewState.startupCommand}`
    case 'running':
      return `${viewState.startupCommand} ${ui.connected.toLowerCase()}`
    case 'exited':
      return `${ui.lastExit}: ${viewState.lastExitCode ?? 0}`
    case 'error':
      return viewState.lastError ?? ui.terminalStatusError
  }
}

function statusTextForWorkspaceSnapshot(
  viewState: WorkspacePanelViewState,
  locale: ReturnType<typeof resolveLocale>
): string {
  const ui = getUiText(locale)

  if (viewState.lastError) {
    return viewState.lastError
  }

  if (!viewState.initialized) {
    return ui.workspaceInitializationPending
  }

  if (viewState.lastSavedArtifactId) {
    return `${ui.lastSaved}: ${viewState.lastSavedArtifactId}`
  }

  return `${viewState.artifactCount} ${ui.artifactsIndexed.toLowerCase()}`
}

function statusTextForSettingsSnapshot(
  viewState: SettingsPanelViewState,
  locale: ReturnType<typeof resolveLocale>
): string {
  return `${getUiText(locale).language}: ${getLanguageLabel(viewState.language, locale)}`
}

function derivePanelStatusText(panel: ManagedPanel, locale: ReturnType<typeof resolveLocale>): string {
  switch (panel.viewState.kind) {
    case 'web':
      return statusTextForWebSnapshot(panel.viewState, locale)
    case 'terminal':
      return statusTextForTerminalSnapshot(panel.viewState, locale)
    case 'workspace':
      return statusTextForWorkspaceSnapshot(panel.viewState, locale)
    case 'settings':
      return statusTextForSettingsSnapshot(panel.viewState, locale)
    default:
      return statusTextForPanel(panel.definition.kind, panel.lastStatusCheckAt, locale)
  }
}

function relocalizePanels(panels: Record<string, ManagedPanel>): Record<string, ManagedPanel> {
  const locale = getCurrentLocale(panels)

  return Object.fromEntries(
    Object.entries(panels).map(([panelId, panel]) => [
      panelId,
      {
        ...panel,
        statusText: derivePanelStatusText(panel, locale)
      }
    ])
  )
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  sections: navigationSections,
  panelOrder: panelRegistry.map((panel) => panel.id),
  panels: relocalizePanels(createInitialPanels()),
  activePanelId: 'home',
  openPanel: (panelId) => {
    set((state) => {
      const currentPanel = state.panels[panelId]
      if (!currentPanel) {
        return state
      }

      const locale = getCurrentLocale(state.panels)
      const timestamp = formatTimeLabel(locale)

      return {
        activePanelId: panelId,
        panels: {
          ...state.panels,
          [panelId]: {
            ...currentPanel,
            isVisible: true,
            hasBeenOpened: true,
            activationCount: currentPanel.activationCount + 1,
            lastActivatedAt: timestamp,
            statusText: statusTextForPanel(currentPanel.definition.kind, timestamp, locale)
          }
        }
      }
    })
  },
  hidePanel: (panelId) => {
    set((state) => {
      const target = state.panels[panelId]
      if (!target) {
        return state
      }

      if (target.definition.pinned) {
        return state
      }

      const locale = getCurrentLocale(state.panels)

      const updatedPanels = {
        ...state.panels,
        [panelId]: {
          ...target,
          isVisible: false,
          statusText: statusTextForPanel(target.definition.kind, formatTimeLabel(locale), locale)
        }
      }

      return {
        panels: updatedPanels,
        activePanelId: state.activePanelId === panelId ? nextActivePanelId(updatedPanels, 'home') : state.activePanelId
      }
    })
  },
  refreshActivePanelStatus: () => {
    set((state) => {
      const activePanel = state.panels[state.activePanelId]
      if (!activePanel) {
        return state
      }

      const locale = getCurrentLocale(state.panels)
      const timestamp = formatTimeLabel(locale)
      return {
        panels: {
          ...state.panels,
          [state.activePanelId]: {
            ...activePanel,
            lastStatusCheckAt: timestamp,
            statusText: statusTextForPanel(activePanel.definition.kind, timestamp, locale)
          }
        }
      }
    })
  },
  updatePanelViewState: (panelId, viewState) => {
    set((state) => {
      const activePanel = state.panels[panelId]
      if (!activePanel) {
        return state
      }

      const nextPanels = {
        ...state.panels,
        [panelId]: {
          ...activePanel,
          viewState
        }
      }

      const locale = getCurrentLocale(nextPanels)
      nextPanels[panelId] = {
        ...nextPanels[panelId],
        statusText:
          viewState.kind === 'web'
            ? statusTextForWebSnapshot(viewState, locale)
            : viewState.kind === 'terminal'
              ? statusTextForTerminalSnapshot(viewState, locale)
              : viewState.kind === 'workspace'
                ? statusTextForWorkspaceSnapshot(viewState, locale)
                : viewState.kind === 'settings'
                  ? statusTextForSettingsSnapshot(viewState, locale)
                  : statusTextForPanel(activePanel.definition.kind, formatTimeLabel(locale), locale)
      }

      return {
        panels: viewState.kind === 'settings' ? relocalizePanels(nextPanels) : nextPanels
      }
    })
  },
  syncSettingsState: (snapshot) => {
    set((state) => {
      const settingsPanel = state.panels.settings
      if (!settingsPanel || settingsPanel.viewState.kind !== 'settings') {
        return state
      }

      const nextPanels: Record<string, ManagedPanel> = {
        ...state.panels,
        settings: {
          ...settingsPanel,
          viewState: {
            ...settingsPanel.viewState,
            language: snapshot.language,
            theme: snapshot.theme,
            terminalPreludeText: snapshot.terminalPreludeCommands.join('\n')
          }
        }
      }

      const nextPanelOrder = state.panelOrder.filter((panelId) => {
        const panel = state.panels[panelId]
        return !panel?.definition.userDefined
      })

      for (const customConfig of snapshot.customWebPanels) {
        const existingPanel = state.panels[customConfig.id]
        const definition = createCustomPanelDefinition(customConfig)
        const statusBase = existingPanel ?? createManagedPanel(definition)

        nextPanels[customConfig.id] = {
          ...statusBase,
          definition,
          viewState: createCustomWebViewState(customConfig)
          
        }

        if (!nextPanelOrder.includes(customConfig.id)) {
          nextPanelOrder.push(customConfig.id)
        }
      }

      for (const customConfig of snapshot.customTerminalPanels) {
        const existingPanel = state.panels[customConfig.id]
        const definition = createCustomTerminalPanelDefinition(customConfig)
        const statusBase = existingPanel ?? createManagedPanel(definition)

        nextPanels[customConfig.id] = {
          ...statusBase,
          definition,
          viewState: existingPanel?.viewState.kind === 'terminal'
            ? {
                ...existingPanel.viewState,
              shell: customConfig.shell,
              cwd: customConfig.cwd ?? existingPanel.viewState.cwd,
                startupCommand: customConfig.startupCommand
              }
            : createCustomTerminalViewState(customConfig)
        }

        if (!nextPanelOrder.includes(customConfig.id)) {
          nextPanelOrder.push(customConfig.id)
        }
      }

      for (const panelId of Object.keys(nextPanels)) {
        if (!nextPanels[panelId].definition.userDefined) {
          continue
        }

        const existsInCustomWeb = snapshot.customWebPanels.some((panel) => panel.id === panelId)
        const existsInCustomTerminal = snapshot.customTerminalPanels.some((panel) => panel.id === panelId)

        if (!existsInCustomWeb && !existsInCustomTerminal) {
          delete nextPanels[panelId]
        }
      }

      return {
        panels: relocalizePanels(nextPanels),
        panelOrder: nextPanelOrder,
        activePanelId: nextPanels[state.activePanelId] ? state.activePanelId : nextActivePanelId(nextPanels, 'home')
      }
    })
  },
  syncWebPanelState: (snapshot) => {
    set((state) => {
      const activePanel = state.panels[snapshot.panelId]
      if (!activePanel || activePanel.viewState.kind !== 'web') {
        return state
      }

      const nextViewState: WebPanelViewState = {
        ...activePanel.viewState,
        homeUrl: snapshot.homeUrl,
        currentUrl: snapshot.currentUrl,
        partition: snapshot.partition,
        title: snapshot.title,
        canGoBack: snapshot.canGoBack,
        canGoForward: snapshot.canGoForward,
        isLoading: snapshot.isLoading,
        enabled: snapshot.enabled,
        showDetails: activePanel.viewState.showDetails,
        lastError: snapshot.lastError
      }

      const locale = getCurrentLocale(state.panels)

      return {
        panels: {
          ...state.panels,
          [snapshot.panelId]: {
            ...activePanel,
            viewState: nextViewState,
            lastStatusCheckAt: formatTimeLabel(locale),
            statusText: statusTextForWebSnapshot(nextViewState, locale)
          }
        }
      }
    })
  },
  syncTerminalPanelState: (snapshot) => {
    set((state) => {
      const activePanel = state.panels[snapshot.panelId]
      if (!activePanel || activePanel.viewState.kind !== 'terminal') {
        return state
      }

      const nextViewState: TerminalPanelViewState = {
        ...activePanel.viewState,
        shell: snapshot.shell,
        cwd: snapshot.cwd,
        startupCommand: snapshot.startupCommand,
        launchCount: snapshot.launchCount,
        status: snapshot.status,
        hasSession: snapshot.hasSession,
        isRunning: snapshot.isRunning,
        pid: snapshot.pid,
        cols: snapshot.cols,
        rows: snapshot.rows,
        bufferSize: snapshot.bufferSize,
        logPath: snapshot.logPath,
        showDetails: activePanel.viewState.showDetails,
        lastExitCode: snapshot.lastExitCode,
        lastExitSignal: snapshot.lastExitSignal,
        lastError: snapshot.lastError
      }

      const locale = getCurrentLocale(state.panels)

      return {
        panels: {
          ...state.panels,
          [snapshot.panelId]: {
            ...activePanel,
            viewState: nextViewState,
            lastStatusCheckAt: formatTimeLabel(locale),
            statusText: statusTextForTerminalSnapshot(nextViewState, locale)
          }
        }
      }
    })
  },
  syncWorkspaceState: (snapshot) => {
    set((state) => {
      const nextPanels = { ...state.panels }
      const locale = getCurrentLocale(state.panels)

      for (const panelId of ['artifacts', 'logs']) {
        const panel = nextPanels[panelId]
        if (!panel || panel.viewState.kind !== 'workspace') {
          continue
        }

        const nextViewState: WorkspacePanelViewState = {
          ...panel.viewState,
          projectId: snapshot.projectId,
          workspaceRoot: snapshot.workspaceRoot,
          manifestPath: snapshot.manifestPath,
          contextIndexPath: snapshot.contextIndexPath,
          originManifestsPath: snapshot.originManifestsPath,
          rulesPath: snapshot.rulesPath,
          initialized: snapshot.initialized,
          artifactCount: snapshot.artifactCount,
          bucketCounts: snapshot.bucketCounts,
          contextEntries: snapshot.contextEntries,
          artifacts: snapshot.artifacts,
          recentArtifacts: snapshot.recentArtifacts,
          lastSavedArtifactId: snapshot.lastSavedArtifactId,
          lastError: snapshot.lastError
        }

        const scopeStillExists =
          nextViewState.selectedOrigin === 'all' ||
          snapshot.contextEntries.some((entry) => entry.scopeId === nextViewState.selectedOrigin)

        nextViewState.selectedOrigin = scopeStillExists ? nextViewState.selectedOrigin : 'all'
        nextViewState.selectedArtifactIds = nextViewState.selectedArtifactIds.filter((artifactId) =>
          snapshot.artifacts.some((artifact) => artifact.id === artifactId)
        )

        nextPanels[panelId] = {
          ...panel,
          viewState: nextViewState,
          lastStatusCheckAt: formatTimeLabel(locale),
          statusText: statusTextForWorkspaceSnapshot(nextViewState, locale)
        }
      }

      return {
        panels: nextPanels
      }
    })
  }
}))

export function getPanel(panelId: string, panels: Record<string, ManagedPanel>): ManagedPanel | undefined {
  return panels[panelId]
}

export function getSectionPanels(
  sectionId: string,
  panels: Record<string, ManagedPanel>,
  panelOrder: string[] = Object.keys(panels)
): ManagedPanel[] {
  return panelOrder.map((panelId) => panels[panelId]).filter((panel) => panel?.definition.sectionId === sectionId)
}

export function asWebViewState(viewState: PanelViewState): WebPanelViewState {
  return viewState as WebPanelViewState
}

export function asTerminalViewState(viewState: PanelViewState): TerminalPanelViewState {
  return viewState as TerminalPanelViewState
}

export function asWorkspaceViewState(viewState: PanelViewState): WorkspacePanelViewState {
  return viewState as WorkspacePanelViewState
}

export function asToolViewState(viewState: PanelViewState): ToolPanelViewState {
  return viewState as ToolPanelViewState
}

export function asSettingsViewState(viewState: PanelViewState): SettingsPanelViewState {
  return viewState as SettingsPanelViewState
}
