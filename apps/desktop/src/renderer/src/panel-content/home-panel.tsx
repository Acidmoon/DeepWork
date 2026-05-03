import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { getUiText, localizePanelDefinition, resolveLocale } from '../i18n'
import { useWorkbenchStore } from '../store'
import { getWorkspaceFolderName } from './workspace-panel-helpers'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'
import { normalizeWorkspaceProfileKey, type WorkspaceProfileSettings } from '@ai-workbench/core/desktop/settings'

const QUICK_OPEN_PROFILE_LIMIT = 3

function timestampValue(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function compareQuickOpenProfiles(
  left: WorkspaceProfileSettings,
  right: WorkspaceProfileSettings,
  defaultWorkspaceProfileId: string | null
): number {
  const leftDefaultRank = left.id === defaultWorkspaceProfileId ? 1 : 0
  const rightDefaultRank = right.id === defaultWorkspaceProfileId ? 1 : 0

  if (leftDefaultRank !== rightDefaultRank) {
    return rightDefaultRank - leftDefaultRank
  }

  const lastUsedDelta = timestampValue(right.lastUsedAt) - timestampValue(left.lastUsedAt)
  if (lastUsedDelta !== 0) {
    return lastUsedDelta
  }

  return timestampValue(right.createdAt) - timestampValue(left.createdAt)
}

export function HomePanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const syncWorkspaceState = useWorkbenchStore((state) => state.syncWorkspaceState)
  const syncSettingsState = useWorkbenchStore((state) => state.syncSettingsState)
  const openPanel = useWorkbenchStore((state) => state.openPanel)
  const workspacePanel = useWorkbenchStore((state) => state.panels.artifacts)
  const settingsPanel = useWorkbenchStore((state) => state.panels.settings)
  const state = panel.viewState.kind === 'home' ? panel.viewState : null
  const workspaceState = workspacePanel?.viewState.kind === 'workspace' ? workspacePanel.viewState : null
  const settingsState = settingsPanel?.viewState.kind === 'settings' ? settingsPanel.viewState : null
  const [isChoosingWorkspace, setIsChoosingWorkspace] = useState(false)
  const [openingProfileId, setOpeningProfileId] = useState<string | null>(null)
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const workspaceFolderName = getWorkspaceFolderName(workspaceState?.workspaceRoot ?? '')
  const hasWorkspace = Boolean(workspaceState?.workspaceRoot)
  const currentWorkspaceRoot = workspaceState?.workspaceRoot ?? ''
  const quickOpenProfiles = (settingsState?.workspaceProfiles ?? [])
    .filter((profile) =>
      hasWorkspace ? normalizeWorkspaceProfileKey(profile.root) !== normalizeWorkspaceProfileKey(currentWorkspaceRoot) : true
    )
    .sort((left, right) => compareQuickOpenProfiles(left, right, settingsState?.defaultWorkspaceProfileId ?? null))
    .slice(0, QUICK_OPEN_PROFILE_LIMIT)

  if (!state) {
    return <></>
  }

  const chooseWorkspace = async (): Promise<void> => {
    if (isChoosingWorkspace || openingProfileId !== null) {
      return
    }

    setProfileFeedback(null)
    setIsChoosingWorkspace(true)
    try {
      const snapshot = await window.workbenchShell.workspace.chooseRoot()
      if (snapshot) {
        syncWorkspaceState(snapshot)
      }

      const settingsSnapshot = await window.workbenchShell.settings.getState()
      if (settingsSnapshot) {
        syncSettingsState(settingsSnapshot)
      }
    } finally {
      setIsChoosingWorkspace(false)
    }
  }

  const openWorkspaceProfile = async (profile: WorkspaceProfileSettings): Promise<void> => {
    if (isChoosingWorkspace || openingProfileId !== null) {
      return
    }

    setProfileFeedback(null)
    setOpeningProfileId(profile.id)
    try {
      const result = await window.workbenchShell.workspace.openProfile(profile.id)
      if (!result) {
        setProfileFeedback(ui.workspaceProfileUnavailable)
        return
      }

      syncSettingsState(result.settings)
      if (result.workspace) {
        syncWorkspaceState(result.workspace)
      }

      setProfileFeedback(result.error)
    } finally {
      setOpeningProfileId(null)
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
          <span>
            {hasWorkspace
              ? workspaceState?.initialized
                ? ui.workspaceInitialized
                : ui.workspaceInitializationPending
              : ui.homeWorkspaceNotSelected}
          </span>
        </div>
        <p className="section-empty">{hasWorkspace ? ui.homeWorkspaceHint : ui.homeWorkspaceStartHint}</p>

        <div className="detail-columns detail-columns--wide">
          <label className="field field--wide">
            <span>{ui.workspaceRoot}</span>
            <input value={workspaceState?.workspaceRoot || ui.homeWorkspaceNotSelected} readOnly />
          </label>
          <div className="action-row action-row--end">
            <button
              type="button"
              className="action-button"
              disabled={isChoosingWorkspace || openingProfileId !== null}
              onClick={() => void chooseWorkspace()}
            >
              <FolderOpen size={14} aria-hidden="true" />
              {isChoosingWorkspace ? ui.inProgress : ui.chooseWorkspace}
            </button>
          </div>
        </div>
      </section>

      {hasWorkspace ? (
        <section className="panel-section">
          <div className="section-line">
            <strong>{ui.homeResumeTitle}</strong>
            <span>{workspaceState?.activeThreadTitle ?? ui.noActiveThread}</span>
          </div>
          <p className="section-empty">{ui.homeWorkspaceContinuityHint}</p>
          <div className="action-row">
            <button type="button" className="action-button action-button--ghost" onClick={() => openPanel('artifacts')}>
              {ui.openInWorkspace}
            </button>
          </div>
        </section>
      ) : null}

      {quickOpenProfiles.length > 0 ? (
        <section className="panel-section">
          <div className="section-line">
            <strong>{ui.homeQuickOpenTitle}</strong>
            <span>{ui.workspaceProfiles}</span>
          </div>
          <p className="section-empty">{ui.homeQuickOpenHint}</p>

          <div className="home-profile-list">
            {quickOpenProfiles.map((profile) => {
              const isDefault = settingsState?.defaultWorkspaceProfileId === profile.id
              const isOpening = openingProfileId === profile.id

              return (
                <article key={profile.id} className="home-profile-row">
                  <div className="home-profile-row__main">
                    <strong>{profile.name}</strong>
                    <span>{profile.root}</span>
                    <div className="home-profile-row__badges">
                      {isDefault ? <span className="state-pill state-pill--planned">{ui.defaultWorkspaceProfile}</span> : null}
                    </div>
                  </div>
                  <div className="home-profile-row__actions">
                    <button
                      type="button"
                      className="action-button action-button--ghost"
                      disabled={isChoosingWorkspace || openingProfileId !== null}
                      onClick={() => void openWorkspaceProfile(profile)}
                    >
                      <FolderOpen size={14} aria-hidden="true" />
                      {isOpening ? ui.inProgress : ui.openWorkspaceProfile}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {profileFeedback ? <p className="section-empty">{profileFeedback}</p> : null}
        </section>
      ) : null}

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
