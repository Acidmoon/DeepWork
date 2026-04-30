import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { getUiText, localizePanelDefinition, resolveLocale } from '../i18n'
import { useWorkbenchStore } from '../store'
import { getWorkspaceFolderName } from './workspace-panel-helpers'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'

export function HomePanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const syncWorkspaceState = useWorkbenchStore((state) => state.syncWorkspaceState)
  const workspacePanel = useWorkbenchStore((state) => state.panels.artifacts)
  const state = panel.viewState.kind === 'home' ? panel.viewState : null
  const workspaceState = workspacePanel?.viewState.kind === 'workspace' ? workspacePanel.viewState : null
  const [isChoosingWorkspace, setIsChoosingWorkspace] = useState(false)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const workspaceFolderName = getWorkspaceFolderName(workspaceState?.workspaceRoot ?? '')

  if (!state) {
    return <></>
  }

  const chooseWorkspace = async (): Promise<void> => {
    if (isChoosingWorkspace) {
      return
    }

    setIsChoosingWorkspace(true)
    try {
      const snapshot = await window.workbenchShell.workspace.chooseRoot()
      if (snapshot) {
        syncWorkspaceState(snapshot)
      }
    } finally {
      setIsChoosingWorkspace(false)
    }
  }

  return (
    <div className="panel-layout home-workspace">
      <section className="panel-header">
        <p className="eyebrow">{ui.workspaceLive}</p>
        <h3>{definition.title}</h3>
        <p>{definition.summary}</p>
      </section>

      <div className="stats-row">
        <article className="stat-block">
          <span>{ui.currentWorkspace}</span>
          <strong>{workspaceFolderName || ui.homeWorkspaceNotSelected}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.savedContexts}</span>
          <strong>{workspaceState?.contextEntries.length ?? 0}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.savedItems}</span>
          <strong>{workspaceState?.artifactCount ?? 0}</strong>
        </article>
      </div>

      <section className="panel-section">
        <div className="section-line">
          <strong>{ui.homeWorkspaceTitle}</strong>
          <span>{workspaceState?.initialized ? ui.workspaceInitialized : ui.workspaceInitializationPending}</span>
        </div>
        <p className="section-empty">{ui.homeWorkspaceHint}</p>

        <div className="detail-columns detail-columns--wide">
          <label className="field field--wide">
            <span>{ui.workspaceRoot}</span>
            <input value={workspaceState?.workspaceRoot || ui.homeWorkspaceNotSelected} readOnly />
          </label>
          <div className="action-row action-row--end">
            <button
              type="button"
              className="action-button"
              disabled={isChoosingWorkspace}
              onClick={() => void chooseWorkspace()}
            >
              <FolderOpen size={14} aria-hidden="true" />
              {isChoosingWorkspace ? ui.inProgress : ui.chooseWorkspace}
            </button>
          </div>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-line">
          <strong>{ui.activeThread}</strong>
          <span>{workspaceState?.activeThreadTitle ?? ui.noActiveThread}</span>
        </div>
        <p className="section-empty">{ui.homeWorkspaceContinuityHint}</p>
      </section>

      <div className="plain-list">
        <div className="plain-list__row">
          <span>{ui.workspaceGuideCaptureBody}</span>
        </div>
        <div className="plain-list__row">
          <span>{ui.workspaceGuideIndexBody}</span>
        </div>
        <div className="plain-list__row">
          <span>{ui.workspaceGuideRetrieveBody}</span>
        </div>
      </div>
    </div>
  )
}
