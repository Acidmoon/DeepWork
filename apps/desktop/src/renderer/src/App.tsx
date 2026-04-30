import { startTransition, useEffect, useState, type MouseEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Database,
  FileText,
  FolderOpen,
  Globe,
  House,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Settings,
  Terminal as TerminalIcon,
  type LucideIcon
} from 'lucide-react'
import { getStateLabel, getUiText, localizePanelDefinition, localizeSection, resolveLocale } from './i18n'
import { PanelContent } from './panel-content'
import {
  getSectionPanels,
  type ManagedPanel,
  type NavigationSection,
  type PanelState
} from '@ai-workbench/core/desktop/panels'
import type { AppSettingsSnapshot } from '@ai-workbench/core/desktop/settings'
import { asTerminalViewState, asWebViewState, asWorkspaceViewState, useWorkbenchStore } from './store'
import { getWebPanelUrlValidationMessage, validateWebPanelUrl } from './web-panel-url'

function App(): JSX.Element {
  const sections = useWorkbenchStore((state) => state.sections)
  const panels = useWorkbenchStore((state) => state.panels)
  const panelOrder = useWorkbenchStore((state) => state.panelOrder)
  const activePanelId = useWorkbenchStore((state) => state.activePanelId)
  const openPanel = useWorkbenchStore((state) => state.openPanel)
  const hidePanel = useWorkbenchStore((state) => state.hidePanel)
  const refreshActivePanelStatus = useWorkbenchStore((state) => state.refreshActivePanelStatus)
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const syncWebPanelState = useWorkbenchStore((state) => state.syncWebPanelState)
  const syncTerminalPanelState = useWorkbenchStore((state) => state.syncTerminalPanelState)
  const syncWorkspaceState = useWorkbenchStore((state) => state.syncWorkspaceState)
  const syncSettingsState = useWorkbenchStore((state) => state.syncSettingsState)
  const themePreference = useWorkbenchStore((state) =>
    state.panels.settings?.viewState.kind === 'settings' ? state.panels.settings.viewState.theme : 'system'
  )
  const locale = useWorkbenchStore((state) =>
    resolveLocale(state.panels.settings?.viewState.kind === 'settings' ? state.panels.settings.viewState.language : 'system')
  )

  useEffect(() => window.workbenchShell.webPanels.onStateChanged(syncWebPanelState), [syncWebPanelState])
  useEffect(() => window.workbenchShell.terminals.onStateChanged(syncTerminalPanelState), [syncTerminalPanelState])
  useEffect(() => window.workbenchShell.workspace.onStateChanged(syncWorkspaceState), [syncWorkspaceState])
  useEffect(() => {
    void window.workbenchShell.workspace.getState().then((snapshot) => {
      if (snapshot) {
        syncWorkspaceState(snapshot)
      }
    })
  }, [syncWorkspaceState])
  useEffect(() => {
    void window.workbenchShell.settings.getState().then((snapshot) => {
      if (snapshot) {
        syncSettingsState(snapshot)
      }
    })
  }, [syncSettingsState])
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = (): void => {
      const resolvedTheme = themePreference === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themePreference
      document.documentElement.dataset.theme = resolvedTheme
      document.documentElement.style.colorScheme = resolvedTheme
    }

    applyTheme()

    if (themePreference !== 'system') {
      return
    }

    const handleChange = (): void => {
      applyTheme()
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [themePreference])

  const activePanel = panels[activePanelId] ?? panels.home
  const activePanelDefinition = localizePanelDefinition(activePanel.definition, locale)
  const activeWebState = activePanel.definition.kind === 'web' ? asWebViewState(activePanel.viewState) : null
  const activeTerminalState = activePanel.definition.kind === 'terminal' ? asTerminalViewState(activePanel.viewState) : null
  const activeWorkspaceState = activePanel.definition.kind === 'workspace' ? asWorkspaceViewState(activePanel.viewState) : null
  const canvasUrl = activeWebState?.currentUrl || activeTerminalState?.cwd || activeWorkspaceState?.workspaceRoot || activePanelDefinition.title
  const ui = getUiText(locale)
  const primarySections = sections.filter((section) => section.id !== 'system')
  const footerSections = sections.filter((section) => section.id === 'system')
  const [contextMenu, setContextMenu] = useState<{ panelId: string; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!contextMenu) {
      return
    }

    const dismiss = (): void => {
      setContextMenu(null)
    }

    window.addEventListener('click', dismiss)
    window.addEventListener('blur', dismiss)

    return () => {
      window.removeEventListener('click', dismiss)
      window.removeEventListener('blur', dismiss)
    }
  }, [contextMenu])

  const panelMenu = contextMenu ? panels[contextMenu.panelId] : null

  const handleWorkspaceResync = async (): Promise<void> => {
    const snapshot = await window.workbenchShell.workspace.resync()
    if (snapshot) {
      useWorkbenchStore.getState().syncWorkspaceState(snapshot)
    }
  }

  const handleAddCustomWeb = async (sectionId: string): Promise<void> => {
    const settings = await window.workbenchShell.settings.getState()
    if (!settings) {
      return
    }

    const count = settings.customWebPanels.filter((panel) => panel.sectionId === sectionId).length + 1
    const id = `custom-web-${Date.now().toString(36)}`
    const section = localizeSection(sections.find((item) => item.id === sectionId) ?? sections[0], locale)
    const homeUrl = promptForCustomWebHomeUrl(locale)
    if (!homeUrl) {
      return
    }
    const titleFromUrl = deriveCustomWebTitle(homeUrl)
    const title = titleFromUrl || (locale === 'zh-CN' ? `${section.title}${ui.customWebTitle}${count}` : `${section.title} ${ui.customWebTitle} ${count}`)

    const snapshot = await persistSettingsUpdate(settings, {
      customWebPanels: [
        ...settings.customWebPanels,
        {
          id,
          title,
          sectionId,
          homeUrl,
          partition: `persist:${id}`,
          enabled: true
        }
      ]
    })

    if (snapshot) {
      startTransition(() => openPanel(id))
    }
  }

  const handleAddCustomCli = async (sectionId: string): Promise<void> => {
    const settings = await window.workbenchShell.settings.getState()
    if (!settings) {
      return
    }

    const count = settings.customTerminalPanels.filter((panel) => panel.sectionId === sectionId).length + 1
    const id = `custom-cli-${Date.now().toString(36)}`
    const section = localizeSection(sections.find((item) => item.id === sectionId) ?? sections[0], locale)
    const title = locale === 'zh-CN' ? `${section.title}${ui.customCliTitle}${count}` : `${section.title} ${ui.customCliTitle} ${count}`

    const snapshot = await persistSettingsUpdate(settings, {
      customTerminalPanels: [
        ...settings.customTerminalPanels,
        {
          id,
          title,
          sectionId,
          shell: 'powershell.exe',
          shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
          startupCommand: ''
        }
      ]
    })

    if (snapshot) {
      startTransition(() => openPanel(id))
    }
  }

  const handleRenamePanel = async (panelId: string): Promise<void> => {
    const panel = panels[panelId]
    const settings = await window.workbenchShell.settings.getState()
    if (!panel || !settings) {
      return
    }

    const nextTitle = window.prompt(ui.renamePanelPrompt, panel.definition.title)?.trim()
    if (!nextTitle || nextTitle === panel.definition.title) {
      return
    }

    const customWebPanels = settings.customWebPanels.map((item) => (item.id === panelId ? { ...item, title: nextTitle } : item))
    const customTerminalPanels = settings.customTerminalPanels.map((item) =>
      item.id === panelId ? { ...item, title: nextTitle } : item
    )

    await persistSettingsUpdate(settings, {
      customWebPanels,
      customTerminalPanels
    })
  }

  const handleDeletePanel = async (panelId: string): Promise<void> => {
    const settings = await window.workbenchShell.settings.getState()
    if (!settings) {
      return
    }

    await persistSettingsUpdate(settings, {
      customWebPanels: settings.customWebPanels.filter((item) => item.id !== panelId),
      customTerminalPanels: settings.customTerminalPanels.filter((item) => item.id !== panelId)
    })
  }

  async function persistSettingsUpdate(
    current: AppSettingsSnapshot,
    update: Partial<Pick<AppSettingsSnapshot, 'customWebPanels' | 'customTerminalPanels'>>
  ): Promise<AppSettingsSnapshot | null> {
    const snapshot = await window.workbenchShell.settings.update({
      customWebPanels: update.customWebPanels ?? current.customWebPanels,
      customTerminalPanels: update.customTerminalPanels ?? current.customTerminalPanels
    })

    if (snapshot) {
      syncSettingsState(snapshot)
      setContextMenu(null)
    }

    return snapshot
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">AI</div>
          <div className="sidebar__brand-copy">
            <h1>{ui.appTitle}</h1>
            <p>{ui.appSubtitle}</p>
          </div>
        </div>

        <label className="sidebar__search" aria-label={ui.searchTools}>
          <Search className="sidebar__search-icon" size={15} aria-hidden="true" />
          <input type="text" placeholder={ui.searchTools} />
          <kbd>Ctrl+K</kbd>
        </label>

        <nav className="sidebar__nav" aria-label={ui.workbenchNavigation}>
          {primarySections.map((section) => {
            const sectionAction =
              section.id === 'web'
                ? { label: ui.addWeb, onClick: () => void handleAddCustomWeb(section.id) }
                : section.id === 'agents'
                  ? { label: ui.addCli, onClick: () => void handleAddCustomCli(section.id) }
                  : null

            return (
            <SidebarSection
              key={section.id}
              section={localizeSection(section, locale)}
              panels={getSectionPanels(section.id, panels, panelOrder)}
              activePanelId={activePanelId}
              locale={locale}
              actionLabel={sectionAction?.label}
              onSectionAction={sectionAction?.onClick}
              onSelect={(panelId) => {
                startTransition(() => openPanel(panelId))
              }}
              onClose={(panelId) => {
                startTransition(() => hidePanel(panelId))
              }}
              onItemMenu={(panelId, event) => {
                setContextMenu({
                  panelId,
                  x: event.clientX,
                  y: event.clientY
                })
              }}
            />
            )
          })}
        </nav>

        {footerSections.length > 0 ? (
          <div className="sidebar__footer">
            {footerSections.map((section) => (
              <SidebarSection
                key={section.id}
                section={localizeSection(section, locale)}
              panels={getSectionPanels(section.id, panels, panelOrder)}
              activePanelId={activePanelId}
              locale={locale}
              onSelect={(panelId) => {
                startTransition(() => openPanel(panelId))
              }}
              onClose={(panelId) => {
                startTransition(() => hidePanel(panelId))
              }}
              onItemMenu={(panelId, event) => {
                setContextMenu({
                  panelId,
                    x: event.clientX,
                    y: event.clientY
                  })
                }}
              />
            ))}
          </div>
        ) : null}
      </aside>

      <main className="workspace">
        <section className="panel-canvas">
          <div className={`canvas canvas--${activePanel.definition.kind}`}>
            <div className="canvas__frame">
              <div className="canvas__toolbar">
                {activeWebState ? (
                  <div className="toolbar-nav">
                    <WebPanelActions panel={activePanel} locale={locale} />
                    <WebPanelAddressBar panel={activePanel} locale={locale} updatePanelViewState={updatePanelViewState} />
                    <WebPanelQuickActions
                      panel={activePanel}
                      locale={locale}
                      updatePanelViewState={updatePanelViewState}
                    />
                  </div>
                ) : activeTerminalState ? (
                  <div className="toolbar-nav toolbar-nav--compact">
                    <TerminalPanelActions panel={activePanel} locale={locale} />
                    <TerminalPanelQuickActions
                      panel={activePanel}
                      locale={locale}
                      updatePanelViewState={updatePanelViewState}
                    />
                  </div>
                ) : (
                  <div className="toolbar-panel-meta">
                    <span className="toolbar-panel-meta__group">{activePanelDefinition.group}</span>
                    <strong>{activePanelDefinition.title}</strong>
                    <span>{canvasUrl}</span>
                  </div>
                )}
                <div className="toolbar-meta">
                  {activeWorkspaceState ? <WorkspacePanelActions panel={activePanel} locale={locale} /> : null}
                  {!activeWebState && !activeTerminalState ? (
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={() => {
                        if (activeWorkspaceState) {
                          void handleWorkspaceResync()
                          return
                        }

                        refreshActivePanelStatus()
                      }}
                      title={ui.sync}
                      aria-label={ui.sync}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      {ui.sync}
                    </button>
                  ) : null}
                  <StatusPill state={activePanel.definition.state} locale={locale} />
                </div>
              </div>
              <div className={`canvas__body ${activeWebState || activeTerminalState ? 'canvas__body--immersive' : ''}`}>
                <PanelContent panel={activePanel} />
              </div>
            </div>
          </div>
        </section>

        <footer className="status-bar">
          <div className="status-bar__section">
            <span>{activePanelDefinition.title}</span>
            <span className="status-bar__dot" />
            <span>{activePanel.definition.state === 'validated' ? ui.connected : ui.standby}</span>
          </div>
          <div className="status-bar__section">
            <span>{ui.workspaceDefault}</span>
            <span className="status-bar__divider" />
            <span>{ui.lastSync}: {activePanel.lastStatusCheckAt}</span>
          </div>
          <div className="status-bar__section">
            <span className="status-bar__dot" />
            <span>Electron {window.workbenchShell.versions.electron}</span>
          </div>
        </footer>
      </main>

      {contextMenu && panelMenu?.definition.userDefined ? (
        <div
          className="context-menu"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className="context-menu__item" onClick={() => void handleRenamePanel(contextMenu.panelId)}>
            {ui.rename}
          </button>
          <button
            type="button"
            className="context-menu__item context-menu__item--danger"
            onClick={() => void handleDeletePanel(contextMenu.panelId)}
          >
            {ui.delete}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function deriveCustomWebTitle(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

interface SidebarSectionProps {
  section: NavigationSection
  panels: ManagedPanel[]
  activePanelId: string
  locale: ReturnType<typeof resolveLocale>
  actionLabel?: string
  onSectionAction?: () => void
  onSelect: (panelId: string) => void
  onClose: (panelId: string) => void
  onItemMenu: (panelId: string, event: MouseEvent<HTMLButtonElement>) => void
}

function SidebarSection({
  section,
  panels,
  activePanelId,
  locale,
  actionLabel,
  onSectionAction,
  onSelect,
  onClose,
  onItemMenu
}: SidebarSectionProps): JSX.Element {
  const ui = getUiText(locale)

  return (
    <section className="nav-section">
      <div className="nav-section__header">
        <div className="nav-section__title-row">
          <h2>{section.title}</h2>
          {actionLabel && onSectionAction ? (
            <button type="button" className="section-action" onClick={onSectionAction} title={actionLabel} aria-label={actionLabel}>
              <Plus size={13} aria-hidden="true" />
              <span>{actionLabel}</span>
            </button>
          ) : null}
        </div>
        <p>{section.caption}</p>
      </div>
      <div className="nav-section__items">
        {panels.map((panel) => {
          const definition = localizePanelDefinition(panel.definition, locale)
          const PanelIcon = getPanelIcon(panel.definition.kind)
          const visibilityLabel = `${panel.isVisible ? ui.closePanel : ui.open} ${definition.title}`

          return (
            <div
              key={panel.definition.id}
              className={`nav-item ${activePanelId === panel.definition.id ? ' nav-item--active' : ''}`}
              onContextMenu={(event) => {
                if (!panel.definition.userDefined) {
                  return
                }

                event.preventDefault()
                onItemMenu(panel.definition.id, event as unknown as MouseEvent<HTMLButtonElement>)
              }}
            >
              <button type="button" className="nav-item__button" onClick={() => onSelect(panel.definition.id)}>
                <span className="nav-item__main">
                  <span className="nav-item__icon">
                    <PanelIcon size={15} aria-hidden="true" />
                  </span>
                  <strong>{definition.title}</strong>
                </span>
              </button>
              <div className="nav-item__meta">
                <button
                  type="button"
                  className={`nav-item__dot${panel.isVisible ? ' nav-item__dot--open' : ''}`}
                  aria-label={visibilityLabel}
                  title={visibilityLabel}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (panel.isVisible) {
                      onClose(panel.definition.id)
                      return
                    }

                    onSelect(panel.definition.id)
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StatusPill({ state, locale }: { state: PanelState; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  return <span className={`state-pill state-pill--${state}`}>{getStateLabel(state, locale)}</span>
}

function WebPanelAddressBar({
  panel,
  locale,
  updatePanelViewState
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
  updatePanelViewState: (panelId: string, viewState: ManagedPanel['viewState']) => void
}): JSX.Element {
  const state = asWebViewState(panel.viewState)
  const ui = getUiText(locale)
  const [draftUrl, setDraftUrl] = useState(state.currentUrl)

  useEffect(() => {
    setDraftUrl(state.currentUrl)
  }, [panel.definition.id, state.currentUrl])

  const navigateToDraftUrl = (): void => {
    const result = validateWebPanelUrl(draftUrl)
    if (!result.ok || !result.url) {
      updatePanelViewState(panel.definition.id, {
        ...state,
        lastError: getWebPanelUrlValidationMessage(result.error, locale)
      })
      return
    }

    setDraftUrl(result.url)
    updatePanelViewState(panel.definition.id, {
      ...state,
      lastError: null
    })

    if (result.url === state.currentUrl) {
      return
    }

    void window.workbenchShell.webPanels.navigate(panel.definition.id, 'load-url', result.url)
  }

  return (
    <>
      <div className={`toolbar-address${!state.enabled ? ' toolbar-address--static' : ''}`}>
        <span className="toolbar-address__origin">{state.enabled ? ui.address : ui.reserved}</span>
        <input
          aria-label={ui.address}
          disabled={!state.enabled}
          value={draftUrl}
          onChange={(event) => {
            setDraftUrl(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') {
              return
            }

            event.preventDefault()
            navigateToDraftUrl()
          }}
        />
      </div>
      <button
        type="button"
        className="action-button action-button--compact"
        disabled={!state.enabled}
        onClick={navigateToDraftUrl}
      >
        {ui.go}
      </button>
    </>
  )
}

function WebPanelActions({ panel, locale }: { panel: ManagedPanel; locale: ReturnType<typeof resolveLocale> }): JSX.Element {
  const state = asWebViewState(panel.viewState)
  const ui = getUiText(locale)

  return (
    <>
      <button
        type="button"
        className="toolbar-icon"
        disabled={!state.enabled || !state.canGoBack}
        aria-label={ui.back}
        title={ui.back}
        onClick={() => {
          void window.workbenchShell.webPanels.navigate(panel.definition.id, 'back')
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="toolbar-icon"
        disabled={!state.enabled || !state.canGoForward}
        aria-label={ui.forward}
        title={ui.forward}
        onClick={() => {
          void window.workbenchShell.webPanels.navigate(panel.definition.id, 'forward')
        }}
      >
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="toolbar-icon"
        disabled={!state.enabled}
        aria-label={ui.reload}
        title={ui.reload}
        onClick={() => {
          void window.workbenchShell.webPanels.navigate(panel.definition.id, 'reload')
        }}
      >
        <RefreshCw size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="toolbar-icon"
        disabled={!state.enabled}
        aria-label={ui.home}
        title={ui.home}
        onClick={() => {
          void window.workbenchShell.webPanels.navigate(panel.definition.id, 'home')
        }}
      >
        <House size={16} aria-hidden="true" />
      </button>
    </>
  )
}

function TerminalPanelActions({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const state = asTerminalViewState(panel.viewState)
  const ui = getUiText(locale)

  return (
    <>
      <button
        type="button"
        className="action-button"
        disabled={state.status === 'starting'}
        title={state.isRunning || state.status === 'starting' ? ui.restart : ui.start}
        onClick={() => {
          if (state.isRunning || state.status === 'starting') {
            void window.workbenchShell.terminals.restart(panel.definition.id)
            return
          }

          void window.workbenchShell.terminals.start(panel.definition.id)
        }}
      >
        {state.isRunning || state.status === 'starting' ? (
          <RotateCw size={14} aria-hidden="true" />
        ) : (
          <Play size={14} aria-hidden="true" />
        )}
        {state.isRunning || state.status === 'starting' ? ui.restart : ui.start}
      </button>
    </>
  )
}

function WebPanelQuickActions({
  panel,
  locale,
  updatePanelViewState
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
  updatePanelViewState: (panelId: string, viewState: ManagedPanel['viewState']) => void
}): JSX.Element {
  const state = asWebViewState(panel.viewState)
  const ui = getUiText(locale)

  return (
    <>
      <span className="mini-pill">{state.sessionPersisted ? ui.persistent : ui.ephemeral}</span>
      {state.lastError ? <span className="mini-pill mini-pill--warn">{ui.error}</span> : null}
      <button
        type="button"
        className="toolbar-icon"
        aria-label={state.showDetails ? ui.hideDetails : ui.showDetails}
        title={state.showDetails ? ui.hideDetails : ui.showDetails}
        onClick={() =>
          updatePanelViewState(panel.definition.id, {
            ...state,
            showDetails: !state.showDetails
          })
        }
      >
        {state.showDetails ? <PanelRightClose size={16} aria-hidden="true" /> : <PanelRightOpen size={16} aria-hidden="true" />}
      </button>
    </>
  )
}

function TerminalPanelQuickActions({
  panel,
  locale,
  updatePanelViewState
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
  updatePanelViewState: (panelId: string, viewState: ManagedPanel['viewState']) => void
}): JSX.Element {
  const state = asTerminalViewState(panel.viewState)
  const ui = getUiText(locale)

  return (
    <>
      <span className="mini-pill">{ui.terminalLabel}</span>
      {state.pendingRestart ? <span className="mini-pill mini-pill--warn">{ui.restartToApply}</span> : null}
      {state.lastError ? <span className="mini-pill mini-pill--warn">{ui.error}</span> : null}
      <button
        type="button"
        className="toolbar-icon"
        aria-label={state.showDetails ? ui.hideDetails : ui.showDetails}
        title={state.showDetails ? ui.hideDetails : ui.showDetails}
        onClick={() =>
          updatePanelViewState(panel.definition.id, {
            ...state,
            showDetails: !state.showDetails
          })
        }
      >
        {state.showDetails ? <PanelRightClose size={16} aria-hidden="true" /> : <PanelRightOpen size={16} aria-hidden="true" />}
      </button>
    </>
  )
}

function WorkspacePanelActions({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const ui = getUiText(locale)

  return (
    <>
      <button
        type="button"
        className="action-button action-button--ghost"
        onClick={async () => {
          const snapshot = await window.workbenchShell.workspace.chooseRoot()
          if (snapshot) {
            useWorkbenchStore.getState().syncWorkspaceState(snapshot)
          }
        }}
      >
        <FolderOpen size={14} aria-hidden="true" />
        {ui.chooseWorkspace}
      </button>
      <button
        type="button"
        className="action-button"
        onClick={async () => {
          const workspaceState = panel.viewState.kind === 'workspace' ? panel.viewState : null
          const result = await window.workbenchShell.workspace.saveClipboard({
            origin: panel.definition.id === 'artifacts' ? 'manual' : panel.definition.id,
            contextLabel: workspaceState?.draftContextLabel?.trim() || undefined
          })

          if (result) {
            useWorkbenchStore.getState().syncWorkspaceState(result.snapshot)
          }
        }}
      >
        <ClipboardCheck size={14} aria-hidden="true" />
        {ui.saveClipboard}
      </button>
    </>
  )
}

export default App

function getPanelIcon(kind: ManagedPanel['definition']['kind']): LucideIcon {
  switch (kind) {
    case 'web':
      return Globe
    case 'terminal':
      return TerminalIcon
    case 'workspace':
      return Database
    case 'settings':
      return Settings
    case 'tool':
      return FileText
    case 'home':
    default:
      return LayoutDashboard
  }
}

function promptForCustomWebHomeUrl(locale: ReturnType<typeof resolveLocale>, initialValue = 'https://example.com/'): string | null {
  const ui = getUiText(locale)
  let promptLabel: string = ui.customWebUrlPrompt
  let nextValue: string = initialValue

  while (true) {
    const requestedUrl = window.prompt(promptLabel, nextValue)
    if (requestedUrl === null) {
      return null
    }

    const result = validateWebPanelUrl(requestedUrl)
    if (result.ok && result.url) {
      return result.url
    }

    promptLabel = `${ui.customWebUrlPrompt}\n\n${getWebPanelUrlValidationMessage(result.error, locale)}`
    nextValue = requestedUrl.trim() || initialValue
  }
}
