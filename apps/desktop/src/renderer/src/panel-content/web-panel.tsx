import { useEffect, useRef, useState } from 'react'
import { getUiText, localizePanelDefinition, resolveLocale } from '../i18n'
import { asWebViewState, useWorkbenchStore } from '../store'
import { getWebPanelUrlValidationMessage, validateWebPanelUrl } from '../web-panel-url'
import { getElementBounds } from './shared'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'

export function WebPanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const syncWebPanelState = useWorkbenchStore((state) => state.syncWebPanelState)
  const state = asWebViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const isCustomPanel = panel.definition.userDefined === true
  const [customPanelTitle, setCustomPanelTitle] = useState(panel.definition.title)

  useEffect(() => {
    setCustomPanelTitle(panel.definition.title)
  }, [panel.definition.id, panel.definition.title])

  useEffect(() => {
    void window.workbenchShell.webPanels.getState(panel.definition.id).then((snapshot) => {
      if (snapshot) {
        syncWebPanelState(snapshot)
      }
    })
  }, [panel.definition.id, syncWebPanelState])

  const persistConfig = async (enabled: boolean): Promise<void> => {
    const homeUrlResult = validateWebPanelUrl(state.homeUrl)
    if (!homeUrlResult.ok || !homeUrlResult.url) {
      updatePanelViewState(panel.definition.id, {
        ...state,
        lastError: getWebPanelUrlValidationMessage(homeUrlResult.error, locale)
      })
      return
    }

    const normalizedHomeUrl = homeUrlResult.url
    const normalizedPartition = state.partition.trim() || `persist:${panel.definition.id}`

    updatePanelViewState(panel.definition.id, {
      ...state,
      enabled,
      homeUrl: normalizedHomeUrl,
      partition: normalizedPartition,
      sessionPersisted: normalizedPartition.startsWith('persist:'),
      lastError: enabled ? null : state.lastError
    })

    const snapshot = await window.workbenchShell.webPanels.updateConfig(panel.definition.id, {
      homeUrl: normalizedHomeUrl,
      partition: normalizedPartition,
      enabled
    })

    if (snapshot) {
      syncWebPanelState(snapshot)
    }
  }

  const persistCustomPanelManagement = async (): Promise<void> => {
    if (!isCustomPanel) {
      return
    }

    const settings = await window.workbenchShell.settings.getState()
    if (!settings) {
      return
    }

    const nextTitle = customPanelTitle.trim()
    const homeUrlResult = validateWebPanelUrl(state.homeUrl)
    if (!nextTitle) {
      updatePanelViewState(panel.definition.id, {
        ...state,
        lastError: ui.workspaceProfileNeedsName
      })
      return
    }

    if (!homeUrlResult.ok || !homeUrlResult.url) {
      updatePanelViewState(panel.definition.id, {
        ...state,
        lastError: getWebPanelUrlValidationMessage(homeUrlResult.error, locale)
      })
      return
    }

    const normalizedHomeUrl = homeUrlResult.url
    const normalizedPartition = state.partition.trim() || `persist:${panel.definition.id}`
    const snapshot = await window.workbenchShell.settings.update({
      customWebPanels: settings.customWebPanels.map((item) =>
        item.id === panel.definition.id
          ? {
              ...item,
              title: nextTitle,
              homeUrl: normalizedHomeUrl,
              partition: normalizedPartition,
              enabled: state.enabled
            }
          : item
      )
    })

    if (snapshot) {
      useWorkbenchStore.getState().syncSettingsState(snapshot)
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
      customWebPanels: settings.customWebPanels.filter((item) => item.id !== panel.definition.id)
    })

    if (snapshot) {
      useWorkbenchStore.getState().syncSettingsState(snapshot)
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
          <label className="field field--wide">
            <span>{ui.homeUrl}</span>
            <input
              value={state.homeUrl}
              onChange={(event) =>
                updatePanelViewState(panel.definition.id, {
                  ...state,
                  homeUrl: event.target.value,
                  currentUrl: event.target.value,
                  lastError: null
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
                  partition: event.target.value,
                  lastError: null
                })
              }
            />
          </label>
        </div>

        <div className="action-row">
          {isCustomPanel ? (
            <button type="button" className="action-button action-button--ghost" onClick={() => void persistCustomPanelManagement()}>
              {ui.save}
            </button>
          ) : (
            <button type="button" className="action-button action-button--ghost" onClick={() => void persistConfig(false)}>
              {ui.saveConfig}
            </button>
          )}
          <button type="button" className="action-button" onClick={() => void persistConfig(true)}>
            {ui.enablePanel}
          </button>
          {isCustomPanel ? (
            <button type="button" className="action-button action-button--danger" onClick={() => void removeCustomPanel()}>
              {ui.delete}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="immersive-panel immersive-panel--web">
      <div className="web-panel-stage web-panel-stage--immersive">
        {state.showDetails ? (
          <div className="stage-drawer stage-inspector" aria-label={`${definition.title} ${ui.showDetails}`}>
            <div className="detail-columns detail-columns--wide">
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
              <label className="field field--wide">
                <span>{ui.homeUrl}</span>
                <input
                  value={state.homeUrl}
                  onChange={(event) =>
                    updatePanelViewState(panel.definition.id, {
                      ...state,
                      homeUrl: event.target.value,
                      lastError: null
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
                      partition: event.target.value,
                      lastError: null
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
              <button
                type="button"
                className="action-button action-button--ghost"
                onClick={() => void (isCustomPanel ? persistCustomPanelManagement() : persistConfig(true))}
              >
                {isCustomPanel ? ui.save : ui.saveConfig}
              </button>
              <button
                type="button"
                className="action-button action-button--ghost"
                onClick={() => void persistConfig(false)}
              >
                {ui.disablePanel}
              </button>
              {isCustomPanel ? (
                <button type="button" className="action-button action-button--danger" onClick={() => void removeCustomPanel()}>
                  {ui.delete}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div ref={hostRef} className="web-panel-host" aria-label={`${panel.definition.title} host`} />
      </div>
    </div>
  )
}
