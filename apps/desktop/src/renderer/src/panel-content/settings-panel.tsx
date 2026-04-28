import {
  getLanguageLabel,
  getPlaceholderStatusLabel,
  getThemeLabel,
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
    <div className="panel-layout">
      <section className="panel-header">
        <p className="eyebrow">{ui.applicationSettings}</p>
        <h3>{definition.title}</h3>
        <p>{ui.settingsIntro}</p>
      </section>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.language}</strong>
          <span>{ui.uiLocalePreference}</span>
        </div>

        <div className="detail-columns">
          <label className="field">
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
          <div className="detail-list">
            <div className="detail-list__item">
              <span>{ui.currentMode}</span>
              <strong>{getLanguageLabel(state.language, locale)}</strong>
            </div>
            <div className="detail-list__item">
              <span>{ui.note}</span>
              <strong>{ui.languageSwitchNote}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.theme}</strong>
          <span>{ui.themePreference}</span>
        </div>

        <div className="detail-columns">
          <label className="field">
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
          <div className="detail-list">
            <div className="detail-list__item">
              <span>{ui.currentMode}</span>
              <strong>{getThemeLabel(state.theme, locale)}</strong>
            </div>
            <div className="detail-list__item">
              <span>{ui.note}</span>
              <strong>{ui.themePreference}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.cliStartupPrelude}</strong>
          <span>{ui.cliStartupPreludeHint}</span>
        </div>

        <label className="field">
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

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.upcomingPreferences}</strong>
          <span>{ui.scaffoldedPlaceholders}</span>
        </div>

        <div className="artifact-list">
          {state.placeholders.map((item) => {
            const localizedItem = localizeSettingsPlaceholder(item, locale)

            return (
              <article key={item.id} className="artifact-row">
                <div>
                  <strong>{localizedItem.label}</strong>
                  <p>{localizedItem.description}</p>
                </div>
                <div className="artifact-row__meta">
                  <span>{getPlaceholderStatusLabel(item.status, locale)}</span>
                  <small>{item.id}</small>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-line">
          <strong>{ui.notes}</strong>
          <span>{ui.freeFormPlaceholder}</span>
        </div>

        <label className="field">
          <span>{ui.settingsRoadmapNotes}</span>
          <textarea
            rows={5}
            value={state.notes}
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
