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
  getWorkspaceFolderName,
  matchesWorkspaceArtifactQuery,
  matchesWorkspaceBucket,
  normalizeMessageRole,
  normalizeWorkspaceSearchQuery,
  parseMessageArtifact,
  supportsTextArtifactPreview
} from './workspace-panel-helpers'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'
import { getArtifactScopeId } from '@ai-workbench/core/desktop/workspace'

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
  const [threadFilterMode, setThreadFilterMode] = useState<'active' | 'all'>('active')
  const [scopeThreadTargetId, setScopeThreadTargetId] = useState('')

  useEffect(() => {
    void window.workbenchShell.workspace.getState().then((snapshot) => {
      if (snapshot) {
        syncWorkspaceState(snapshot)
      }
    })
  }, [syncWorkspaceState])

  const normalizedQuery = normalizeWorkspaceSearchQuery(state.searchQuery)
  const activeThread = state.threads.find((thread) => thread.threadId === state.activeThreadId) ?? null
  const visibleThreadId = threadFilterMode === 'active' ? state.activeThreadId : null
  const visibleContextEntries = visibleThreadId
    ? state.contextEntries.filter((entry) => entry.threadId === visibleThreadId)
    : state.contextEntries
  const effectiveSelectedOrigin =
    state.selectedOrigin === 'all' || visibleContextEntries.some((entry) => entry.scopeId === state.selectedOrigin)
      ? state.selectedOrigin
      : 'all'
  const scopeThreadMap = new Map(state.contextEntries.map((entry) => [entry.scopeId, entry.threadId] as const))
  const sessionSummaries = visibleContextEntries.map((entry) => {
    const scopedArtifacts = state.artifacts.filter((artifact) => getArtifactScopeId(artifact) === entry.scopeId)
    const bucketArtifacts = scopedArtifacts.filter((artifact) => matchesWorkspaceBucket(artifact, state.selectedBucket))
    const matchingArtifacts = normalizedQuery
      ? bucketArtifacts.filter((artifact) => matchesWorkspaceArtifactQuery(artifact, normalizedQuery))
      : bucketArtifacts
    const searchableSession = buildSessionSearchText(entry, scopedArtifacts)

    return {
      ...buildSessionSummary(entry, state.artifacts, locale),
      matchesOrigin: effectiveSelectedOrigin === 'all' || entry.scopeId === effectiveSelectedOrigin,
      matchesQuery: !normalizedQuery || searchableSession.includes(normalizedQuery) || matchingArtifacts.length > 0,
      availableArtifactCount: bucketArtifacts.length
    }
  })
  const filteredSessionSummaries = sessionSummaries.filter(
    (session) => session.matchesOrigin && session.availableArtifactCount > 0 && session.matchesQuery
  )
  const filteredArtifacts = state.artifacts.filter((artifact) => {
    const scopeId = getArtifactScopeId(artifact)
    const matchesThread = !visibleThreadId || scopeThreadMap.get(scopeId) === visibleThreadId
    const matchesOrigin = effectiveSelectedOrigin === 'all' || scopeId === effectiveSelectedOrigin
    const matchesBucket = matchesWorkspaceBucket(artifact, state.selectedBucket)
    const matchesQuery = !normalizedQuery || matchesWorkspaceArtifactQuery(artifact, normalizedQuery)

    return matchesThread && matchesOrigin && matchesBucket && matchesQuery
  })
  const selectedArtifacts = state.artifacts.filter((artifact) => state.selectedArtifactIds.includes(artifact.id))
  const selectedPreviewArtifact = state.previewArtifactId
    ? state.artifacts.find((artifact) => artifact.id === state.previewArtifactId) ?? null
    : null
  const selectedScope = effectiveSelectedOrigin === 'all'
    ? null
    : visibleContextEntries.find((entry) => entry.scopeId === effectiveSelectedOrigin) ?? null
  const workspaceFolderName = getWorkspaceFolderName(state.workspaceRoot)
  const selectedScopeArtifacts = selectedScope
    ? state.artifacts.filter((artifact) => getArtifactScopeId(artifact) === selectedScope.scopeId)
    : []
  const selectedScopeArtifactKey = selectedScopeArtifacts.map((artifact) => artifact.id).join('|')

  const updateWorkspaceViewState = (
    nextState: typeof state | ((currentState: typeof state) => typeof state)
  ): void => {
    const resolvedState = typeof nextState === 'function' ? nextState(state) : nextState
    useWorkbenchStore.getState().updatePanelViewState(panel.definition.id, resolvedState)
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

  const syncSnapshot = (snapshot: Awaited<ReturnType<typeof window.workbenchShell.workspace.selectThread>>): void => {
    if (snapshot) {
      syncWorkspaceState(snapshot)
    }
  }

  const createThread = async (): Promise<void> => {
    const requestedTitle = window.prompt(ui.threadCreatePrompt, activeThread?.title ?? '')
    if (requestedTitle === null) {
      return
    }

    setThreadFilterMode('active')
    syncSnapshot(await window.workbenchShell.workspace.createThread(requestedTitle.trim() || null))
  }

  const continueThread = async (threadId: string): Promise<void> => {
    setThreadFilterMode('active')
    syncSnapshot(await window.workbenchShell.workspace.selectThread(threadId))
  }

  const renameActiveThread = async (): Promise<void> => {
    if (!activeThread) {
      return
    }

    const requestedTitle = window.prompt(ui.threadRenamePrompt, activeThread.title)
    if (!requestedTitle || requestedTitle.trim() === activeThread.title) {
      return
    }

    syncSnapshot(await window.workbenchShell.workspace.renameThread(activeThread.threadId, requestedTitle.trim()))
  }

  const reassignSelectedScope = async (): Promise<void> => {
    if (!selectedScope || !scopeThreadTargetId || scopeThreadTargetId === selectedScope.threadId) {
      return
    }

    syncSnapshot(await window.workbenchShell.workspace.reassignScopeThread(selectedScope.scopeId, scopeThreadTargetId))
  }

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
          <strong>{ui.threadContinuity}</strong>
          <span>{activeThread?.title ?? ui.noActiveThread}</span>
        </div>

        <div className="action-row">
          <button type="button" className="action-button" onClick={() => void createThread()}>
            {ui.threadCreate}
          </button>
          <button
            type="button"
            className="action-button action-button--ghost"
            disabled={!activeThread}
            onClick={() => void renameActiveThread()}
          >
            {ui.threadRename}
          </button>
          <button
            type="button"
            className="action-button action-button--ghost"
            onClick={() => setThreadFilterMode(threadFilterMode === 'active' ? 'all' : 'active')}
          >
            {threadFilterMode === 'active' ? ui.threadShowAll : ui.activeThread}
          </button>
        </div>

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
                  <strong>{thread.title}</strong>
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
                    onClick={() => void continueThread(thread.threadId)}
                  >
                    {ui.threadContinue}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
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
          <span>
            {selectedScope
              ? formatContextEntryLabel(selectedScope)
              : visibleThreadId
                ? activeThread?.title ?? ui.activeThread
                : ui.allSources}
          </span>
        </div>
        <div className="detail-columns">
          <label className="field">
            <span>{ui.contextType}</span>
            <select
              value={state.selectedBucket}
              onChange={(event) =>
                updateWorkspaceViewState({
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
              value={effectiveSelectedOrigin}
              onChange={(event) =>
                updateWorkspaceViewState({
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
              updateWorkspaceViewState({
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
              <button
                type="button"
                className="action-button action-button--ghost action-button--danger"
                onClick={() => void deleteSelectedScope()}
              >
                {ui.deleteSession}
              </button>
            </div>
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
                  updateWorkspaceViewState({
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
              <div className="detail-list__item">
                <span>`aw-threads`</span>
                <strong>{ui.cliCommandThreads}</strong>
              </div>
              <div className="detail-list__item">
                <span>`aw-thread &lt;threadId&gt;`</span>
                <strong>{ui.cliCommandThread}</strong>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-line">
              <strong>{ui.selectedArtifacts}</strong>
              <span>{selectedArtifacts.length} {ui.selectedCount}</span>
            </div>
            {selectedArtifacts.length === 0 ? (
              <p className="section-empty">{ui.selectedArtifactsEmpty}</p>
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
