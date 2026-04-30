import {
  getPlaceholderStatusLabel,
  getUiText,
  localizePanelDefinition,
  localizeSettingsPlaceholder,
  resolveLocale
} from '../i18n'
import { asSettingsViewState, useWorkbenchStore } from '../store'
import type { ManagedPanel, SettingsPanelViewState } from '@ai-workbench/core/desktop/panels'

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

  return (
    <div className="panel-layout settings-surface">
      <section className="panel-header">
        <p className="eyebrow">{ui.applicationSettings}</p>
        <h3>{definition.title}</h3>
      </section>

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
