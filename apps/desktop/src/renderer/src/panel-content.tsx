import { Suspense, lazy } from 'react'
import { resolveLocale } from './i18n'
import { useWorkbenchStore } from './store'
import { HomePanel } from './panel-content/home-panel'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'

const WebPanel = lazy(async () => {
  const module = await import('./panel-content/web-panel')
  return { default: module.WebPanel }
})

const TerminalPanel = lazy(async () => {
  const module = await import('./panel-content/terminal-panel')
  return { default: module.TerminalPanel }
})

const WorkspacePanel = lazy(async () => {
  const module = await import('./panel-content/workspace-panel')
  return { default: module.WorkspacePanel }
})

const SettingsPanel = lazy(async () => {
  const module = await import('./panel-content/settings-panel')
  return { default: module.SettingsPanel }
})

function PanelLoadingFallback({ label }: { label: string }): JSX.Element {
  return (
    <div className="panel-layout panel-loading-state" role="status" aria-live="polite">
      <section className="panel-header">
        <p className="eyebrow">Loading</p>
        <h3>{label}</h3>
      </section>
      <p className="section-empty">Preparing this surface...</p>
    </div>
  )
}

export function PanelContent({ panel }: { panel: ManagedPanel }): JSX.Element {
  const locale = useWorkbenchStore((state) =>
    resolveLocale(state.panels.settings?.viewState.kind === 'settings' ? state.panels.settings.viewState.language : 'system')
  )

  switch (panel.definition.kind) {
    case 'home':
      return <HomePanel panel={panel} locale={locale} />
    case 'web':
      return (
        <Suspense fallback={<PanelLoadingFallback label={panel.definition.title} />}>
          <WebPanel panel={panel} locale={locale} />
        </Suspense>
      )
    case 'terminal':
      return (
        <Suspense fallback={<PanelLoadingFallback label={panel.definition.title} />}>
          <TerminalPanel panel={panel} locale={locale} />
        </Suspense>
      )
    case 'workspace':
      return (
        <Suspense fallback={<PanelLoadingFallback label={panel.definition.title} />}>
          <WorkspacePanel panel={panel} locale={locale} />
        </Suspense>
      )
    case 'settings':
      return (
        <Suspense fallback={<PanelLoadingFallback label={panel.definition.title} />}>
          <SettingsPanel panel={panel} locale={locale} />
        </Suspense>
      )
  }
}
