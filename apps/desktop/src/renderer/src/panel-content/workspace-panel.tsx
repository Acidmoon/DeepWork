import { useEffect, useState } from 'react'
import { getUiText, localizePanelDefinition, resolveLocale } from '../i18n'
import { asWorkspaceViewState, useWorkbenchStore } from '../store'
import {
  buildSessionSearchText,
  buildSessionSummary,
  extractLogExcerpt,
  formatArtifactMeta,
  formatArtifactSummary,
  formatArtifactTitle,
  formatContextEntryDescription,
  formatContextEntryLabel,
  formatMessageRole,
  formatTimestamp,
  matchesWorkspaceArtifactQuery,
  matchesWorkspaceBucket,
  normalizeMessageRole,
  normalizeWorkspaceSearchQuery,
  parseMessageArtifact,
  supportsTextArtifactPreview
} from './workspace-panel-helpers'
import { getWorkspaceFolderName } from './workspace-path'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'
import { getArtifactScopeId } from '@ai-workbench/core/desktop/workspace'
import type {
  WorkspaceMaintenanceFindingKind,
  WorkspaceMaintenanceReport
} from '@ai-workbench/core/desktop/workspace'

function formatMaintenanceFindingKind(
  kind: WorkspaceMaintenanceFindingKind,
  ui: ReturnType<typeof getUiText>
): string {
  switch (kind) {
    case 'uninitialized_workspace':
      return ui.maintenanceFindingUninitialized
    case 'missing_artifact_file':
      return ui.maintenanceFindingMissingFile
    case 'orphaned_manifest_record':
      return ui.maintenanceFindingOrphanedRecord
    case 'stale_derived_index':
      return ui.maintenanceFindingStaleIndex
    case 'duplicate_artifact_id':
      return ui.maintenanceFindingDuplicateId
    case 'unsafe_artifact_path':
      return ui.maintenanceFindingUnsafePath
  }
}

