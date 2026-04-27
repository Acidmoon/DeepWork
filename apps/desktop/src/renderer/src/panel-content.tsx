import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import {
  getLanguageLabel,
  getLocalizedChecklist,
  getPanelKindLabel,
  getPlaceholderStatusLabel,
  getTerminalStatusLabel,
  getThemeLabel,
  getUiText,
  localizePanelDefinition,
  localizeSettingsPlaceholder,
  resolveLocale
} from './i18n'
import { buildAgentPrompt } from '../../shared/prompt-builder'
import {
  asSettingsViewState,
  asTerminalViewState,
  asToolViewState,
  asWebViewState,
  asWorkspaceViewState,
  useWorkbenchStore
} from './store'
import type { ManagedPanel, SettingsPanelViewState } from '@ai-workbench/core/desktop/panels'
import { getArtifactScopeId, type ArtifactRecord, type ContextIndexEntry } from '@ai-workbench/core/desktop/workspace'

export function PanelContent({ panel }: { panel: ManagedPanel }): JSX.Element {
  const locale = useWorkbenchStore((state) =>
    resolveLocale(state.panels.settings?.viewState.kind === 'settings' ? state.panels.settings.viewState.language : 'system')
  )

  switch (panel.definition.kind) {
    case 'home':
      return <HomePanel panel={panel} locale={locale} />
    case 'web':
      return <WebPanel panel={panel} locale={locale} />
    case 'terminal':
      return <TerminalPanel panel={panel} locale={locale} />
    case 'workspace':
      return <WorkspacePanel panel={panel} locale={locale} />
    case 'tool':
      return <ToolPanel panel={panel} locale={locale} />
    case 'settings':
      return <SettingsPanel panel={panel} locale={locale} />
  }
}

