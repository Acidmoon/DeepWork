import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { Terminal } from '@xterm/xterm'
import { getTerminalStatusLabel, getUiText, resolveLocale } from '../i18n'
import { asTerminalViewState, useWorkbenchStore } from '../store'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'
import type { TerminalRetrievalSummary } from '@ai-workbench/core/desktop/terminal-panels'

function parseShellArgs(editorText: string): string[] {
  return editorText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function areStringListsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function isMultilineTerminalInput(data: string): boolean {
  const normalizedData = data.replace(/\x1b\[200~/gu, '').replace(/\x1b\[201~/gu, '')

  if (normalizedData.includes('\n')) {
    return true
  }

  const carriageReturns = normalizedData.match(/\r/gu)?.length ?? 0
  return carriageReturns > 1 || (carriageReturns === 1 && normalizedData.trim().length > 1)
}

function normalizeRetrievalToken(value: string | null): string {
  return (value ?? '').trim().toLowerCase().replaceAll('-', '_')
}

function formatRetrievalMode(
  summary: TerminalRetrievalSummary,
  ui: ReturnType<typeof getUiText>
): string {
  switch (normalizeRetrievalToken(summary.retrievalMode)) {
    case 'thread_local':
      return ui.retrievalModeThreadLocal
    case 'global_fallback':
      return ui.retrievalModeGlobalFallback
    case 'global_preferred':
      return ui.retrievalModeGlobalPreferred
    default:
      return summary.retrievalMode ?? ui.retrievalModeUnknown
  }
}

function formatRetrievalOutcome(
  summary: TerminalRetrievalSummary,
  ui: ReturnType<typeof getUiText>
): string {
  const outcome = normalizeRetrievalToken(summary.outcome)
  const mode = normalizeRetrievalToken(summary.retrievalMode)

  if (outcome === 'selected_scope' && mode === 'global_fallback') {
    return ui.retrievalOutcomeGlobalFallback
  }

  if (outcome === 'selected_scope' && mode === 'global_preferred') {
    return ui.retrievalOutcomeGlobalPreferred
  }

  switch (outcome) {
    case 'selected_scope':
      return ui.retrievalOutcomeSelectedScope
    case 'no_match':
      return ui.retrievalOutcomeNoMatch
    case 'superseded':
      return ui.retrievalOutcomeSuperseded
    default:
      return summary.outcome || ui.retrievalModeUnknown
  }
}

function formatAuditReference(summary: TerminalRetrievalSummary, ui: ReturnType<typeof getUiText>): string {
  if (!summary.auditPath) {
    return ui.retrievalAuditUnavailable
  }

  const parts = summary.auditPath.split(/[\\/]/u)
  const filename = parts[parts.length - 1] || summary.auditPath
  return summary.auditLine ? `${filename}:${summary.auditLine}` : filename
}

export function TerminalPanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const terminalHostRef = useRef<HTMLDivElement | null>(null)
  const terminalInstanceRef = useRef<Terminal | null>(null)
  const launchCountRef = useRef(0)
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const syncTerminalPanelState = useWorkbenchStore((state) => state.syncTerminalPanelState)
  const syncSettingsState = useWorkbenchStore((state) => state.syncSettingsState)
  const state = asTerminalViewState(panel.viewState)
  const ui = getUiText(locale)
  const terminalBehaviorRef = useRef(state.terminalBehavior)
  const pasteConfirmationPromptRef = useRef(ui.confirmMultilinePastePrompt)
  const inspectorLabel = `${panel.definition.title} ${ui.showDetails}`
  const isCustomPanel = panel.definition.userDefined === true
  const [customPanelTitle, setCustomPanelTitle] = useState(panel.definition.title)
  const normalizedDraftShell = state.draftShell.trim()
  const normalizedDraftShellArgs = parseShellArgs(state.draftShellArgsText)
  const normalizedDraftCwd = state.draftCwd.trim()
  const normalizedDraftStartupCommand = state.draftStartupCommand.trim()
  const normalizedCustomPanelTitle = customPanelTitle.trim()
  const hasConfigChanges = isCustomPanel
    ? normalizedCustomPanelTitle !== panel.definition.title ||
      normalizedDraftShell !== state.savedShell ||
      !areStringListsEqual(normalizedDraftShellArgs, state.savedShellArgs) ||
      normalizedDraftCwd !== state.savedCwd ||
      normalizedDraftStartupCommand !== state.savedStartupCommand
    : normalizedDraftCwd !== state.savedCwd || normalizedDraftStartupCommand !== state.savedStartupCommand
  const canSaveConfig = isCustomPanel ? normalizedCustomPanelTitle.length > 0 && normalizedDraftShell.length > 0 && hasConfigChanges : hasConfigChanges

  useEffect(() => {
    setIsSaving(false)
  }, [panel.definition.id, state.savedShell, state.savedCwd, state.savedStartupCommand, state.pendingRestart])

  useEffect(() => {
    setCustomPanelTitle(panel.definition.title)
  }, [panel.definition.id, panel.definition.title])

  useEffect(() => {
    terminalBehaviorRef.current = state.terminalBehavior

    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.options.scrollback = state.terminalBehavior.scrollbackLines
    }

    if (terminalHostRef.current) {
      terminalHostRef.current.dataset.scrollbackLines = String(state.terminalBehavior.scrollbackLines)
      terminalHostRef.current.dataset.copyOnSelection = String(state.terminalBehavior.copyOnSelection)
      terminalHostRef.current.dataset.confirmMultilinePaste = String(state.terminalBehavior.confirmMultilinePaste)
    }
  }, [state.terminalBehavior])

  useEffect(() => {
    pasteConfirmationPromptRef.current = ui.confirmMultilinePastePrompt
  }, [ui.confirmMultilinePastePrompt])

  const runTerminalAction = async (): Promise<void> => {
    if (state.isRunning || state.status === 'starting') {
      await window.workbenchShell.terminals.restart(panel.definition.id)
      return
    }

    await window.workbenchShell.terminals.start(panel.definition.id)
  }

  const persistConfig = async (): Promise<void> => {
    if (!canSaveConfig) {
      return
    }

    const settings = await window.workbenchShell.settings.getState()
    if (!settings) {
      return
    }

    setIsSaving(true)

    try {
      if (isCustomPanel) {
        const nextTitle = normalizedCustomPanelTitle
        if (!nextTitle) {
          updatePanelViewState(panel.definition.id, {
            ...state,
            lastError: ui.workspaceProfileNeedsName
          })
          return
        }

        const snapshot = await window.workbenchShell.settings.update({
          customTerminalPanels: settings.customTerminalPanels.map((item) => {
            if (item.id !== panel.definition.id) {
              return item
            }

            const { cwd: _cwd, ...rest } = item

            return {
              ...rest,
              title: nextTitle,
              shell: normalizedDraftShell,
              shellArgs: normalizedDraftShellArgs,
              ...(normalizedDraftCwd ? { cwd: normalizedDraftCwd } : {}),
              startupCommand: normalizedDraftStartupCommand
            }
          })
        })

        if (snapshot) {
          syncSettingsState(snapshot)
        }

        return
      }

      const nextBuiltInTerminalPanels = {
        ...(settings.builtInTerminalPanels ?? {})
      }

      if (!normalizedDraftCwd && !normalizedDraftStartupCommand) {
        delete nextBuiltInTerminalPanels[panel.definition.id]
      } else {
        nextBuiltInTerminalPanels[panel.definition.id] = {
          ...(normalizedDraftCwd ? { cwd: normalizedDraftCwd } : {}),
          ...(normalizedDraftStartupCommand ? { startupCommand: normalizedDraftStartupCommand } : {})
        }
      }

      const snapshot = await window.workbenchShell.settings.update({
        builtInTerminalPanels: nextBuiltInTerminalPanels
      })

      if (snapshot) {
        syncSettingsState(snapshot)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const removeCustomPanel = async (): Promise<void> => {
    if (!isCustomPanel || !window.confirm(ui.confirmDelete)) {
      return
    }

    const settings = await window.workbenchShell.settings.getState()
    if (!settings) {
      return
    }

    const snapshot = await window.workbenchShell.settings.update({
      customTerminalPanels: settings.customTerminalPanels.filter((item) => item.id !== panel.definition.id)
    })

    if (snapshot) {
      syncSettingsState(snapshot)
    }
  }

  useEffect(() => {
    const host = terminalHostRef.current
    if (!host) {
      return
    }

    const terminal = new Terminal({
      allowProposedApi: true,
      cursorBlink: true,
      customGlyphs: true,
      fontFamily: '"Cascadia Mono", "Cascadia Code", "IBM Plex Mono", "Microsoft YaHei", "Noto Sans Mono CJK SC", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      rescaleOverlappingGlyphs: true,
      scrollback: terminalBehaviorRef.current.scrollbackLines,
      windowsMode: window.workbenchShell.platform === 'win32',
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
    const unicode11Addon = new Unicode11Addon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(unicode11Addon)
    terminal.unicode.activeVersion = '11'
    terminal.open(host)
    terminalInstanceRef.current = terminal
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
      if (
        terminalBehaviorRef.current.confirmMultilinePaste &&
        isMultilineTerminalInput(data) &&
        !window.confirm(pasteConfirmationPromptRef.current)
      ) {
        return
      }

      void window.workbenchShell.terminals.write(panel.definition.id, data)
    })

    const selectionSubscription = terminal.onSelectionChange(() => {
      if (!terminalBehaviorRef.current.copyOnSelection || !terminal.hasSelection()) {
        return
      }

      const selection = terminal.getSelection()
      if (selection) {
        window.workbenchShell.clipboard.writeText(selection)
      }
    })

    host.classList.add('terminal-host--ready')
    host.dataset.scrollbackLines = String(terminalBehaviorRef.current.scrollbackLines)
    host.dataset.copyOnSelection = String(terminalBehaviorRef.current.copyOnSelection)
    host.dataset.confirmMultilinePaste = String(terminalBehaviorRef.current.confirmMultilinePaste)

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
      selectionSubscription.dispose()
      outputCleanup()
      stateCleanup()
      if (terminalInstanceRef.current === terminal) {
        terminalInstanceRef.current = null
      }
      terminal.dispose()
    }
  }, [panel.definition.id, syncTerminalPanelState])

  return (
    <div className="immersive-panel immersive-panel--terminal">
      <div className="terminal-stage terminal-stage--immersive">
        {state.showDetails ? (
          <div className="stage-drawer stage-inspector" aria-label={inspectorLabel}>
            {isCustomPanel ? (
              <label className="field field--wide">
                <span>{ui.panelName}</span>
                <input
                  value={customPanelTitle}
                  onChange={(event) => {
                    setCustomPanelTitle(event.target.value)
                    updatePanelViewState(panel.definition.id, {
                      ...state,
                      lastError: null
                    })
                  }}
                />
              </label>
            ) : null}
            <div className={`detail-columns${isCustomPanel ? ' detail-columns--wide' : ''}`}>
              <label className={`field${isCustomPanel ? ' field--wide' : ''}`}>
                <span>{ui.shell}</span>
                <input
                  value={isCustomPanel ? state.draftShell : state.shell}
                  readOnly={!isCustomPanel}
                  onChange={(event) =>
                    updatePanelViewState(panel.definition.id, {
                      ...state,
                      draftShell: event.target.value
                    })
                  }
                />
              </label>
              {isCustomPanel ? (
                <label className="field">
                  <span>{ui.shellArguments}</span>
                  <textarea
                    rows={4}
                    value={state.draftShellArgsText}
                    placeholder={ui.shellArgumentsPlaceholder}
                    onChange={(event) =>
                      updatePanelViewState(panel.definition.id, {
                        ...state,
                        draftShellArgsText: event.target.value
                      })
                    }
                  />
                </label>
              ) : null}
            </div>

            <div className="detail-columns detail-columns--wide">
              <label className="field">
                <span>{ui.workingDirectory}</span>
                <input
                  value={state.draftCwd}
                  placeholder={state.cwd}
                  onChange={(event) =>
                    updatePanelViewState(panel.definition.id, {
                      ...state,
                      draftCwd: event.target.value
                    })
                  }
                />
              </label>
              <label className="field field--wide">
                <span>{ui.startupCommand}</span>
                <textarea
                  rows={3}
                  value={state.draftStartupCommand}
                  placeholder={isCustomPanel ? '' : state.startupCommand}
                  onChange={(event) =>
                    updatePanelViewState(panel.definition.id, {
                      ...state,
                      draftStartupCommand: event.target.value
                    })
                  }
                />
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

            {state.retrievalSummary ? (
              <section className="retrieval-summary" aria-label={ui.retrievalContext}>
                <div className="stats-row">
                  <article className="stat-block">
                    <span>{ui.retrievalContext}</span>
                    <strong>{formatRetrievalOutcome(state.retrievalSummary, ui)}</strong>
                  </article>
                  <article className="stat-block">
                    <span>{ui.retrievalMode}</span>
                    <strong>{formatRetrievalMode(state.retrievalSummary, ui)}</strong>
                  </article>
                  <article className="stat-block">
                    <span>{ui.retrievalSelectedScope}</span>
                    <strong>{state.retrievalSummary.selectedScopeId ?? ui.retrievalNoSelection}</strong>
                  </article>
                </div>

                <div className="stats-row">
                  <article className="stat-block">
                    <span>{ui.retrievalQuery}</span>
                    <strong>{state.retrievalSummary.query || ui.retrievalQueryUnknown}</strong>
                  </article>
                  <article className="stat-block">
                    <span>{ui.retrievalCandidates}</span>
                    <strong>{state.retrievalSummary.candidateCount}</strong>
                  </article>
                  <article className="stat-block">
                    <span>{ui.retrievalAudit}</span>
                    <strong>{formatAuditReference(state.retrievalSummary, ui)}</strong>
                  </article>
                </div>

                <p className="drawer-note">
                  {state.retrievalSummary.reason ? `${ui.retrievalReason}: ${state.retrievalSummary.reason}` : ui.retrievalInspectionHint}
                </p>
              </section>
            ) : null}

            <div className="action-row">
              <button
                type="button"
                className="action-button action-button--ghost"
                disabled={!canSaveConfig || isSaving}
                onClick={() => void persistConfig()}
              >
                {isCustomPanel ? ui.save : ui.saveConfig}
              </button>
              <button
                type="button"
                className="action-button"
                disabled={state.status === 'starting'}
                onClick={() => void runTerminalAction()}
              >
                {state.pendingRestart ? ui.restartToApply : state.isRunning || state.status === 'starting' ? ui.restart : ui.start}
              </button>
              {isCustomPanel ? (
                <button type="button" className="action-button action-button--danger" onClick={() => void removeCustomPanel()}>
                  {ui.delete}
                </button>
              ) : null}
            </div>

            <p className="drawer-note">
              {isCustomPanel ? ui.terminalConfigApplyHint : ui.builtInTerminalConfigHint}
            </p>
          </div>
        ) : null}

        <div ref={terminalHostRef} className="terminal-host" aria-label={`${panel.definition.title} terminal host`} />
      </div>
    </div>
  )
}
