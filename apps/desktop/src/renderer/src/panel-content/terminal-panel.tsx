import { useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { getTerminalStatusLabel, getUiText, resolveLocale } from '../i18n'
import { asTerminalViewState, useWorkbenchStore } from '../store'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'

export function TerminalPanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
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