function HomePanel({ panel, locale }: { panel: ManagedPanel; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const state = panel.viewState.kind === 'home' ? panel.viewState : null
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const localizedChecklist = getLocalizedChecklist(locale)

  if (!state) {
    return <></>
  }

  return (
    <div className="panel-layout">
      <section className="panel-header">
        <p className="eyebrow">{ui.phaseSnapshot}</p>
        <h3>{definition.title}</h3>
        <p>{definition.summary}</p>
      </section>

      <div className="stats-row">
        <article className="stat-block">
          <span>{ui.panelType}</span>
          <strong>{getPanelKindLabel(definition.kind, locale)}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.activationCount}</span>
          <strong>{panel.activationCount}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.lastStatusCheck}</span>
          <strong>{panel.lastStatusCheckAt}</strong>
        </article>
      </div>

      <div className="plain-list">
        {state.checklist.map((item, index) => (
          <label key={item} className="plain-list__row">
            <input
              checked
              type="checkbox"
              onChange={() => {
                updatePanelViewState(panel.definition.id, {
                  ...state,
                  focusArea: `${ui.checkpoint} ${index + 1}`
                })
              }}
            />
            <span>{localizedChecklist[index] ?? item}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function WebPanel({ panel, locale }: { panel: ManagedPanel; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const syncWebPanelState = useWorkbenchStore((state) => state.syncWebPanelState)
  const state = asWebViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)

  useEffect(() => {
    void window.workbenchShell.webPanels.getState(panel.definition.id).then((snapshot) => {
      if (snapshot) {
        syncWebPanelState(snapshot)
      }
    })
  }, [panel.definition.id, syncWebPanelState])

  const persistConfig = async (enabled: boolean): Promise<void> => {
    updatePanelViewState(panel.definition.id, {
      ...state,
      enabled,
      homeUrl: toNavigableUrl(state.homeUrl),
      currentUrl: enabled ? state.currentUrl : toNavigableUrl(state.homeUrl),
      partition: state.partition.trim() || `persist:${panel.definition.id}`
    })

    const snapshot = await window.workbenchShell.webPanels.updateConfig(panel.definition.id, {
      homeUrl: toNavigableUrl(state.homeUrl),
      partition: state.partition.trim() || `persist:${panel.definition.id}`,
      enabled
    })

    if (snapshot) {
      syncWebPanelState(snapshot)
    }
  }

  useEffect(() => {
    if (!state.enabled) {
      return
    }

    const host = hostRef.current
    if (!host) {
      return
    }

    let disposed = false

    const showPanel = async (): Promise<void> => {
      const bounds = getElementBounds(host)
      if (bounds.width <= 0 || bounds.height <= 0) {
        return
      }

      const snapshot = await window.workbenchShell.webPanels.show(panel.definition.id, bounds)
      if (!disposed && snapshot) {
        syncWebPanelState(snapshot)
      }
    }

    const updateBounds = (): void => {
      const bounds = getElementBounds(host)
      if (bounds.width <= 0 || bounds.height <= 0) {
        return
      }

      void window.workbenchShell.webPanels.updateBounds(panel.definition.id, bounds)
    }

    void showPanel()

    const resizeObserver = new ResizeObserver(() => {
      updateBounds()
    })
    resizeObserver.observe(host)

    const scrollContainers = [host.closest('.workspace'), host.closest('.canvas__body')].filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    )
    const handleScroll = (): void => {
      updateBounds()
    }

    for (const container of scrollContainers) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }

    const handleWindowResize = (): void => {
      updateBounds()
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      disposed = true
      resizeObserver.disconnect()
      for (const container of scrollContainers) {
        container.removeEventListener('scroll', handleScroll)
      }
      window.removeEventListener('resize', handleWindowResize)
      void window.workbenchShell.webPanels.hide(panel.definition.id)
    }
  }, [panel.definition.id, state.enabled, syncWebPanelState])

  if (!state.enabled) {
    return (
      <div className="panel-layout">
        <section className="panel-header">
          <p className="eyebrow">{ui.reservedWebPanel}</p>
          <h3>{definition.title}</h3>
          <p>{ui.reservedWebMessage}</p>
        </section>

        <div className="stats-row">
          <article className="stat-block">
            <span>{ui.homeUrl}</span>
            <strong>{state.homeUrl}</strong>
          </article>
          <article className="stat-block">
            <span>{ui.partition}</span>
            <strong>{state.partition}</strong>
          </article>
          <article className="stat-block">
            <span>{ui.status}</span>
            <strong>{ui.reserved}</strong>
          </article>
        </div>

        <div className="detail-columns detail-columns--wide">
          <label className="field field--wide">
            <span>{ui.homeUrl}</span>
            <input
              value={state.homeUrl}
              onChange={(event) =>
                updatePanelViewState(panel.definition.id, {
                  ...state,
                  homeUrl: event.target.value,
                  currentUrl: event.target.value
                })
              }
            />
          </label>
          <label className="field">
            <span>{ui.partition}</span>
            <input
              value={state.partition}
              onChange={(event) =>
                updatePanelViewState(panel.definition.id, {
                  ...state,
                  partition: event.target.value
                })
              }
            />
          </label>
        </div>

        <div className="action-row">
          <button type="button" className="action-button action-button--ghost" onClick={() => void persistConfig(false)}>
            {ui.saveConfig}
          </button>
          <button type="button" className="action-button" onClick={() => void persistConfig(true)}>
            {ui.enablePanel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="immersive-panel immersive-panel--web">
      <div className="web-panel-stage web-panel-stage--immersive">
        {state.showDetails ? (
          <div className="stage-drawer">
            <div className="detail-columns detail-columns--wide">
              <label className="field field--wide">
                <span>{ui.homeUrl}</span>
                <input
                  value={state.homeUrl}
                  onChange={(event) =>
                    updatePanelViewState(panel.definition.id, {
                      ...state,
                      homeUrl: event.target.value
                    })
                  }
                />
              </label>
              <label className="field field--wide">
                <span>{ui.address}</span>
                <div className="field-inline">
                  <input
                    value={state.currentUrl}
                    onChange={(event) =>
                      updatePanelViewState(panel.definition.id, {
                        ...state,
                        currentUrl: event.target.value
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') {
                        return
                      }

                      event.preventDefault()
                      void window.workbenchShell.webPanels.navigate(
                        panel.definition.id,
                        'load-url',
                        toNavigableUrl(state.currentUrl)
                      )
                    }}
                  />
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => {
                      void window.workbenchShell.webPanels.navigate(
                        panel.definition.id,
                        'load-url',
                        toNavigableUrl(state.currentUrl)
                      )
                    }}
                  >
                    {ui.go}
                  </button>
                </div>
              </label>
              <label className="field">
                <span>{ui.partition}</span>
                <input
                  value={state.partition}
                  onChange={(event) =>
                    updatePanelViewState(panel.definition.id, {
                      ...state,
                      partition: event.target.value
                    })
                  }
                />
              </label>
            </div>

            <div className="stats-row">
              <article className="stat-block">
                <span>{ui.navigation}</span>
                <strong>{state.canGoBack || state.canGoForward ? ui.historyReady : ui.initialPage}</strong>
              </article>
              <article className="stat-block">
                <span>{ui.session}</span>
                <strong>{state.sessionPersisted ? ui.persisted : ui.ephemeral}</strong>
              </article>
              <article className="stat-block">
                <span>{ui.loading}</span>
                <strong>{state.isLoading ? ui.inProgress : ui.idle}</strong>
              </article>
            </div>

            <div className="action-row">
              <button type="button" className="action-button action-button--ghost" onClick={() => void persistConfig(true)}>
                {ui.saveConfig}
              </button>
              <button
                type="button"
                className="action-button action-button--ghost"
                onClick={() => void persistConfig(false)}
              >
                {ui.disablePanel}
              </button>
            </div>
          </div>
        ) : null}

        <div ref={hostRef} className="web-panel-host" aria-label={`${panel.definition.title} host`} />
      </div>
    </div>
  )
}

function TerminalPanel({ panel, locale }: { panel: ManagedPanel; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  const terminalHostRef = useRef<HTMLDivElement | null>(null)
  const launchCountRef = useRef(0)
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const syncTerminalPanelState = useWorkbenchStore((state) => state.syncTerminalPanelState)
  const state = asTerminalViewState(panel.viewState)
  const ui = getUiText(locale)

  useEffect(() => {
    const host = terminalHostRef.current
    if (!host) {
      return
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Cascadia Mono", "IBM Plex Mono", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#08111f',
        foreground: '#ecf3ff',
        cursor: '#7be0d0',
        cursorAccent: '#08111f',
        selectionBackground: 'rgba(123, 224, 208, 0.28)',
        black: '#08111f',
        brightBlack: '#4f5e74',
        red: '#ff7878',
        brightRed: '#ff9f9f',
        green: '#8ae7ac',
        brightGreen: '#b3f2c8',
        yellow: '#ffd27d',
        brightYellow: '#ffe3a8',
        blue: '#82b4ff',
        brightBlue: '#9dc3ff',
        magenta: '#d5a0ff',
        brightMagenta: '#e2bbff',
        cyan: '#73ddff',
        brightCyan: '#a3ecff',
        white: '#dbe7ff',
        brightWhite: '#ffffff'
      }
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(host)
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') {
        return true
      }

      const key = event.key.toLowerCase()
      const hasModifier = event.ctrlKey || event.metaKey

      if (hasModifier && key === 'c' && terminal.hasSelection()) {
        const selection = terminal.getSelection()
        if (selection) {
          window.workbenchShell.clipboard.writeText(selection)
          terminal.clearSelection()
        }

        return false
      }

      if (hasModifier && key === 'v') {
        const clipboardText = window.workbenchShell.clipboard.readText()
        if (clipboardText) {
          terminal.paste(clipboardText)
        }

        return false
      }

      return true
    })

    let disposed = false
    let suppressInputEcho = false

    const syncSize = (): void => {
      fitAddon.fit()

      const dimensions = fitAddon.proposeDimensions()
      if (!dimensions) {
        return
      }

      const lastSize = lastSizeRef.current
      if (lastSize?.cols === dimensions.cols && lastSize?.rows === dimensions.rows) {
        return
      }

      terminal.resize(dimensions.cols, dimensions.rows)
      lastSizeRef.current = {
        cols: dimensions.cols,
        rows: dimensions.rows
      }
      void window.workbenchShell.terminals.resize(panel.definition.id, dimensions)
    }

    const scheduleSyncSize = (): void => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
      }

      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null
        syncSize()
      })
    }

    const loadSession = async (): Promise<void> => {
      const payload = await window.workbenchShell.terminals.attach(panel.definition.id)
      if (disposed || !payload) {
        return
      }

      launchCountRef.current = payload.snapshot.launchCount
      syncTerminalPanelState(payload.snapshot)

      if (payload.buffer) {
        suppressInputEcho = true
        terminal.reset()
        terminal.write(payload.buffer)
        suppressInputEcho = false
      }

      scheduleSyncSize()

      if (!payload.snapshot.isRunning && payload.snapshot.status !== 'starting') {
        const snapshot = await window.workbenchShell.terminals.start(panel.definition.id)
        if (!disposed && snapshot) {
          syncTerminalPanelState(snapshot)
        }
      }
    }

    const outputCleanup = window.workbenchShell.terminals.onOutput((event) => {
      if (event.panelId !== panel.definition.id || suppressInputEcho) {
        return
      }

      terminal.write(event.data)
    })

    const stateCleanup = window.workbenchShell.terminals.onStateChanged((snapshot) => {
      if (snapshot.panelId !== panel.definition.id) {
        return
      }

      if (snapshot.launchCount !== launchCountRef.current) {
        launchCountRef.current = snapshot.launchCount
        terminal.reset()
      }

      syncTerminalPanelState(snapshot)
    })

    const dataSubscription = terminal.onData((data) => {
      void window.workbenchShell.terminals.write(panel.definition.id, data)
    })

    host.classList.add('terminal-host--ready')

    const handleContextMenu = (event: MouseEvent): void => {
      event.preventDefault()

      if (terminal.hasSelection()) {
        const selection = terminal.getSelection()
        if (selection) {
          window.workbenchShell.clipboard.writeText(selection)
          terminal.clearSelection()
        }
        return
      }

      const clipboardText = window.workbenchShell.clipboard.readText()
      if (clipboardText) {
        terminal.paste(clipboardText)
      }
    }

    host.addEventListener('contextmenu', handleContextMenu)

    const resizeObserver = new ResizeObserver(() => {
      scheduleSyncSize()
    })
    resizeObserver.observe(host)

    const timeoutId = window.setTimeout(() => {
      scheduleSyncSize()
    }, 50)

    void loadSession()

    return () => {
      disposed = true
      host.classList.remove('terminal-host--ready')
      host.removeEventListener('contextmenu', handleContextMenu)
      window.clearTimeout(timeoutId)
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current)
        resizeFrameRef.current = null
      }
      resizeObserver.disconnect()
      dataSubscription.dispose()
      outputCleanup()
      stateCleanup()
      terminal.dispose()
    }
  }, [panel.definition.id, syncTerminalPanelState])

  return (
    <div className="immersive-panel immersive-panel--terminal">
      <div className="terminal-stage terminal-stage--immersive">
        {state.showDetails ? (
          <div className="stage-drawer">
            <div className="detail-columns">
              <label className="field">
                <span>{ui.shell}</span>
                <input value={state.shell} readOnly />
              </label>
              <label className="field">
                <span>{ui.startupCommand}</span>
                <input value={state.startupCommand} readOnly />
              </label>
            </div>

            <div className="stats-row">
              <article className="stat-block">
                <span>{ui.launchCount}</span>
                <strong>{state.launchCount}</strong>
              </article>
              <article className="stat-block">
                <span>{ui.status}</span>
                <strong>{getTerminalStatusLabel(state.status, locale)}</strong>
              </article>
              <article className="stat-block">
                <span>{ui.pid}</span>
                <strong>{state.pid ?? ui.notRunning}</strong>
              </article>
            </div>

            <div className="stats-row">
              <article className="stat-block">
                <span>{ui.workingDirectory}</span>
                <strong>{state.cwd}</strong>
              </article>
              <article className="stat-block">
                <span>{ui.bufferSize}</span>
                <strong>{state.bufferSize}</strong>
              </article>
              <article className="stat-block">
                <span>{ui.lastExit}</span>
                <strong>{state.lastExitCode ?? ui.active}</strong>
              </article>
            </div>
          </div>
        ) : null}

        <div ref={terminalHostRef} className="terminal-host" aria-label={`${panel.definition.title} terminal host`} />
      </div>
    </div>
  )
}