export function WorkspacePanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const syncWorkspaceState = useWorkbenchStore((state) => state.syncWorkspaceState)
  const state = asWorkspaceViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const [sessionMessages, setSessionMessages] = useState<Array<{ id: string; role: string; text: string }>>([])
  const [sessionLogExcerpt, setSessionLogExcerpt] = useState<string>('')
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable' | 'unsupported'>('idle')
  const [previewContent, setPreviewContent] = useState('')
  const [scopeThreadTargetId, setScopeThreadTargetId] = useState('')
  const [threadCreateDraft, setThreadCreateDraft] = useState('')
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editingThreadTitle, setEditingThreadTitle] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [threadActionFeedback, setThreadActionFeedback] = useState<string | null>(null)
  const [deleteScopeArmedId, setDeleteScopeArmedId] = useState<string | null>(null)
  const [maintenanceReport, setMaintenanceReport] = useState<WorkspaceMaintenanceReport | null>(null)
  const [maintenancePending, setMaintenancePending] = useState<'scan' | 'rebuild' | 'repair' | null>(null)
  const [maintenanceRepairArmed, setMaintenanceRepairArmed] = useState(false)

  useEffect(() => {
    void window.workbenchShell.workspace.getState().then((snapshot) => {
      if (snapshot) {
        syncWorkspaceState(snapshot)
      }
    })
  }, [syncWorkspaceState])

  const normalizedQuery = normalizeWorkspaceSearchQuery(state.searchQuery)
  const isLogsPanel = panel.definition.id === 'logs'
  const effectiveSelectedBucket = isLogsPanel
    ? 'logs/'
    : state.selectedBucket === 'logs/'
      ? 'artifacts/'
      : state.selectedBucket
  const isLogInspection = effectiveSelectedBucket === 'logs/'
  const activeThread = state.threads.find((thread) => thread.threadId === state.activeThreadId) ?? null
  const visibleThreadId = state.threadFilterMode === 'active' ? state.activeThreadId : null
  const visibleContextEntries = visibleThreadId
    ? state.contextEntries.filter((entry) => entry.threadId === visibleThreadId)
    : state.contextEntries
  const effectiveSelectedOrigin =
    state.selectedOrigin === 'all' || visibleContextEntries.some((entry) => entry.scopeId === state.selectedOrigin)
      ? state.selectedOrigin
      : 'all'
  const scopeThreadMap = new Map(state.contextEntries.map((entry) => [entry.scopeId, entry.threadId] as const))
  const sessionSummaries = visibleContextEntries.map((entry) => {
    const bucketArtifacts = state.artifacts
      .filter((artifact) => getArtifactScopeId(artifact) === entry.scopeId)
      .filter((artifact) => matchesWorkspaceBucket(artifact, effectiveSelectedBucket))
    const searchableSession = buildSessionSearchText(entry)

    return {
      ...buildSessionSummary(entry, locale),
      matchesQuery:
        !normalizedQuery ||
        searchableSession.includes(normalizedQuery) ||
        bucketArtifacts.some((artifact) => matchesWorkspaceArtifactQuery(artifact, normalizedQuery)),
      availableArtifactCount: bucketArtifacts.length
    }
  })
  const filteredSessionSummaries = sessionSummaries.filter((session) => session.availableArtifactCount > 0 && session.matchesQuery)
  const filteredArtifacts = state.artifacts.filter((artifact) => {
    const scopeId = getArtifactScopeId(artifact)
    const matchesThread = !visibleThreadId || scopeThreadMap.get(scopeId) === visibleThreadId
    const matchesOrigin = effectiveSelectedOrigin === 'all' || scopeId === effectiveSelectedOrigin
    const matchesBucket = matchesWorkspaceBucket(artifact, effectiveSelectedBucket)
    const matchesQuery = !normalizedQuery || matchesWorkspaceArtifactQuery(artifact, normalizedQuery)

    return matchesThread && matchesOrigin && matchesBucket && matchesQuery
  })
  const selectedPreviewArtifact = state.previewArtifactId
    ? state.artifacts.find((artifact) => artifact.id === state.previewArtifactId) ?? null
    : null
  const selectedScope = effectiveSelectedOrigin === 'all'
    ? null
    : visibleContextEntries.find((entry) => entry.scopeId === effectiveSelectedOrigin) ?? null
  const workspaceFolderName = getWorkspaceFolderName(state.workspaceRoot)
  const threadScopeLabel = state.threadFilterMode === 'active' ? activeThread?.title ?? ui.noActiveThread : ui.threadShowAll
  const sourceScopeLabel = selectedScope ? formatContextEntryLabel(selectedScope, locale) : ui.allSources
  const searchScopeLabel = normalizedQuery ? state.searchQuery.trim() : ui.inspectionFilterNone
  const inspectionModeLabel = isLogsPanel
    ? ui.bucketLogs
    : effectiveSelectedBucket === 'outputs/'
      ? ui.bucketOutputs
      : ui.bucketArtifacts
  const emptyWorkspaceMessage = isLogInspection ? ui.logsEmptyHint : ui.workspaceEmptyHint
  const noFilteredArtifactsMessage = isLogInspection ? ui.noLogsForFilter : ui.noArtifactsForFilter
  const inspectionHint = isLogInspection ? ui.logInspectionHint : ui.findContextHint
  const inspectionHeadline = isLogsPanel ? ui.logInspectionHint : ui.workspaceSecondaryHint
  const inspectionFlowHint = isLogsPanel ? ui.logsInspectionFlowHint : ui.workspaceInspectionFlowHint
  const sourceListTitle = isLogInspection ? ui.logSources : ui.sessionList
  const artifactListTitle = isLogInspection
    ? ui.logRecords
    : selectedScope
      ? ui.currentSessionContent
      : ui.recentArtifacts
  const previewTitle = isLogInspection ? ui.logPreview : ui.artifactPreview
  const previewHint = isLogInspection ? ui.logPreviewHint : ui.artifactPreviewHint
  const selectedScopeArtifacts = selectedScope
    ? state.artifacts.filter((artifact) => getArtifactScopeId(artifact) === selectedScope.scopeId)
    : []
  const selectedScopeSummary = selectedScope ? buildSessionSummary(selectedScope, locale) : null
  const selectedScopeArtifactKey = selectedScopeArtifacts.map((artifact) => artifact.id).join('|')
  const selectedArtifacts = filteredArtifacts.filter((artifact) => state.selectedArtifactIds.includes(artifact.id))
  const selectedArtifactsCount = selectedArtifacts.length
  const currentBucketCount = state.bucketCounts[effectiveSelectedBucket] ?? 0

  const updateWorkspaceViewState = (
    nextState: typeof state | ((currentState: typeof state) => typeof state)
  ): void => {
    const resolvedState = typeof nextState === 'function' ? nextState(state) : nextState
    useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, resolvedState)
  }

  const toggleSessionSelection = (scopeId: string): void => {
    updateWorkspaceViewState((currentState) => ({
      ...currentState,
      selectedOrigin: currentState.selectedOrigin === scopeId ? 'all' : scopeId
    }))
  }

  const toggleArtifactSelection = (artifactId: string): void => {
    updateWorkspaceViewState({
      ...state,
      selectedArtifactIds: state.selectedArtifactIds.includes(artifactId)
        ? state.selectedArtifactIds.filter((id) => id !== artifactId)
        : [...state.selectedArtifactIds, artifactId]
    })
  }

  const setPreviewArtifact = (artifactId: string | null): void => {
    updateWorkspaceViewState({
      ...state,
      previewArtifactId: artifactId
    })
  }

  useEffect(() => {
    if (!selectedScope) {
      setScopeThreadTargetId('')
      return
    }

    setScopeThreadTargetId(selectedScope.threadId)
  }, [selectedScope?.scopeId, selectedScope?.threadId])

  useEffect(() => {
    if (editingThreadId && !state.threads.some((thread) => thread.threadId === editingThreadId)) {
      setEditingThreadId(null)
      setEditingThreadTitle('')
    }
  }, [editingThreadId, state.threads])

  useEffect(() => {
    if (deleteScopeArmedId && deleteScopeArmedId !== selectedScope?.scopeId) {
      setDeleteScopeArmedId(null)
    }
  }, [deleteScopeArmedId, selectedScope?.scopeId])

  const syncSnapshot = (snapshot: Awaited<ReturnType<typeof window.workbenchShell.workspace.selectThread>>): void => {
    if (snapshot) {
      syncWorkspaceState(snapshot)
    }
  }

  const beginThreadMutation = (actionKey: string): void => {
    setPendingAction(actionKey)
    setThreadActionFeedback(null)
  }

  const finishThreadMutation = (message?: string): void => {
    setPendingAction(null)
    if (message) {
      setThreadActionFeedback(message)
    }
  }

  const createThread = async (): Promise<void> => {
    beginThreadMutation('create-thread')
    updateWorkspaceViewState((currentState) => ({
      ...currentState,
      threadFilterMode: 'active'
    }))
    syncSnapshot(await window.workbenchShell.workspace.createThread(threadCreateDraft.trim() || null))
    setThreadCreateDraft('')
    setDeleteScopeArmedId(null)
    finishThreadMutation(ui.threadCreateSaved)
  }

  const continueThread = async (threadId: string): Promise<void> => {
    setThreadActionFeedback(null)
    updateWorkspaceViewState((currentState) => ({
      ...currentState,
      threadFilterMode: 'active'
    }))
    syncSnapshot(await window.workbenchShell.workspace.selectThread(threadId))
  }

  const startRenameThread = (threadId: string, title: string): void => {
    setEditingThreadId(threadId)
    setEditingThreadTitle(title)
    setThreadActionFeedback(null)
  }

  const cancelRenameThread = (): void => {
    setEditingThreadId(null)
    setEditingThreadTitle('')
    setPendingAction(null)
  }

  const saveThreadTitle = async (threadId: string, currentTitle: string): Promise<void> => {
    const nextTitle = editingThreadTitle.trim()
    if (!nextTitle || nextTitle === currentTitle) {
      cancelRenameThread()
      return
    }

    beginThreadMutation(`rename-thread:${threadId}`)
    syncSnapshot(await window.workbenchShell.workspace.renameThread(threadId, nextTitle))
    setEditingThreadId(null)
    setEditingThreadTitle('')
    finishThreadMutation(ui.threadRenameSaved)
  }

  const reassignSelectedScope = async (): Promise<void> => {
    if (!selectedScope || !scopeThreadTargetId || scopeThreadTargetId === selectedScope.threadId) {
      return
    }

    beginThreadMutation('reassign-scope')
    syncSnapshot(await window.workbenchShell.workspace.reassignScopeThread(selectedScope.scopeId, scopeThreadTargetId))
    setDeleteScopeArmedId(null)
    finishThreadMutation(ui.threadReassignSaved)
  }

  const deleteSelectedScope = async (): Promise<void> => {
    if (!selectedScope) {
      return
    }

    beginThreadMutation('delete-scope')
    const snapshot = await window.workbenchShell.workspace.deleteScope(selectedScope.scopeId)
    if (snapshot) {
      syncWorkspaceState(snapshot)
    }
    setDeleteScopeArmedId(null)
    finishThreadMutation(ui.deleteSessionDone)
  }

  const runMaintenance = async (mode: 'scan' | 'rebuild' | 'repair'): Promise<void> => {
    setMaintenancePending(mode)
    try {
      const report =
        mode === 'scan'
          ? await window.workbenchShell.workspace.maintenanceScan()
          : mode === 'rebuild'
            ? await window.workbenchShell.workspace.maintenanceRebuild()
            : await window.workbenchShell.workspace.maintenanceRepair()
      if (report) {
        setMaintenanceReport(report)
      }
      if (mode !== 'scan') {
        const snapshot = await window.workbenchShell.workspace.getState()
        if (snapshot) {
          syncWorkspaceState(snapshot)
        }
      }
    } finally {
      setMaintenancePending(null)
      setMaintenanceRepairArmed(false)
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

  const renderSelectedScopeSummary = (className = 'workspace-session-summary'): JSX.Element | null => {
    if (!selectedScopeSummary) {
      return null
    }

    return (
      <div className={className}>
        <div className="workspace-session-summary__header">
          <strong>{selectedScopeSummary.title}</strong>
          <span>{formatContextEntryLabel(selectedScopeSummary, locale)}</span>
        </div>
        <p>{selectedScopeSummary.preview}</p>
        <div className="session-badges">
          {selectedScopeSummary.badges.map((badge) => (
            <span key={`${selectedScopeSummary.scopeId}-${badge}`} className="session-badge">
              {badge}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderArtifactRows = (): JSX.Element => {
    if (filteredArtifacts.length === 0) {
      return <p className="section-empty">{noFilteredArtifactsMessage}</p>
    }

    return (
      <div className="artifact-list artifact-list--stacked">
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
    )
  }

  const renderPreviewSurface = (): JSX.Element => {
    if (!selectedPreviewArtifact) {
      return <p className="section-empty">{previewHint}</p>
    }

    return (
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
    )
  }

  return (
    <div
      className="panel-layout workspace-inspector"
      data-inspection-mode={isLogsPanel ? 'logs' : 'workspace'}
      data-thread-scope={state.threadFilterMode}
      data-selected-origin={effectiveSelectedOrigin}
      data-search-active={normalizedQuery ? 'true' : 'false'}
    >
      <section className="panel-section workspace-inspector-header" data-pane="header">
        <div className="workspace-inspector-header__hero">
          <div>
            <p className="eyebrow">{ui.workspaceSecondaryRole}</p>
            <h3>{definition.title}</h3>
          </div>
          <p>{inspectionHeadline}</p>
          <p className="section-empty">{inspectionFlowHint}</p>
        </div>

        <div className="workspace-inspector-toolbar">
          <div className="workspace-inspector-toolbar__controls">
            {!isLogsPanel ? (
              <label className="field">
                <span>{ui.contextType}</span>
                <select
                  value={effectiveSelectedBucket}
                  onChange={(event) =>
                    updateWorkspaceViewState({
                      ...state,
                      selectedBucket: event.target.value
                    })
                  }
                >
                  <option value="artifacts/">{ui.bucketArtifacts}</option>
                  <option value="outputs/">{ui.bucketOutputs}</option>
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>{ui.workspaceSearch}</span>
              <input
                value={state.searchQuery}
                placeholder={ui.workspaceSearchPlaceholder}
                onChange={(event) =>
                  updateWorkspaceViewState({
                    ...state,
                    searchQuery: event.target.value
                  })
                }
              />
            </label>
            <div className="action-row action-row--end">
              <button
                type="button"
                className="action-button action-button--ghost"
                onClick={() =>
                  updateWorkspaceViewState({
                    ...state,
                    threadFilterMode: state.threadFilterMode === 'active' ? 'all' : 'active'
                  })
                }
              >
                {state.threadFilterMode === 'active' ? ui.threadShowAll : ui.activeThread}
              </button>
            </div>
          </div>

          <div className="session-badges workspace-filter-badges">
            <span className="session-badge">
              {ui.currentWorkspace}: {workspaceFolderName || ui.workspaceInitializationPending}
            </span>
            <span className="session-badge">
              {ui.contextType}: {inspectionModeLabel}
            </span>
            <span className="session-badge">
              {ui.filterThreadScope}: {threadScopeLabel}
            </span>
            <span className="session-badge">
              {ui.filterSourceScope}: {sourceScopeLabel}
            </span>
            <span className="session-badge">
              {ui.workspaceSearch}: {searchScopeLabel}
            </span>
          </div>
        </div>

        <div className="stats-row">
          <article className="stat-block">
            <span>{ui.savedContexts}</span>
            <strong>{state.contextEntries.length}</strong>
          </article>
          <article className="stat-block">
            <span>{ui.savedItems}</span>
            <strong>{state.artifactCount}</strong>
          </article>
          <article className="stat-block">
            <span>{inspectionModeLabel}</span>
            <strong>{currentBucketCount}</strong>
          </article>
        </div>
      </section>

      {!state.initialized || state.lastError ? (
        <div className="panel-section">
          <div className="detail-list">
            {!state.initialized ? <strong>{ui.workspaceInitializationPending}</strong> : null}
            {state.lastError ? (
              <div className="detail-list__item">
                <span>{ui.error}</span>
                <strong>{state.lastError}</strong>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {isLogsPanel ? (
        <div className="workspace-inspector-main workspace-inspector-main--logs">
          <section className="panel-section" data-pane="sources">
            <div className="section-line">
              <strong>{sourceListTitle}</strong>
              <span>{filteredSessionSummaries.length} {ui.searchResultsCount}</span>
            </div>
            {state.contextEntries.length === 0 ? (
              <p className="section-empty">{emptyWorkspaceMessage}</p>
            ) : filteredSessionSummaries.length === 0 ? (
              <p className="section-empty">{noFilteredArtifactsMessage}</p>
            ) : (
              <div className="artifact-list artifact-list--stacked">
                {filteredSessionSummaries.map((session) => (
                  <button
                    key={session.scopeId}
                    type="button"
                    aria-pressed={state.selectedOrigin === session.scopeId}
                    className={`artifact-row artifact-row--button artifact-row--session${state.selectedOrigin === session.scopeId ? ' artifact-row--active' : ''}`}
                    onClick={() => toggleSessionSelection(session.scopeId)}
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
                      <span>{formatContextEntryLabel(session, locale)}</span>
                      <small>{session.latestUpdatedAt ? formatTimestamp(session.latestUpdatedAt, locale) : '-'}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel-section" data-pane="records">
            <div className="section-line">
              <strong>{ui.logRecords}</strong>
              <span>{filteredArtifacts.length} {ui.searchResultsCount}</span>
            </div>
            {selectedScopeSummary ? (
              renderSelectedScopeSummary('workspace-session-summary workspace-session-summary--inline')
            ) : (
              <p className="section-empty">{ui.logsSourceHint}</p>
            )}
            {selectedArtifactsCount > 0 ? (
              <div className="session-badges workspace-selection-badges">
                <span className="session-badge">
                  {selectedArtifactsCount} {ui.selectedCount}
                </span>
              </div>
            ) : null}
            {renderArtifactRows()}
          </section>

          <section className="panel-section" data-pane="preview">
            <div className="section-line">
              <strong>{ui.logPreview}</strong>
              <span>{selectedPreviewArtifact?.id ?? ui.artifactPreviewEmpty}</span>
            </div>
            {renderPreviewSurface()}
          </section>
        </div>
      ) : (
        <div className="workspace-inspector-main workspace-inspector-main--workspace">
          <section className="panel-section" data-pane="sources">
            <div className="section-line">
              <strong>{sourceListTitle}</strong>
              <span>{filteredSessionSummaries.length} {ui.searchResultsCount}</span>
            </div>
            {state.contextEntries.length === 0 ? (
              <p className="section-empty">{emptyWorkspaceMessage}</p>
            ) : filteredSessionSummaries.length === 0 ? (
              <p className="section-empty">{noFilteredArtifactsMessage}</p>
            ) : (
              <div className="artifact-list artifact-list--stacked">
                {filteredSessionSummaries.map((session) => (
                  <button
                    key={session.scopeId}
                    type="button"
                    aria-pressed={state.selectedOrigin === session.scopeId}
                    className={`artifact-row artifact-row--button artifact-row--session${state.selectedOrigin === session.scopeId ? ' artifact-row--active' : ''}`}
                    onClick={() => toggleSessionSelection(session.scopeId)}
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
                      <span>{formatContextEntryLabel(session, locale)}</span>
                      <small>{session.latestUpdatedAt ? formatTimestamp(session.latestUpdatedAt, locale) : '-'}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel-section" data-pane="detail">
            <div className="section-line">
              <strong>{ui.currentSelectionSummary}</strong>
              <span>{selectedScopeSummary?.title ?? ui.sessionPreviewEmpty}</span>
            </div>
            {!selectedScope ? (
              <p className="section-empty">{ui.sourceDetailHint}</p>
            ) : (
              <div className="workspace-pane__stack">
                {renderSelectedScopeSummary()}

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

                {sessionMessages.length > 0 ? (
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
            )}
          </section>

          <section className="panel-section" data-pane="records">
            <div className="section-line">
              <strong>{artifactListTitle}</strong>
              <span>{filteredArtifacts.length} {ui.searchResultsCount}</span>
            </div>
            {selectedArtifactsCount > 0 ? (
              <div className="session-badges workspace-selection-badges">
                <span className="session-badge">
                  {selectedArtifactsCount} {ui.selectedCount}
                </span>
              </div>
            ) : null}
            {renderArtifactRows()}

            <div className="workspace-pane__stack" data-pane="preview">
              <div className="section-line">
                <strong>{previewTitle}</strong>
                <span>{selectedPreviewArtifact?.id ?? ui.artifactPreviewEmpty}</span>
              </div>
              {renderPreviewSurface()}
            </div>
          </section>
        </div>
      )}

      <div className="workspace-inspector-support">
      <details className="workspace-advanced">
        <summary>{ui.workspaceManageContinuity}</summary>

        <div className="workspace-advanced__body">
          <p className="section-empty">{ui.workspaceManageContinuityHint}</p>

          <form
            className="workspace-thread-composer"
            onSubmit={(event) => {
              event.preventDefault()
              void createThread()
            }}
          >
            <label className="field field--wide">
              <span>{ui.threadCreateTitle}</span>
              <input
                aria-label={ui.threadCreateTitle}
                value={threadCreateDraft}
                placeholder={ui.threadCreatePlaceholder}
                onChange={(event) => setThreadCreateDraft(event.target.value)}
              />
            </label>
            <button type="submit" className="action-button" disabled={pendingAction === 'create-thread'}>
              {ui.threadCreate}
            </button>
          </form>

          {threadActionFeedback ? <p className="thread-feedback">{threadActionFeedback}</p> : null}

          {state.threads.length === 0 ? (
            <p className="section-empty">{ui.threadEmptyHint}</p>
          ) : (
            <div className="artifact-list">
              {state.threads.map((thread) => (
                <article
                  key={thread.threadId}
                  className={`artifact-row artifact-row--thread${state.activeThreadId === thread.threadId ? ' artifact-row--active' : ''}`}
                >
                  <div className="artifact-row__body">
                    {editingThreadId === thread.threadId ? (
                      <form
                        className="workspace-thread-inline-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          void saveThreadTitle(thread.threadId, thread.title)
                        }}
                      >
                        <label className="field field--wide">
                          <span>{ui.threadTitle}</span>
                          <input
                            aria-label={ui.threadTitle}
                            value={editingThreadTitle}
                            placeholder={ui.threadTitlePlaceholder}
                            onChange={(event) => setEditingThreadTitle(event.target.value)}
                          />
                        </label>
                        <div className="artifact-row__actions artifact-row__actions--inline">
                          <button
                            type="submit"
                            className="action-button action-button--compact"
                            disabled={
                              pendingAction === `rename-thread:${thread.threadId}` ||
                              !editingThreadTitle.trim() ||
                              editingThreadTitle.trim() === thread.title
                            }
                          >
                            {ui.save}
                          </button>
                          <button
                            type="button"
                            className="action-button action-button--ghost action-button--compact"
                            onClick={cancelRenameThread}
                          >
                            {ui.cancel}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <strong>{thread.title}</strong>
                    )}
                    <p>{thread.summary || thread.threadId}</p>
                    <div className="session-badges">
                      <span className="session-badge">{thread.scopeCount} {ui.threadScopeCount}</span>
                      <span className="session-badge">{thread.artifactCount} {ui.threadArtifactCount}</span>
                      <span className="session-badge">{thread.derived ? ui.threadDerived : ui.threadExplicit}</span>
                    </div>
                  </div>
                  <div className="artifact-row__meta">
                    <span>{thread.threadId}</span>
                    <small>{thread.latestUpdatedAt ? formatTimestamp(thread.latestUpdatedAt, locale) : '-'}</small>
                  </div>
                  <div className="artifact-row__actions">
                    <button
                      type="button"
                      className="action-button action-button--ghost action-button--compact"
                      disabled={state.activeThreadId === thread.threadId}
                      onClick={() => void continueThread(thread.threadId)}
                    >
                      {ui.threadContinue}
                    </button>
                    <button
                      type="button"
                      className="action-button action-button--ghost action-button--compact"
                      disabled={editingThreadId === thread.threadId}
                      onClick={() => startRenameThread(thread.threadId, thread.title)}
                    >
                      {ui.rename}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {selectedScope ? (
            <div className="workspace-inline-note">
              <div className="workspace-inline-note__copy">
                <span>{formatContextEntryDescription(selectedScope, locale)}</span>
                {deleteScopeArmedId === selectedScope.scopeId ? (
                  <p className="workspace-inline-note__warning">{ui.deleteSessionWarning}</p>
                ) : null}
              </div>
              <div className="workspace-inline-note__actions">
                <label className="field field--compact">
                  <span>{ui.targetThread}</span>
                  <select value={scopeThreadTargetId} onChange={(event) => setScopeThreadTargetId(event.target.value)}>
                    {state.threads.map((thread) => (
                      <option key={thread.threadId} value={thread.threadId}>
                        {thread.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="action-button action-button--ghost"
                  disabled={!scopeThreadTargetId || scopeThreadTargetId === selectedScope.threadId}
                  onClick={() => void reassignSelectedScope()}
                >
                  {ui.reassignScopeThread}
                </button>
                {deleteScopeArmedId === selectedScope.scopeId ? (
                  <>
                    <button
                      type="button"
                      className="action-button action-button--danger"
                      disabled={pendingAction === 'delete-scope'}
                      onClick={() => void deleteSelectedScope()}
                    >
                      {ui.confirmDelete}
                    </button>
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      onClick={() => setDeleteScopeArmedId(null)}
                    >
                      {ui.cancel}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="action-button action-button--ghost action-button--danger"
                    onClick={() => {
                      setDeleteScopeArmedId(selectedScope.scopeId)
                      setThreadActionFeedback(null)
                    }}
                  >
                    {ui.deleteSession}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="section-empty">{inspectionHint}</p>
          )}
        </div>
      </details>

      <details className="workspace-advanced">
        <summary>{ui.workspaceMaintenance}</summary>

        <div className="workspace-advanced__body">
          <p className="section-empty">
            {state.workspaceRoot ? ui.workspaceMaintenanceHint : ui.workspaceMaintenanceUnavailable}
          </p>

          <div className="action-row">
            <button
              type="button"
              className="action-button action-button--ghost"
              disabled={!state.workspaceRoot || maintenancePending !== null}
              onClick={() => void runMaintenance('scan')}
            >
              {ui.maintenanceScan}
            </button>
            <button
              type="button"
              className="action-button action-button--ghost"
              disabled={!state.workspaceRoot || maintenancePending !== null}
              onClick={() => void runMaintenance('rebuild')}
            >
              {ui.maintenanceRebuild}
            </button>
            {maintenanceRepairArmed ? (
              <>
                <button
                  type="button"
                  className="action-button action-button--danger"
                  disabled={!state.workspaceRoot || maintenancePending !== null}
                  onClick={() => void runMaintenance('repair')}
                >
                  {ui.maintenanceRepair}
                </button>
                <button
                  type="button"
                  className="action-button action-button--ghost"
                  disabled={maintenancePending !== null}
                  onClick={() => setMaintenanceRepairArmed(false)}
                >
                  {ui.cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="action-button action-button--ghost action-button--danger"
                disabled={!state.workspaceRoot || maintenancePending !== null}
                onClick={() => setMaintenanceRepairArmed(true)}
              >
                {ui.maintenanceRepairArm}
              </button>
            )}
          </div>

          {maintenanceReport ? (
            <>
              <div className="stats-row">
                <article className="stat-block">
                  <span>{ui.maintenanceFindings}</span>
                  <strong>{maintenanceReport.summary.findingCount}</strong>
                </article>
                <article className="stat-block">
                  <span>{ui.maintenanceRepairable}</span>
                  <strong>{maintenanceReport.summary.repairableCount}</strong>
                </article>
                <article className="stat-block">
                  <span>{ui.maintenanceChangedFiles}</span>
                  <strong>{maintenanceReport.summary.changedFileCount}</strong>
                </article>
              </div>

              <div className="panel-section">
                <div className="section-line">
                  <strong>{ui.maintenanceFindings}</strong>
                  <span>{maintenanceReport.mode}</span>
                </div>
                {maintenanceReport.findings.length === 0 ? (
                  <p className="section-empty">{ui.maintenanceNoFindings}</p>
                ) : (
                  <div className="detail-list">
                    {maintenanceReport.findings.map((finding) => (
                      <div key={finding.id} className="detail-list__item">
                        <span>{formatMaintenanceFindingKind(finding.kind, ui)}</span>
                        <strong>{finding.message}</strong>
                        <small>{finding.repairable ? ui.maintenanceRepairable : ui.maintenanceFollowUp}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {maintenanceReport.actions.length > 0 ? (
                <div className="panel-section">
                  <div className="section-line">
                    <strong>{ui.maintenanceActions}</strong>
                    <span>{maintenanceReport.actions.length}</span>
                  </div>
                  <div className="detail-list">
                    {maintenanceReport.actions.map((action) => (
                      <div key={action.id} className="detail-list__item">
                        <span>{action.status}</span>
                        <strong>{action.message}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="section-empty">{ui.maintenanceNoReport}</p>
          )}
        </div>
      </details>

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
                  updateWorkspaceViewState({
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

          {selectedArtifactsCount > 0 ? (
            <div className="panel-section">
              <div className="section-line">
                <strong>{ui.artifactSelection}</strong>
                <span>{selectedArtifactsCount} {ui.selectedCount}</span>
              </div>
              <div className="detail-list">
                {selectedArtifacts.map((artifact) => (
                  <div key={`selected-${artifact.id}`} className="detail-list__item">
                    <span>{formatArtifactTitle(artifact, locale)}</span>
                    <strong>{artifact.id}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="panel-section">
            <div className="section-line">
              <strong>{ui.cliSelfSearch}</strong>
              <span>PowerShell</span>
            </div>
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
              <div className="detail-list__item">
                <span>`aw-threads`</span>
                <strong>{ui.cliCommandThreads}</strong>
              </div>
              <div className="detail-list__item">
                <span>`aw-thread &lt;threadId&gt;`</span>
                <strong>{ui.cliCommandThread}</strong>
              </div>
              <div className="detail-list__item">
                <span>`aw-maintenance-scan -Json`</span>
                <strong>{ui.cliCommandMaintenanceScan}</strong>
              </div>
              <div className="detail-list__item">
                <span>`aw-maintenance-rebuild`</span>
                <strong>{ui.cliCommandMaintenanceRebuild}</strong>
              </div>
            </div>
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
                <span>{ui.threadIndex}</span>
                <input value={state.threadIndexPath || ui.workspaceInitializationPending} readOnly />
              </label>
            </div>
            <div className="detail-columns">
              <label className="field">
                <span>{ui.threadManifests}</span>
                <input value={state.threadManifestsPath || ui.workspaceInitializationPending} readOnly />
              </label>
              <label className="field">
                <span>{ui.rules}</span>
                <input value={state.rulesPath || ui.rulesPathPending} readOnly />
              </label>
            </div>
          </div>
        </div>
      </details>
      </div>
    </div>
  )
}
