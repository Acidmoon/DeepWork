import { getUiText, localizePanelDefinition, resolveLocale } from '../i18n'
import { asToolViewState, useWorkbenchStore } from '../store'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'

export function ToolPanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const state = asToolViewState(panel.viewState)
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)

  return (
    <div className="panel-layout">
      <section className="panel-header">
        <p className="eyebrow">{ui.toolPlaceholder}</p>
        <h3>{definition.title}</h3>
        <p>{ui.toolIntro}</p>
      </section>

      <div className="detail-columns">
        <label className="field">
          <span>{ui.outputFormat}</span>
          <select
            value={state.outputFormat}
            onChange={(event) =>
              updatePanelViewState(panel.definition.id, {
                ...state,
                outputFormat: event.target.value
              })
            }
          >
            <option value="pdf">pdf</option>
            <option value="png">png</option>
          </select>
        </label>
        <label className="field">
          <span>{ui.lastArtifact}</span>
          <input
            value={state.lastArtifact}
            onChange={(event) =>
              updatePanelViewState(panel.definition.id, {
                ...state,
                lastArtifact: event.target.value
              })
            }
          />
        </label>
      </div>

      <label className="field">
        <span>{ui.renderNotes}</span>
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
  )
}
