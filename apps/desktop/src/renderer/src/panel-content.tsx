import { resolveLocale } from './i18n'
import { useWorkbenchStore } from './store'
import { HomePanel } from './panel-content/home-panel'
import { SettingsPanel } from './panel-content/settings-panel'
import { TerminalPanel } from './panel-content/terminal-panel'
import { ToolPanel } from './panel-content/tool-panel'
import { WebPanel } from './panel-content/web-panel'
import { WorkspacePanel } from './panel-content/workspace-panel'
import type { ManagedPanel } from '@ai-workbench/core/desktop/panels'

export function PanelContent({ panel }: { panel: ManagedPanel }): JSX.Element {
  const locale = useWorkbenchStore((state) =>
    resolveLocale(state.panels.settings?.viewState.kind === 'settings' ? state.panels.settings.viewState.language : 'system')
  )

  switch (panel.definition.kind) {
    case 'home':
      return <HomePanel panel={panel} locale={locale} />
    case 'web':
      return <WebPanel panel={panel} locale={locale} />
    case 'terminal':
      return <TerminalPanel panel={panel} locale={locale} />
    case 'workspace':
      return <WorkspacePanel panel={panel} locale={locale} />
    case 'tool':
      return <ToolPanel panel={panel} locale={locale} />
    case 'settings':
      return <SettingsPanel panel={panel} locale={locale} />
  }
}
