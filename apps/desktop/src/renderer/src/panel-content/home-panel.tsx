import { getLocalizedChecklist, getPanelKindLabel, getUiText, localizePanelDefinition, resolveLocale } from '../i18n'
import { useWorkbenchStore } from '../store'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'

export function HomePanel({
  panel,
  locale
}: {
  panel: ManagedPanel
  locale: ReturnType<typeof resolveLocale>
}): JSX.Element {
  const updatePanelViewState = useWorkbenchStore((state) => state.updatePanelViewState)
  const state = panel.viewState.kind === 'home' ? panel.viewState : null
  const ui = getUiText(locale)
  const definition = localizePanelDefinition(panel.definition, locale)
  const localizedChecklist = getLocalizedChecklist(locale)

  if (!state) {
    return <></>
  }

  return (
    <div className="panel-layout">
      <section className="panel-header">
        <p className="eyebrow">{ui.phaseSnapshot}</p>
        <h3>{definition.title}</h3>
      </section>

      <div className="stats-row">
        <article className="stat-block">
          <span>{ui.panelType}</span>
          <strong>{getPanelKindLabel(definition.kind, locale)}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.activationCount}</span>
          <strong>{panel.activationCount}</strong>
        </article>
        <article className="stat-block">
          <span>{ui.lastStatusCheck}</span>
          <strong>{panel.lastStatusCheckAt}</strong>
        </article>
      </div>

      <div className="plain-list">
        {state.checklist.map((item, index) => (
          <label key={item} className="plain-list__row">
            <input
              checked
              type="checkbox"
              onChange={() => {
                updatePanelViewState(panel.definition.id, {
                  ...state,
                  focusArea: `${ui.checkpoint} ${index + 1}`
                })
              }}
            />
            <span>{localizedChecklist[index] ?? item}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