function WorkspacePanel({ panel, locale }: { panel: ManagedPanel; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  const syncWorkspaceState = useWorkbenchStore((state) => state.syncWorkspaceState)
  const state = asWorkspaceViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const allPanels = useWorkbenchStore((store) => store.panels)
  const [sessionMessages, setSessionMessages] = useState<Array<{ id: string; role: string; text: string }>>([])
  const [sessionLogExcerpt, setSessionLogExcerpt] = useState<string>('')
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable' | 'unsupported'>('idle')
  const [previewContent, setPreviewContent] = useState('')

  useEffect(() => {
    void window.workbenchShell.workspace.getState().then((snapshot) => {
      if (snapshot) {
        syncWorkspaceState(snapshot)
      }
    })
  }, [syncWorkspaceState])

  const normalizedQuery = normalizeWorkspaceSearchQuery(state.searchQuery)
  const sessionSummaries = state.contextEntries.map((entry) => {
    const scopedArtifacts = state.artifacts.filter((artifact) => getArtifactScopeId(artifact) === entry.scopeId)
    const bucketArtifacts = scopedArtifacts.filter((artifact) => matchesWorkspaceBucket(artifact, state.selectedBucket))
    const matchingArtifacts = normalizedQuery
      ? bucketArtifacts.filter((artifact) => matchesWorkspaceArtifactQuery(artifact, normalizedQuery))
      : bucketArtifacts
    const searchableSession = buildSessionSearchText(entry, scopedArtifacts)

    return {
      ...buildSessionSummary(entry, state.artifacts, locale),
      matchesOrigin: state.selectedOrigin === 'all' || entry.scopeId === state.selectedOrigin,
      matchesQuery: !normalizedQuery || searchableSession.includes(normalizedQuery) || matchingArtifacts.length > 0,
      availableArtifactCount: bucketArtifacts.length
    }
  })
  const filteredSessionSummaries = sessionSummaries.filter(
    (session) => session.matchesOrigin && session.availableArtifactCount > 0 && session.matchesQuery
  )
  const filteredArtifacts = state.artifacts.filter((artifact) => {
    const matchesOrigin = state.selectedOrigin === 'all' || getArtifactScopeId(artifact) === state.selectedOrigin
    const matchesBucket = matchesWorkspaceBucket(artifact, state.selectedBucket)
    const matchesQuery = !normalizedQuery || matchesWorkspaceArtifactQuery(artifact, normalizedQuery)

    return matchesOrigin && matchesBucket && matchesQuery
  })
  const selectedArtifacts = state.artifacts.filter((artifact) => state.selectedArtifactIds.includes(artifact.id))
  const selectedPreviewArtifact = state.previewArtifactId
    ? state.artifacts.find((artifact) => artifact.id === state.previewArtifactId) ?? null
    : null
  const terminalTargets = Object.values(allPanels)
    .filter((item) => item.definition.kind === 'terminal')
    .map((item) => item.definition)

  const toggleArtifactSelection = (artifactId: string): void => {
    useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
      ...state,
      selectedArtifactIds: state.selectedArtifactIds.includes(artifactId)
        ? state.selectedArtifactIds.filter((id) => id !== artifactId)
        : [...state.selectedArtifactIds, artifactId]
    })
  }

  const setPreviewArtifact = (artifactId: string | null): void => {
    useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
      ...state,
      previewArtifactId: artifactId
    })
  }

  const generatePromptDraft = (): void => {
    if (selectedArtifacts.length === 0) {
      useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
        ...state,
        promptDraft: ui.selectionRequired
      })
      return
    }

    useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
      ...state,
      promptDraft: buildAgentPrompt({
        workspaceRoot: state.workspaceRoot,
        rulesPath: state.rulesPath,
        contextIndexPath: state.contextIndexPath,
        origin: state.selectedOrigin === 'all' ? 'mixed-selection' : state.selectedOrigin,
        artifacts: selectedArtifacts,
        targetPanelId: state.promptTargetPanelId
      })
    })
  }

  const sendPromptToCli = async (): Promise<void> => {
    const prompt = state.promptDraft.trim()
    if (!prompt) {
      generatePromptDraft()
      return
    }

    const targetId = state.promptTargetPanelId
    const targetState = await window.workbenchShell.terminals.getState(targetId)

    if (!targetState || (!targetState.isRunning && targetState.status !== 'starting')) {
      await window.workbenchShell.terminals.start(targetId)
      window.setTimeout(() => {
        void window.workbenchShell.terminals.write(targetId, `${prompt}\r`)
      }, 1800)
    } else {
      await window.workbenchShell.terminals.write(targetId, `${prompt}\r`)
    }

    useWorkbenchStore.getState().openPanel(targetId)
  }

  const selectedScope = state.selectedOrigin === 'all'
    ? null
    : state.contextEntries.find((entry) => entry.scopeId === state.selectedOrigin) ?? null
  const workspaceFolderName = getWorkspaceFolderName(state.workspaceRoot)
  const selectedScopeArtifacts = selectedScope
    ? state.artifacts.filter((artifact) => getArtifactScopeId(artifact) === selectedScope.scopeId)
    : []
  const selectedScopeArtifactKey = selectedScopeArtifacts.map((artifact) => artifact.id).join('|')

  const deleteSelectedScope = async (): Promise<void> => {
    if (!selectedScope) {
      return
    }

    const confirmed = window.confirm(ui.deleteSessionConfirm)
    if (!confirmed) {
      return
    }

    const snapshot = await window.workbenchShell.workspace.deleteScope(selectedScope.scopeId)
    if (snapshot) {
      syncWorkspaceState(snapshot)
    }
  }

  useEffect(() => {
    let cancelled = false

    const hydrateSessionDetail = async (): Promise<void> => {
      if (!selectedScope) {
        setSessionMessages([])
        setSessionLogExcerpt('')
        return
      }

      const messageArtifact = selectedScopeArtifacts.find(
        (artifact) => artifact.type === 'json' && artifact.metadata?.captureMode === 'auto-web-messages'
      )
      if (messageArtifact) {
        const payload = await window.workbenchShell.workspace.readArtifact(messageArtifact.id)
        if (cancelled || !payload) {
          return
        }

        const parsed = parseMessageArtifact(payload.content)
        setSessionMessages(parsed)
        setSessionLogExcerpt('')
        return
      }

      const logArtifact = selectedScopeArtifacts.find((artifact) => artifact.type === 'log')
      if (logArtifact) {
        const payload = await window.workbenchShell.workspace.readArtifact(logArtifact.id)
        if (cancelled || !payload) {
          return
        }

        setSessionMessages([])
        setSessionLogExcerpt(extractLogExcerpt(payload.content))
        return
      }

      setSessionMessages([])
      setSessionLogExcerpt('')
    }

    void hydrateSessionDetail()

    return () => {
      cancelled = true
    }
  }, [selectedScope?.scopeId, selectedScopeArtifactKey])

  useEffect(() => {
    let cancelled = false

    const hydrateArtifactPreview = async (): Promise<void> => {
      if (!selectedPreviewArtifact) {
        setPreviewStatus('idle')
        setPreviewContent('')
        return
      }

      if (!supportsTextArtifactPreview(selectedPreviewArtifact.type)) {
        setPreviewStatus('unsupported')
        setPreviewContent('')
        return
      }

      setPreviewStatus('loading')
      setPreviewContent('')

      const payload = await window.workbenchShell.workspace.readArtifact(selectedPreviewArtifact.id)
      if (cancelled) {
        return
      }

      if (!payload) {
        setPreviewStatus('unavailable')
        return
      }

      setPreviewStatus('ready')
      setPreviewContent(payload.content)
    }

    void hydrateArtifactPreview()

    return () => {
      cancelled = true
    }
  }, [selectedPreviewArtifact?.id, selectedPreviewArtifact?.type])

  return (
    <div className="panel-layout">
      <section className="panel-header">
        <p className="eyebrow">{ui.workspaceLive}</p>
        <h3>{definition.title}</h3>
        <p>{ui.workspaceSimpleIntro}</p>
      </section>

      <div className="stats-row">
        <article className="stat-block">
          <span>{ui.currentWorkspace}</span>
          <strong>{workspaceFolderName || ui.workspaceInitializationPending}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.savedContexts}</span>
          <strong>{state.contextEntries.length}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.savedItems}</span>
          <strong>{state.artifactCount}</strong>
        </article>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.workspaceHowItWorks}</strong>
        </div>
        <div className="workspace-guide">
          <div className="workspace-guide__item">
            <strong>{ui.workspaceGuideCaptureTitle}</strong>
            <p>{ui.workspaceGuideCaptureBody}</p>
          </div>
          <div className="workspace-guide__item">
            <strong>{ui.workspaceGuideIndexTitle}</strong>
            <p>{ui.workspaceGuideIndexBody}</p>
          </div>
          <div className="workspace-guide__item">
            <strong>{ui.workspaceGuideRetrieveTitle}</strong>
            <p>{ui.workspaceGuideRetrieveBody}</p>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.findContext}</strong>
          <span>{selectedScope ? formatContextEntryLabel(selectedScope) : ui.allSources}</span>
        </div>
        <div className="detail-columns">
          <label className="field">
            <span>{ui.contextType}</span>
            <select
              value={state.selectedBucket}
              onChange={(event) =>
                useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
                  ...state,
                  selectedBucket: event.target.value
                })
              }
            >
              <option value="artifacts/">{ui.bucketArtifacts}</option>
              <option value="outputs/">{ui.bucketOutputs}</option>
              <option value="logs/">{ui.bucketLogs}</option>
            </select>
          </label>
          <label className="field">
            <span>{ui.selectedOrigin}</span>
            <select
              value={state.selectedOrigin}
              onChange={(event) =>
                useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
                  ...state,
                  selectedOrigin: event.target.value
                })
              }
            >
              <option value="all">{ui.allSources}</option>
              {state.contextEntries.map((entry) => (
                <option key={entry.scopeId} value={entry.scopeId}>
                  {formatContextEntryLabel(entry)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>{ui.workspaceSearch}</span>
          <input
            value={state.searchQuery}
            placeholder={ui.workspaceSearchPlaceholder}
            onChange={(event) =>
              useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
                ...state,
                searchQuery: event.target.value
              })
            }
          />
        </label>

        {selectedScope ? (
          <div className="workspace-inline-note">
            <div className="workspace-inline-note__copy">
              <strong>{ui.currentSelection}</strong>
              <span>{formatContextEntryDescription(selectedScope, locale)}</span>
            </div>
            <button
              type="button"
              className="action-button action-button--ghost action-button--danger"
              onClick={() => void deleteSelectedScope()}
            >
              {ui.deleteSession}
            </button>
          </div>
        ) : (
          <p className="section-empty">{ui.findContextHint}</p>
        )}
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.sessionList}</strong>
          <span>{filteredSessionSummaries.length} {ui.searchResultsCount}</span>
        </div>
        {state.contextEntries.length === 0 ? (
          <p className="section-empty">{ui.workspaceEmptyHint}</p>
        ) : filteredSessionSummaries.length === 0 ? (
          <p className="section-empty">{ui.noArtifactsForFilter}</p>
        ) : (
          <div className="artifact-list">
            {filteredSessionSummaries.map((session) => (
              <button
                key={session.scopeId}
                type="button"
                className={`artifact-row artifact-row--button artifact-row--session${state.selectedOrigin === session.scopeId ? ' artifact-row--active' : ''}`}
                onClick={() =>
                  useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
                    ...state,
                    selectedOrigin: session.scopeId
                  })
                }
              >
                <div className="artifact-row__body">
                  <strong>{session.title}</strong>
                  <p>{session.preview}</p>
                  <div className="session-badges">
                    {session.badges.map((badge) => (
                      <span key={`${session.scopeId}-${badge}`} className="session-badge">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="artifact-row__meta">
                  <span>{formatContextEntryLabel(session)}</span>
                  <small>{session.latestUpdatedAt ? formatTimestamp(session.latestUpdatedAt, locale) : '-'}</small>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.sessionPreview}</strong>
          <span>
            {sessionMessages.length > 0
              ? `${sessionMessages.length} ${ui.sessionMessagesCount}`
              : sessionLogExcerpt
                ? ui.sessionLogPreview
                : ui.sessionPreviewEmpty}
          </span>
        </div>
        {!selectedScope ? (
          <p className="section-empty">{ui.sessionPreviewHint}</p>
        ) : sessionMessages.length > 0 ? (
          <div className="session-timeline">
            {sessionMessages.map((message) => (
              <article key={message.id} className={`session-message session-message--${normalizeMessageRole(message.role)}`}>
                <div className="session-message__meta">
                  <span>{formatMessageRole(message.role, locale)}</span>
                </div>
                <div className="session-message__body">
                  <p>{message.text}</p>
                </div>
              </article>
            ))}
          </div>
        ) : sessionLogExcerpt ? (
          <pre className="session-log-preview">{sessionLogExcerpt}</pre>
        ) : (
          <p className="section-empty">{ui.sessionPreviewUnavailable}</p>
        )}
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{selectedScope ? ui.currentSessionContent : ui.recentArtifacts}</strong>
          <span>{filteredArtifacts.length} {ui.searchResultsCount}</span>
        </div>
        {filteredArtifacts.length === 0 ? (
          <p className="section-empty">{ui.noArtifactsForFilter}</p>
        ) : (
          <div className="artifact-list">
            {filteredArtifacts.map((artifact) => (
              <article
                key={artifact.id}
                className={`artifact-row artifact-row--selectable${state.previewArtifactId === artifact.id ? ' artifact-row--active' : ''}`}
              >
                <div className="artifact-row__select">
                  <input
                    type="checkbox"
                    checked={state.selectedArtifactIds.includes(artifact.id)}
                    onChange={() => toggleArtifactSelection(artifact.id)}
                  />
                </div>
                <div className="artifact-row__body">
                  <strong>{formatArtifactTitle(artifact, locale)}</strong>
                  <p>{formatArtifactSummary(artifact)}</p>
                </div>
                <div className="artifact-row__meta">
                  <span>{formatArtifactMeta(artifact, locale)}</span>
                  <small>{formatTimestamp(artifact.updatedAt, locale)}</small>
                </div>
                <div className="artifact-row__actions">
                  <button
                    type="button"
                    className="action-button action-button--ghost action-button--compact"
                    onClick={() => setPreviewArtifact(artifact.id)}
                  >
                    {ui.previewArtifact}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.artifactPreview}</strong>
          <span>{selectedPreviewArtifact?.id ?? ui.artifactPreviewEmpty}</span>
        </div>
        {!selectedPreviewArtifact ? (
          <p className="section-empty">{ui.artifactPreviewHint}</p>
        ) : (
          <div className="artifact-preview">
            <div className="artifact-preview__meta">
              <span>{formatArtifactMeta(selectedPreviewArtifact, locale)}</span>
              <span>{selectedPreviewArtifact.path}</span>
              <span>{formatTimestamp(selectedPreviewArtifact.updatedAt, locale)}</span>
            </div>
            <div className="artifact-preview__body">
              {previewStatus === 'loading' ? (
                <p className="section-empty">{ui.artifactPreviewLoading}</p>
              ) : previewStatus === 'unsupported' ? (
                <p className="section-empty">{ui.artifactPreviewUnsupported}</p>
              ) : previewStatus === 'unavailable' ? (
                <p className="section-empty">{ui.artifactPreviewUnavailable}</p>
              ) : (
                <pre>{previewContent}</pre>
              )}
            </div>
          </div>
        )}
      </div>

      <details className="workspace-advanced">
        <summary>{ui.advancedWorkspaceTools}</summary>

        <div className="workspace-advanced__body">
          <div className="detail-columns">
            <label className="field">
              <span>{ui.contextLabel}</span>
              <input
                value={state.draftContextLabel}
                placeholder={ui.defaultContextLabel}
                onChange={(event) =>
                  useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
                    ...state,
                    draftContextLabel: event.target.value
                  })
                }
              />
            </label>
            <label className="field">
              <span>{ui.projectId}</span>
              <input value={state.projectId} readOnly />
            </label>
          </div>

          <div className="panel-section">
            <div className="section-line">
              <strong>{ui.cliSelfSearch}</strong>
              <span>PowerShell</span>
            </div>
            <p className="section-empty">{ui.cliSelfSearchHint}</p>
            <div className="detail-list">
              <div className="detail-list__item">
                <span>`aw-workspace`</span>
                <strong>{ui.cliCommandWorkspace}</strong>
              </div>
              <div className="detail-list__item">
                <span>`aw-origins`</span>
                <strong>{ui.cliCommandOrigins}</strong>
              </div>
              <div className="detail-list__item">
                <span>`aw-origin &lt;scopeId&gt;`</span>
                <strong>{ui.cliCommandOrigin}</strong>
              </div>
              <div className="detail-list__item">
                <span>`aw-artifact &lt;id&gt;`</span>
                <strong>{ui.cliCommandArtifact}</strong>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-line">
              <strong>{ui.selectedArtifacts}</strong>
              <span>{selectedArtifacts.length} {ui.selectedCount}</span>
            </div>
            {selectedArtifacts.length === 0 ? (
              <p className="section-empty">{ui.selectionRequired}</p>
            ) : (
              <div className="artifact-list">
                {selectedArtifacts.map((artifact) => (
                  <article key={artifact.id} className="artifact-row">
                    <div className="artifact-row__body">
                      <strong>{artifact.id}</strong>
                      <p>{artifact.summary}</p>
                    </div>
                    <div className="artifact-row__meta">
                      <span>{artifact.origin}</span>
                      <small>{artifact.path}</small>
                    </div>
                    <div className="artifact-row__actions">
                      <button
                        type="button"
                        className="action-button action-button--ghost action-button--compact"
                        onClick={() => setPreviewArtifact(artifact.id)}
                      >
                        {ui.previewArtifact}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-line">
              <strong>{ui.promptBuilder}</strong>
              <span>{ui.promptPreview}</span>
            </div>
            <div className="detail-columns">
              <label className="field">
                <span>{ui.promptTarget}</span>
                <select
                  value={state.promptTargetPanelId}
                  onChange={(event) =>
                    useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
                      ...state,
                      promptTargetPanelId: event.target.value
                    })
                  }
                >
                  {terminalTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {localizePanelDefinition(target, locale).title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="action-row action-row--end">
                <button type="button" className="action-button action-button--ghost" onClick={generatePromptDraft}>
                  {ui.generatePrompt}
                </button>
                <button type="button" className="action-button" onClick={() => void sendPromptToCli()}>
                  {ui.sendPrompt}
                </button>
              </div>
            </div>
            <label className="field">
              <span>{ui.promptPreview}</span>
              <textarea
                rows={12}
                value={state.promptDraft}
                onChange={(event) =>
                  useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, {
                    ...state,
                    promptDraft: event.target.value
                  })
                }
              />
            </label>
          </div>

          <div className="panel-section">
            <div className="section-line">
              <strong>{ui.technicalPaths}</strong>
            </div>
            <div className="detail-columns">
              <label className="field">
                <span>{ui.workspaceRoot}</span>
                <input value={state.workspaceRoot || ui.workspaceInitializationPending} readOnly />
              </label>
              <label className="field">
                <span>{ui.manifest}</span>
                <input value={state.manifestPath || ui.workspaceInitializationPending} readOnly />
              </label>
            </div>
            <div className="detail-columns">
              <label className="field">
                <span>{ui.contextIndex}</span>
                <input value={state.contextIndexPath || ui.workspaceInitializationPending} readOnly />
              </label>
              <label className="field">
                <span>{ui.rules}</span>
                <input value={state.rulesPath || ui.rulesPathPending} readOnly />
              </label>
            </div>
          </div>
        </div>
      </details>

      <div className="stats-row">
        <article className="stat-block">
          <span>{ui.artifactsBucket}</span>
          <strong>{state.bucketCounts['artifacts/'] ?? 0}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.outputsBucket}</span>
          <strong>{state.bucketCounts['outputs/'] ?? 0}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.logsBucket}</span>
          <strong>{state.bucketCounts['logs/'] ?? 0}</strong>
        </article>
      </div>

      <div className="panel-section">
        <div className="detail-list">
          <strong>{state.initialized ? ui.workspaceInitialized : ui.workspaceInitializationPending}</strong>
          {state.lastSavedArtifactId ? (
            <div className="detail-list__item">
              <span>{ui.lastSaved}</span>
              <strong>{state.lastSavedArtifactId}</strong>
            </div>
          ) : null}
          {state.lastError ? (
            <div className="detail-list__item">
              <span>{ui.error}</span>
              <strong>{state.lastError}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ToolPanel({ panel, locale }: { panel: ManagedPanel; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const state = asToolViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)

  return (
    <div className="panel-layout">
      <section className="panel-header">
        <p className="eyebrow">{ui.toolPlaceholder}</p>
        <h3>{definition.title}</h3>
        <p>{ui.toolIntro}</p>
      </section>

      <div className="detail-columns">
        <label className="field">
          <span>{ui.outputFormat}</span>
          <select
            value={state.outputFormat}
            onChange={(event) =>
              updatePanelViewState(panel.definition.id, {
                ...state,
                outputFormat: event.target.value
              })
            }
          >
            <option value="pdf">pdf</option>
            <option value="png">png</option>
          </select>
        </label>
        <label className="field">
          <span>{ui.lastArtifact}</span>
          <input
            value={state.lastArtifact}
            onChange={(event) =>
              updatePanelViewState(panel.definition.id, {
                ...state,
                lastArtifact: event.target.value
              })
            }
          />
        </label>
      </div>

      <label className="field">
        <span>{ui.renderNotes}</span>
        <textarea
          rows={5}
          value={state.notes}
          onChange={(event) =>
            updatePanelViewState(panel.definition.id, {
              ...state,
              notes: event.target.value
            })
          }
        />
      </label>
    </div>
  )
}

function SettingsPanel({ panel, locale }: { panel: ManagedPanel; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const state = asSettingsViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)

  return (
    <div className="panel-layout">
      <section className="panel-header">
        <p className="eyebrow">{ui.applicationSettings}</p>
        <h3>{definition.title}</h3>
        <p>{ui.settingsIntro}</p>
      </section>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.language}</strong>
          <span>{ui.uiLocalePreference}</span>
        </div>

        <div className="detail-columns">
          <label className="field">
            <span>{ui.displayLanguage}</span>
            <select
              value={state.language}
              onChange={async (event) => {
                const language = event.target.value as SettingsPanelViewState['language']

                updatePanelViewState(panel.definition.id, {
                  ...state,
                  language
                })

                const snapshot = await window.workbenchShell.settings.update({ language })
                if (snapshot) {
                  useWorkbenchStore.getState().syncSettingsState(snapshot)
                }
              }}
            >
              <option value="system">{ui.followSystem}</option>
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <div className="detail-list">
            <div className="detail-list__item">
              <span>{ui.currentMode}</span>
              <strong>{getLanguageLabel(state.language, locale)}</strong>
            </div>
            <div className="detail-list__item">
              <span>{ui.note}</span>
              <strong>{ui.languageSwitchNote}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.theme}</strong>
          <span>{ui.themePreference}</span>
        </div>

        <div className="detail-columns">
          <label className="field">
            <span>{ui.displayTheme}</span>
            <select
              value={state.theme}
              onChange={async (event) => {
                const theme = event.target.value as SettingsPanelViewState['theme']

                updatePanelViewState(panel.definition.id, {
                  ...state,
                  theme
                })

                const snapshot = await window.workbenchShell.settings.update({ theme })
                if (snapshot) {
                  useWorkbenchStore.getState().syncSettingsState(snapshot)
                }
              }}
            >
              <option value="system">{ui.followSystem}</option>
              <option value="light">{ui.lightMode}</option>
              <option value="dark">{ui.darkMode}</option>
            </select>
          </label>
          <div className="detail-list">
            <div className="detail-list__item">
              <span>{ui.currentMode}</span>
              <strong>{getThemeLabel(state.theme, locale)}</strong>
            </div>
            <div className="detail-list__item">
              <span>{ui.note}</span>
              <strong>{ui.themePreference}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.cliStartupPrelude}</strong>
          <span>{ui.cliStartupPreludeHint}</span>
        </div>

        <label className="field">
          <span>{ui.cliStartupPrelude}</span>
          <textarea
            rows={4}
            value={state.terminalPreludeText}
            placeholder={ui.cliStartupPreludePlaceholder}
            onChange={(event) =>
              updatePanelViewState(panel.definition.id, {
                ...state,
                terminalPreludeText: event.target.value
              })
            }
          />
        </label>

        <div className="action-row action-row--end">
          <button
            type="button"
            className="action-button"
            onClick={async () => {
              const terminalPreludeCommands = state.terminalPreludeText
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)

              const snapshot = await window.workbenchShell.settings.update({ terminalPreludeCommands })
              if (snapshot) {
                useWorkbenchStore.getState().syncSettingsState(snapshot)
              }
            }}
          >
            {ui.saveConfig}
          </button>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.upcomingPreferences}</strong>
          <span>{ui.scaffoldedPlaceholders}</span>
        </div>

        <div className="artifact-list">
          {state.placeholders.map((item) => {
            const localizedItem = localizeSettingsPlaceholder(item, locale)

            return <article key={item.id} className="artifact-row">
              <div>
                <strong>{localizedItem.label}</strong>
                <p>{localizedItem.description}</p>
              </div>
              <div className="artifact-row__meta">
                <span>{getPlaceholderStatusLabel(item.status, locale)}</span>
                <small>{item.id}</small>
              </div>
            </article>
          })}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.notes}</strong>
          <span>{ui.freeFormPlaceholder}</span>
        </div>

        <label className="field">
          <span>{ui.settingsRoadmapNotes}</span>
          <textarea
            rows={5}
            value={state.notes}
            onChange={(event) =>
              updatePanelViewState(panel.definition.id, {
                ...state,
                notes: event.target.value
              })
            }
          />
        </label>
      </div>
    </div>
  )
}

function getElementBounds(element: HTMLElement) {
  const rect = element.getBoundingClientRect()

  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
}

function toNavigableUrl(rawUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl
  }

  return `https://${rawUrl}`
}

function normalizeWorkspaceSearchQuery(value: string): string {
  return value.trim().toLowerCase()
}

function matchesWorkspaceBucket(artifact: { path: string }, selectedBucket: string): boolean {
  return selectedBucket === 'artifacts/'
    ? artifact.path.startsWith('artifacts/')
    : selectedBucket === 'outputs/'
      ? artifact.path.startsWith('outputs/')
      : artifact.path.startsWith('logs/')
}

function matchesWorkspaceArtifactQuery(artifact: ArtifactRecord, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true
  }

  return buildArtifactSearchText(artifact).includes(normalizedQuery)
}

function buildArtifactSearchText(artifact: ArtifactRecord): string {
  const metadataValues = artifact.metadata
    ? Object.values(artifact.metadata)
        .flatMap((value) => normalizeSearchValue(value))
        .join(' ')
    : ''

  return [
    artifact.id,
    artifact.name,
    artifact.origin,
    artifact.summary,
    artifact.path,
    artifact.absolutePath,
    artifact.type,
    artifact.tags.join(' '),
    metadataValues
  ]
    .join(' ')
    .toLowerCase()
}

function buildSessionSearchText(entry: ContextIndexEntry, artifacts: ArtifactRecord[]): string {
  return [entry.origin, entry.contextLabel, entry.scopeId, ...artifacts.map((artifact) => buildArtifactSearchText(artifact))]
    .join(' ')
    .toLowerCase()
}

function normalizeSearchValue(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeSearchValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => normalizeSearchValue(item))
  }

  return []
}

function supportsTextArtifactPreview(type: ArtifactRecord['type']): boolean {
  return ['markdown', 'text', 'json', 'log', 'code', 'review', 'html'].includes(type)
}

function getWorkspaceFolderName(workspaceRoot: string): string {
  if (!workspaceRoot) {
    return ''
  }

  const normalized = workspaceRoot.replace(/[\\/]+$/, '')
  const parts = normalized.split(/[\\/]/)
  return parts[parts.length - 1] || normalized
}

function buildSessionSummary(
  entry: ContextIndexEntry,
  artifacts: ArtifactRecord[],
  locale: ReturnType<typeof resolveLocale>
): {
  scopeId: string
  origin: string
  contextLabel: string
  title: string
  preview: string
  badges: string[]
  latestUpdatedAt: string | null
} {
  const scopedArtifacts = entry.artifactIds
    .map((artifactId) => artifacts.find((artifact) => artifact.id === artifactId))
    .filter((artifact): artifact is ArtifactRecord => Boolean(artifact))
  const representative =
    scopedArtifacts.find((artifact) => artifact.type === 'json') ??
    scopedArtifacts.find((artifact) => artifact.type === 'markdown') ??
    scopedArtifacts[0]
  const messageCount = Number(representative?.metadata?.messageCount ?? 0)
  const transcriptCount = scopedArtifacts.filter((artifact) => artifact.type === 'markdown').length
  const logCount = scopedArtifacts.filter((artifact) => artifact.type === 'log').length
  const preview = extractSessionPreview(representative) || formatContextEntryDescription(entry, locale)
  const title = deriveSessionTitle(entry, representative, locale)
  const badges = [
    locale === 'zh-CN' ? `${entry.artifactCount} 条记录` : `${entry.artifactCount} items`,
    messageCount > 0 ? (locale === 'zh-CN' ? `${messageCount} 条消息` : `${messageCount} messages`) : null,
    transcriptCount > 0 ? (locale === 'zh-CN' ? `${transcriptCount} 份转录` : `${transcriptCount} transcript${transcriptCount === 1 ? '' : 's'}`) : null,
    logCount > 0 ? (locale === 'zh-CN' ? `${logCount} 份日志` : `${logCount} log${logCount === 1 ? '' : 's'}`) : null
  ].filter((badge): badge is string => Boolean(badge))

  return {
    scopeId: entry.scopeId,
    origin: entry.origin,
    contextLabel: entry.contextLabel,
    title,
    preview,
    badges,
    latestUpdatedAt: entry.latestUpdatedAt
  }
}

function formatContextEntryLabel(entry: { origin: string; contextLabel: string }): string {
  return `${formatOriginLabel(entry.origin)} / ${entry.contextLabel}`
}

function formatContextEntryDescription(
  entry: { artifactCount: number; latestUpdatedAt: string | null },
  locale: ReturnType<typeof resolveLocale>
): string {
  const countLabel = locale === 'zh-CN'
    ? `${entry.artifactCount} 条记录`
    : `${entry.artifactCount} item${entry.artifactCount === 1 ? '' : 's'}`
  const timeLabel = entry.latestUpdatedAt ? formatTimestamp(entry.latestUpdatedAt, locale) : '-'
  return locale === 'zh-CN' ? `${countLabel} · 最近更新 ${timeLabel}` : `${countLabel} · updated ${timeLabel}`
}

function formatArtifactTitle(
  artifact: { id: string; type: string; metadata?: Record<string, unknown> },
  locale: ReturnType<typeof resolveLocale>
): string {
  const contextLabel = typeof artifact.metadata?.contextLabel === 'string' && artifact.metadata.contextLabel.trim()
    ? artifact.metadata.contextLabel
    : null
  const typeLabel = locale === 'zh-CN' ? humanizeArtifactTypeZh(artifact.type) : humanizeArtifactTypeEn(artifact.type)
  return contextLabel ? `${typeLabel} · ${contextLabel}` : `${typeLabel} · ${artifact.id}`
}

function formatArtifactSummary(artifact: { summary: string }): string {
  return artifact.summary.replace(/\s+/g, ' ').trim()
}

function formatArtifactMeta(
  artifact: { origin: string; type: string },
  locale: ReturnType<typeof resolveLocale>
): string {
  const originLabel = formatOriginLabel(artifact.origin)
  const typeLabel = locale === 'zh-CN' ? humanizeArtifactTypeZh(artifact.type) : humanizeArtifactTypeEn(artifact.type)
  return `${originLabel} · ${typeLabel}`
}

function formatOriginLabel(origin: string): string {
  switch (origin) {
    case 'deepseek-web':
      return 'DeepSeek Web'
    case 'minimax-web':
      return 'MiniMax Web'
    case 'codex-cli':
      return 'Codex CLI'
    case 'claude-code':
      return 'Claude Code'
    case 'manual':
      return 'Manual'
    default:
      return origin
    }
}

function humanizeArtifactTypeZh(type: string): string {
  switch (type) {
    case 'markdown':
      return '对话转录'
    case 'json':
      return '消息索引'
    case 'log':
      return '终端记录'
    case 'html':
      return '网页片段'
    case 'text':
      return '文本'
    default:
      return type
  }
}

function humanizeArtifactTypeEn(type: string): string {
  switch (type) {
    case 'markdown':
      return 'Transcript'
    case 'json':
      return 'Message Index'
    case 'log':
      return 'Terminal Log'
    case 'html':
      return 'Web Clip'
    case 'text':
      return 'Text'
    default:
      return type
  }
}

function deriveSessionTitle(
  entry: { origin: string; contextLabel: string },
  artifact: ArtifactRecord | undefined,
  locale: ReturnType<typeof resolveLocale>
): string {
  const contextLabel = entry.contextLabel.replace(/[-_]+/g, ' ').trim()
  const pageTitle = typeof artifact?.metadata?.pageTitle === 'string' ? artifact.metadata.pageTitle.trim() : ''

  if (pageTitle) {
    return pageTitle
  }

  if (contextLabel && contextLabel !== 'default context') {
    return contextLabel
  }

  return locale === 'zh-CN'
    ? `${formatOriginLabel(entry.origin)} 会话`
    : `${formatOriginLabel(entry.origin)} Session`
}

function extractSessionPreview(artifact: ArtifactRecord | undefined): string {
  if (!artifact) {
    return ''
  }

  const previewMatch = artifact.summary.match(/Preview:\s*(.+)$/i)
  if (previewMatch?.[1]) {
    return previewMatch[1].trim()
  }

  if (typeof artifact.metadata?.sourceUrl === 'string' && artifact.metadata.sourceUrl.trim()) {
    return artifact.metadata.sourceUrl.trim()
  }

  return artifact.summary.replace(/\s+/g, ' ').trim()
}

function formatTimestamp(value: string, locale: ReturnType<typeof resolveLocale>): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function parseMessageArtifact(content: string): Array<{ id: string; role: string; text: string }> {
  try {
    const parsed = JSON.parse(content) as {
      messages?: Array<{ id?: string; role?: string; text?: string }>
    }

    return (parsed.messages ?? [])
      .map((message, index) => ({
        id: message.id?.trim() || `message-${String(index + 1).padStart(3, '0')}`,
        role: message.role?.trim() || 'unknown',
        text: message.text?.trim() || ''
      }))
      .filter((message) => message.text.length > 0)
      .slice(0, 24)
  } catch {
    return []
  }
}

function extractLogExcerpt(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .slice(-24)
    .join('\n')
}

function normalizeMessageRole(role: string): 'user' | 'assistant' | 'system' | 'unknown' {
  const normalized = role.trim().toLowerCase()
  if (normalized === 'user') {
    return 'user'
  }
  if (normalized === 'assistant') {
    return 'assistant'
  }
  if (normalized === 'system') {
    return 'system'
  }
  return 'unknown'
}

function formatMessageRole(role: string, locale: ReturnType<typeof resolveLocale>): string {
  const normalized = normalizeMessageRole(role)
  if (locale === 'zh-CN') {
    switch (normalized) {
      case 'user':
        return '用户'
      case 'assistant':
        return '助手'
      case 'system':
        return '系统'
      default:
        return '记录'
    }
  }

  switch (normalized) {
    case 'user':
      return 'User'
    case 'assistant':
      return 'Assistant'
    case 'system':
      return 'System'
    default:
      return 'Record'
  }
}
