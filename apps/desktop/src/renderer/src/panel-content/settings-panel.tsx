import {
  getPlaceholderStatusLabel,
  getUiText,
  localizePanelDefinition,
  localizeSettingsPlaceholder,
  resolveLocale
} from '../i18n'
import { asSettingsViewState, useWorkbenchStore } from '../store'
import type { ManagedPanel, SettingsPanelViewState } from '@ai-workbench/core/desktop/panels'
import {
  createWorkspaceProfile,
  getWorkspaceProfileNameFromRoot,
  normalizeWorkspaceProfileKey,
  type WorkspaceProfileSettings
} from '@ai-workbench/core/desktop/settings'

export function SettingsPanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const state = asSettingsViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const activeProfile = state.workspaceRoot
    ? state.workspaceProfiles.find((profile) => normalizeWorkspaceProfileKey(profile.root) === normalizeWorkspaceProfileKey(state.workspaceRoot ?? ''))
    : null

  const updateSettingsState = (nextState: SettingsPanelViewState): void => {
    updatePanelViewState(panel.definition.id, nextState)
  }

  const syncSettingsSnapshot = (snapshot: Awaited<ReturnType<typeof window.workbenchShell.settings.update>>): void => {
    if (snapshot) {
      useWorkbenchStore.getState().syncSettingsState(snapshot)
    }
  }

  const setProfileFeedback = (message: string | null): void => {
    const currentPanel = useWorkbenchStore.getState().panels[panel.definition.id]
    const currentState = currentPanel?.viewState.kind === 'settings' ? currentPanel.viewState : state

    updateSettingsState({
      ...currentState,
      workspaceProfileError: message
    })
  }

  const saveCurrentWorkspaceProfile = async (): Promise<void> => {
    if (!state.workspaceRoot) {
      setProfileFeedback(ui.workspaceProfileNeedsRoot)
      return
    }

    const now = new Date().toISOString()
    const draftName = state.workspaceProfileDraftName.trim()
    const profileName = draftName || activeProfile?.name || getWorkspaceProfileNameFromRoot(state.workspaceRoot)

    if (!profileName.trim()) {
      setProfileFeedback(ui.workspaceProfileNeedsName)
      return
    }

    const nextProfile = activeProfile
      ? {
          ...activeProfile,
          name: profileName.trim(),
          root: state.workspaceRoot,
          lastUsedAt: now
        }
      : createWorkspaceProfile(state.workspaceRoot, now, profileName)

    if (!nextProfile) {
      setProfileFeedback(ui.workspaceProfileNeedsRoot)
      return
    }

    const existingIndex = state.workspaceProfiles.findIndex(
      (profile) => normalizeWorkspaceProfileKey(profile.root) === normalizeWorkspaceProfileKey(nextProfile.root)
    )
    const workspaceProfiles =
      existingIndex >= 0
        ? state.workspaceProfiles.map((profile, index) => (index === existingIndex ? nextProfile : profile))
        : [...state.workspaceProfiles, nextProfile]

    updateSettingsState({
      ...state,
      workspaceProfiles,
      workspaceProfileDraftName: '',
      workspaceProfileError: ui.workspaceProfileSaved
    })
    syncSettingsSnapshot(await window.workbenchShell.settings.update({ workspaceProfiles }))
  }

  const renameWorkspaceProfile = async (profile: WorkspaceProfileSettings, name: string): Promise<void> => {
    const normalizedName = name.trim()
    const workspaceProfiles = state.workspaceProfiles.map((item) =>
      item.id === profile.id
        ? {
            ...item,
            name: normalizedName || item.name
          }
        : item
    )

    updateSettingsState({
      ...state,
      workspaceProfiles,
      workspaceProfileError: null
    })
    syncSettingsSnapshot(await window.workbenchShell.settings.update({ workspaceProfiles }))
  }

  const openWorkspaceProfile = async (profile: WorkspaceProfileSettings): Promise<void> => {
    const result = await window.workbenchShell.workspace.openProfile(profile.id)
    if (!result) {
      setProfileFeedback(ui.workspaceProfileUnavailable)
      return
    }

    useWorkbenchStore.getState().syncSettingsState(result.settings)
    if (result.workspace) {
      useWorkbenchStore.getState().syncWorkspaceState(result.workspace)
    }
    setProfileFeedback(result.error ?? ui.workspaceProfileOpened)
  }

  const setDefaultWorkspaceProfile = async (profile: WorkspaceProfileSettings): Promise<void> => {
    updateSettingsState({
      ...state,
      defaultWorkspaceProfileId: profile.id,
      workspaceProfileError: ui.workspaceProfileDefaultSaved
    })
    syncSettingsSnapshot(await window.workbenchShell.settings.update({ defaultWorkspaceProfileId: profile.id }))
  }

  const removeWorkspaceProfile = async (profile: WorkspaceProfileSettings): Promise<void> => {
    const workspaceProfiles = state.workspaceProfiles.filter((item) => item.id !== profile.id)
    const defaultWorkspaceProfileId =
      state.defaultWorkspaceProfileId === profile.id ? null : state.defaultWorkspaceProfileId

    updateSettingsState({
      ...state,
      workspaceProfiles,
      defaultWorkspaceProfileId,
      workspaceProfileError: ui.workspaceProfileRemoved
    })
    syncSettingsSnapshot(await window.workbenchShell.settings.update({ workspaceProfiles, defaultWorkspaceProfileId }))
  }

  return (
    <div className="panel-layout settings-surface">
      <section className="panel-header">
        <p className="eyebrow">{ui.applicationSettings}</p>
        <h3>{definition.title}</h3>
      </section>

      <div className="panel-section settings-section">
        <div className="section-line">
          <strong>{ui.workspaceProfiles}</strong>
          <span>{ui.workspaceProfilesHint}</span>
        </div>

        <label className="field settings-form-row">
          <span>{ui.activeWorkspace}</span>
          <input value={state.workspaceRoot || ui.homeWorkspaceNotSelected} readOnly />
        </label>

        <label className="field settings-form-row">
          <span>{ui.workspaceProfileName}</span>
          <input
            value={state.workspaceProfileDraftName}
            placeholder={activeProfile?.name || ui.workspaceProfileNamePlaceholder}
            onChange={(event) =>
              updateSettingsState({
                ...state,
                workspaceProfileDraftName: event.target.value,
                workspaceProfileError: null
              })
            }
          />
        </label>

        <div className="action-row action-row--end">
          <button type="button" className="action-button" onClick={() => void saveCurrentWorkspaceProfile()}>
            {activeProfile ? ui.updateWorkspaceProfile : ui.addWorkspaceProfile}
          </button>
        </div>

        {state.workspaceProfileError ? <p className="section-empty">{state.workspaceProfileError}</p> : null}

        <div className="settings-profile-list">
          {state.workspaceProfiles.length === 0 ? (
            <p className="section-empty">{ui.workspaceProfilesEmpty}</p>
          ) : (
            state.workspaceProfiles.map((profile) => {
              const isActive =
                !!state.workspaceRoot && normalizeWorkspaceProfileKey(profile.root) === normalizeWorkspaceProfileKey(state.workspaceRoot)
              const isDefault = state.defaultWorkspaceProfileId === profile.id

              return (
                <article key={profile.id} className="settings-profile-row">
                  <div className="settings-profile-row__main">
                    <input
                      value={profile.name}
                      aria-label={ui.workspaceProfileName}
                      onChange={(event) => void renameWorkspaceProfile(profile, event.target.value)}
                    />
                    <span>{profile.root}</span>
                    <div className="settings-profile-row__badges">
                      {isActive ? <span className="state-pill state-pill--success">{ui.workspaceProfileCurrent}</span> : null}
                      {isDefault ? <span className="state-pill state-pill--planned">{ui.defaultWorkspaceProfile}</span> : null}
                    </div>
                  </div>
                  <div className="settings-profile-row__actions">
                    <button type="button" className="action-button action-button--subtle" onClick={() => void openWorkspaceProfile(profile)}>
                      {ui.openWorkspaceProfile}
                    </button>
                    <button
                      type="button"
                      className="action-button action-button--subtle"
                      onClick={() => void setDefaultWorkspaceProfile(profile)}
                    >
                      {ui.setDefaultWorkspaceProfile}
                    </button>
                    <button type="button" className="action-button action-button--danger" onClick={() => void removeWorkspaceProfile(profile)}>
                      {ui.removeWorkspaceProfile}
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>

      <div className="panel-section settings-section">
        <div className="section-line">
          <strong>{ui.language}</strong>
          <span>{ui.languageSwitchNote}</span>
        </div>

        <label className="field settings-form-row">
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
      </div>

      <div className="panel-section settings-section">
        <div className="section-line">
          <strong>{ui.theme}</strong>
          <span>{ui.themePreference}</span>
        </div>

        <label className="field settings-form-row">
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
      </div>

      <div className="panel-section settings-section">
        <div className="section-line">
          <strong>{ui.sessionContinuityDefaults}</strong>
          <span>{ui.continuitySettingsNote}</span>
        </div>

        <label className="field settings-form-row">
          <span>{ui.defaultThreadContinuation}</span>
          <select
            value={state.threadContinuationPreference}
            onChange={async (event) => {
              const threadContinuationPreference = event.target.value as SettingsPanelViewState['threadContinuationPreference']

              updatePanelViewState(panel.definition.id, {
                ...state,
                threadContinuationPreference
              })

              const snapshot = await window.workbenchShell.settings.update({ threadContinuationPreference })
              if (snapshot) {
                useWorkbenchStore.getState().syncSettingsState(snapshot)
              }
            }}
          >
            <option value="continue-active-thread">{ui.continueActiveThread}</option>
            <option value="start-new-thread-per-scope">{ui.startNewThreadPerScope}</option>
          </select>
        </label>
      </div>

      <div className="panel-section settings-section">
        <div className="section-line">
          <strong>{ui.cliRetrievalPreference}</strong>
          <span>{ui.retrievalSettingsNote}</span>
        </div>

        <label className="field settings-form-row">
          <span>{ui.cliRetrievalPreference}</span>
          <select
            value={state.cliRetrievalPreference}
            onChange={async (event) => {
              const cliRetrievalPreference = event.target.value as SettingsPanelViewState['cliRetrievalPreference']

              updatePanelViewState(panel.definition.id, {
                ...state,
                cliRetrievalPreference
              })

              const snapshot = await window.workbenchShell.settings.update({ cliRetrievalPreference })
              if (snapshot) {
                useWorkbenchStore.getState().syncSettingsState(snapshot)
              }
            }}
          >
            <option value="thread-first">{ui.retrievalActiveThreadFirst}</option>
            <option value="global-first">{ui.retrievalGlobalFirst}</option>
          </select>
        </label>
      </div>

      <div className="panel-section settings-section">
        <div className="section-line">
          <strong>{ui.cliStartupPrelude}</strong>
          <span>{ui.cliStartupPreludeHint}</span>
        </div>

        <label className="field settings-form-row settings-form-row--textarea">
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

      <div className="panel-section settings-section settings-section--deferred">
        <div className="section-line">
          <strong>{ui.upcomingPreferences}</strong>
          <span>{ui.scaffoldedPlaceholders}</span>
        </div>

        <div className="settings-placeholder-list">
          {state.placeholders.map((placeholder) => {
            const localizedPlaceholder = localizeSettingsPlaceholder(placeholder, locale)

            return (
              <article key={placeholder.id} className="settings-placeholder-row">
                <div className="settings-placeholder-row__copy">
                  <strong>{localizedPlaceholder.label}</strong>
                  <p>{localizedPlaceholder.description}</p>
                </div>
                <span className="state-pill state-pill--planned">
                  {getPlaceholderStatusLabel(placeholder.status, locale)}
                </span>
              </article>
            )
          })}
        </div>

        <label className="field settings-form-row settings-form-row--textarea">
          <span>{ui.settingsRoadmapNotes}</span>
          <textarea
            rows={3}
            value={state.notes}
            placeholder={ui.freeFormPlaceholder}
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
