import { getUiText, resolveLocale } from '../i18n'
import { useWorkbenchStore } from '../store'
import type { WorkspacePanelViewState } from '@ai-workbench/core/desktop/panels'

interface ManagedSessionBarProps {
  locale: ReturnType<typeof resolveLocale>
  contextLabel: string | null
  sessionScopeId: string | null
  threadId: string | null
  threadTitle: string | null
  defaultBucket: WorkspacePanelViewState['selectedBucket']
}

export function ManagedSessionBar({
  locale,
  contextLabel,
  sessionScopeId,
  threadId,
  threadTitle,
  defaultBucket
}: ManagedSessionBarProps): JSX.Element {
  const ui = getUiText(locale)
  const openPanel = useWorkbenchStore((state) => state.openPanel)
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const workspaceState = useWorkbenchStore((state) => {
    const workspacePanel = state.panels.artifacts
    return workspacePanel?.viewState.kind === 'workspace' ? workspacePanel.viewState : null
  })
  const linkedScope = sessionScopeId
    ? workspaceState?.contextEntries.find((entry) => entry.scopeId === sessionScopeId) ?? null
    : null
  const canOpenInWorkspace = Boolean(sessionScopeId && linkedScope)
  const threadLabel = threadTitle?.trim() || threadId?.trim() || ui.sessionThreadPending

  const openInWorkspace = (): void => {
    if (!sessionScopeId || !workspaceState || !linkedScope) {
      return
    }

    const workspacePanel = useWorkbenchStore.getState().panels.artifacts
    if (!workspacePanel || workspacePanel.viewState.kind !== 'workspace') {
      return
    }

    updatePanelViewState('artifacts', {
      ...workspacePanel.viewState,
      selectedBucket: defaultBucket,
      selectedOrigin: sessionScopeId,
      threadFilterMode:
        linkedScope.threadId !== workspaceState.activeThreadId ? 'all' : workspacePanel.viewState.threadFilterMode,
      searchQuery: '',
      previewArtifactId: null,
      selectedArtifactIds: []
    })
    openPanel('artifacts')
  }

  return (
    <div className="immersive-panel__bar">
      <div className="immersive-panel__identity">
        <span>{ui.currentSessionThread}</span>
        <strong>{threadLabel}</strong>
        <small>{threadId?.trim() || ui.sessionThreadPending}</small>
        <div className="session-badges">
          <span className="session-badge">
            {ui.contextLabel}: {contextLabel?.trim() || ui.sessionContextPending}
          </span>
          <span className="session-badge">
            {ui.sessionScope}: {sessionScopeId?.trim() || ui.sessionScopePending}
          </span>
        </div>
      </div>
      <div className="immersive-panel__controls">
        <button
          type="button"
          className="action-button action-button--ghost"
          disabled={!canOpenInWorkspace}
          onClick={openInWorkspace}
        >
          {ui.openInWorkspace}
        </button>
      </div>
    </div>
  )
}
