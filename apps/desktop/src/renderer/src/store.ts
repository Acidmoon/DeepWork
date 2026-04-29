import { create } from 'zustand'
import {
  createCustomTerminalPanelDefinition,
  createCustomTerminalPanelViewState,
  createCustomWebPanelDefinition,
  createCustomWebPanelViewState,
  createInitialPanels,
  createManagedPanel,
  getManagedPanel,
  getSectionPanels,
  navigationSections,
  nextActivePanelId,
  panelRegistry,
  type ManagedPanel,
  type PanelKind,
  type PanelViewState,
  type SettingsPanelViewState,
  type TerminalPanelStateUpdate,
  type TerminalPanelViewState,
  type ToolPanelViewState,
  type WebPanelStateUpdate,
  type WebPanelViewState,
  type WorkspacePanelViewState,
  type WorkspaceStateUpdate
} from '@ai-workbench/core/desktop/panels'
import type { AppSettingsSnapshot, CustomWebPanelSettings } from '@ai-workbench/core/desktop/settings'
import { getTerminalPanelConfig } from '@ai-workbench/core/desktop/terminal-panels'
import { getLanguageLabel, getUiText, resolveLocale } from './i18n'

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
  const startupCommand = viewState.startupCommand.trim()

  if (viewState.lastError) {
    return viewState.lastError
  }

  switch (viewState.status) {
    case 'idle':
      return ui.sessionWaitingOrExited
    case 'starting':
      return startupCommand ? `${ui.start} ${startupCommand}` : ui.terminalRuntimeActive
    case 'running':
      return startupCommand ? `${startupCommand} ${ui.connected.toLowerCase()}` : ui.terminalRuntimeActive
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

function syncCustomWebPanelViewState(existingPanel: ManagedPanel | undefined, config: CustomWebPanelSettings): WebPanelViewState {
  if (!existingPanel || existingPanel.viewState.kind !== 'web') {
    return createCustomWebPanelViewState(config)
  }

  const shouldAdoptHomeUrlAsCurrent =
    !config.enabled ||
    existingPanel.viewState.currentUrl === existingPanel.viewState.homeUrl ||
    !existingPanel.hasBeenOpened

  return {
    ...existingPanel.viewState,
    homeUrl: config.homeUrl,
    currentUrl: shouldAdoptHomeUrlAsCurrent ? config.homeUrl : existingPanel.viewState.currentUrl,
    partition: config.partition,
    title: config.title,
    enabled: config.enabled,
    sessionPersisted: config.partition.startsWith('persist:'),
    lastError:
      config.enabled && existingPanel.viewState.lastError === 'Disabled until enabled'
        ? null
        : config.enabled
          ? existingPanel.viewState.lastError
          : 'Disabled until enabled'
  }
}

function shellArgsToEditorText(shellArgs: string[]): string {
  return shellArgs.join('\n')
}

function areStringListsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function syncDraftValue(currentDraft: string, currentSaved: string, nextSaved: string): string {
  return currentSaved === nextSaved ? currentDraft : nextSaved
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  sections: navigationSections,
  panelOrder: panelRegistry.map((panel) => panel.id),
  panels: relocalizePanels(createInitialPanels(nowLabel())),
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

      const customWebPanels = snapshot.customWebPanels ?? []
      const customTerminalPanels = snapshot.customTerminalPanels ?? []
      const builtInTerminalPanels = snapshot.builtInTerminalPanels ?? {}
      const nextPanels: Record<string, ManagedPanel> = {
        ...state.panels,
        settings: {
          ...settingsPanel,
          viewState: {
            ...settingsPanel.viewState,
            language: snapshot.language,
            theme: snapshot.theme,
            terminalPreludeText: snapshot.terminalPreludeCommands.join('\n'),
            threadContinuationPreference: snapshot.threadContinuationPreference,
            cliRetrievalPreference: snapshot.cliRetrievalPreference
          }
        }
      }

      const nextPanelOrder = state.panelOrder.filter((panelId) => {
        const panel = state.panels[panelId]
        return !panel?.definition.userDefined
      })

      for (const [panelId, panel] of Object.entries(nextPanels)) {
        if (panel.definition.kind !== 'terminal' || panel.definition.userDefined || panel.viewState.kind !== 'terminal') {
          continue
        }

        const builtInConfig = getTerminalPanelConfig(panelId)
        if (!builtInConfig) {
          continue
        }

        const savedCwd = builtInTerminalPanels[panelId]?.cwd ?? ''
        const savedStartupCommand = builtInTerminalPanels[panelId]?.startupCommand ?? ''
        const configChanged =
          panel.viewState.savedCwd !== savedCwd || panel.viewState.savedStartupCommand !== savedStartupCommand

        nextPanels[panelId] = {
          ...panel,
          viewState: {
            ...panel.viewState,
            shell: builtInConfig.shell,
            shellArgs: builtInConfig.shellArgs,
            cwd: savedCwd || snapshot.workspaceRoot || panel.viewState.cwd,
            startupCommand: savedStartupCommand || builtInConfig.startupCommand,
            savedShell: builtInConfig.shell,
            savedShellArgs: builtInConfig.shellArgs,
            savedCwd,
            savedStartupCommand,
            draftShell: builtInConfig.shell,
            draftShellArgsText: shellArgsToEditorText(builtInConfig.shellArgs),
            draftCwd: syncDraftValue(panel.viewState.draftCwd, panel.viewState.savedCwd, savedCwd),
            draftStartupCommand: syncDraftValue(
              panel.viewState.draftStartupCommand,
              panel.viewState.savedStartupCommand,
              savedStartupCommand
            ),
            pendingRestart: panel.viewState.pendingRestart || (configChanged && panel.viewState.isRunning)
          }
        }
      }

      for (const customConfig of customWebPanels) {
        const existingPanel = state.panels[customConfig.id]
        const definition = createCustomWebPanelDefinition(customConfig)
        const statusBase = existingPanel ?? createManagedPanel(definition, nowLabel())

        nextPanels[customConfig.id] = {
          ...statusBase,
          definition,
          viewState: syncCustomWebPanelViewState(existingPanel, customConfig)
        }

        if (!nextPanelOrder.includes(customConfig.id)) {
          nextPanelOrder.push(customConfig.id)
        }
      }

      for (const customConfig of customTerminalPanels) {
        const existingPanel = state.panels[customConfig.id]
        const definition = createCustomTerminalPanelDefinition(customConfig)
        const statusBase = existingPanel ?? createManagedPanel(definition, nowLabel())
        const savedCwd = customConfig.cwd ?? ''
        const configChanged =
          existingPanel?.viewState.kind === 'terminal'
            ? existingPanel.viewState.savedShell !== customConfig.shell ||
              !areStringListsEqual(existingPanel.viewState.savedShellArgs, customConfig.shellArgs) ||
              existingPanel.viewState.savedCwd !== savedCwd ||
              existingPanel.viewState.savedStartupCommand !== customConfig.startupCommand
            : false

        nextPanels[customConfig.id] = {
          ...statusBase,
          definition,
          viewState:
            existingPanel?.viewState.kind === 'terminal'
              ? {
                  ...existingPanel.viewState,
                  shell: customConfig.shell,
                  shellArgs: customConfig.shellArgs,
                  cwd: customConfig.cwd ?? snapshot.workspaceRoot ?? existingPanel.viewState.cwd,
                  startupCommand: customConfig.startupCommand,
                  savedShell: customConfig.shell,
                  savedShellArgs: customConfig.shellArgs,
                  savedCwd,
                  savedStartupCommand: customConfig.startupCommand,
                  draftShell: syncDraftValue(
                    existingPanel.viewState.draftShell,
                    existingPanel.viewState.savedShell,
                    customConfig.shell
                  ),
                  draftShellArgsText: areStringListsEqual(existingPanel.viewState.savedShellArgs, customConfig.shellArgs)
                    ? existingPanel.viewState.draftShellArgsText
                    : shellArgsToEditorText(customConfig.shellArgs),
                  draftCwd: syncDraftValue(existingPanel.viewState.draftCwd, existingPanel.viewState.savedCwd, savedCwd),
                  draftStartupCommand: syncDraftValue(
                    existingPanel.viewState.draftStartupCommand,
                    existingPanel.viewState.savedStartupCommand,
                    customConfig.startupCommand
                  ),
                  pendingRestart: existingPanel.viewState.pendingRestart || (configChanged && existingPanel.viewState.isRunning)
                }
            : createCustomTerminalPanelViewState(customConfig)
        }

        if (!nextPanelOrder.includes(customConfig.id)) {
          nextPanelOrder.push(customConfig.id)
        }
      }

      for (const panelId of Object.keys(nextPanels)) {
        if (!nextPanels[panelId].definition.userDefined) {
          continue
        }

        const existsInCustomWeb = customWebPanels.some((panel) => panel.id === panelId)
        const existsInCustomTerminal = customTerminalPanels.some((panel) => panel.id === panelId)

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
        sessionPersisted: snapshot.partition.startsWith('persist:'),
        showDetails: activePanel.viewState.showDetails,
        lastError: snapshot.lastError,
        contextLabel: snapshot.contextLabel,
        sessionScopeId: snapshot.sessionScopeId,
        threadId: snapshot.threadId,
        threadTitle: snapshot.threadTitle
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
        shellArgs: snapshot.shellArgs,
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
        pendingRestart:
          activePanel.viewState.pendingRestart && snapshot.hasSession && snapshot.launchCount === activePanel.viewState.launchCount,
        lastExitCode: snapshot.lastExitCode,
        lastExitSignal: snapshot.lastExitSignal,
        lastError: snapshot.lastError,
        contextLabel: snapshot.contextLabel,
        sessionScopeId: snapshot.sessionScopeId,
        threadId: snapshot.threadId,
        threadTitle: snapshot.threadTitle
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
          threadIndexPath: snapshot.threadIndexPath,
          threadManifestsPath: snapshot.threadManifestsPath,
          rulesPath: snapshot.rulesPath,
          initialized: snapshot.initialized,
          artifactCount: snapshot.artifactCount,
          bucketCounts: snapshot.bucketCounts,
          contextEntries: snapshot.contextEntries,
          threads: snapshot.threads,
          activeThreadId: snapshot.activeThreadId,
          activeThreadTitle: snapshot.activeThreadTitle,
          artifacts: snapshot.artifacts,
          recentArtifacts: snapshot.recentArtifacts,
          lastSavedArtifactId: snapshot.lastSavedArtifactId,
          lastError: snapshot.lastError
        }

        if (nextViewState.threadFilterMode !== 'all') {
          nextViewState.threadFilterMode = 'active'
        }

        const scopeStillExists =
          nextViewState.selectedOrigin === 'all' ||
          snapshot.contextEntries.some((entry) => entry.scopeId === nextViewState.selectedOrigin)

        nextViewState.selectedOrigin = scopeStillExists ? nextViewState.selectedOrigin : 'all'
        nextViewState.selectedArtifactIds = nextViewState.selectedArtifactIds.filter((artifactId) =>
          snapshot.artifacts.some((artifact) => artifact.id === artifactId)
        )
        nextViewState.previewArtifactId = snapshot.artifacts.some(
          (artifact) => artifact.id === nextViewState.previewArtifactId
        )
          ? nextViewState.previewArtifactId
          : null

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

export { getManagedPanel as getPanel, getSectionPanels }

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
