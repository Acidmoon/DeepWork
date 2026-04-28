import type { PanelBounds, WebPanelConfig, WebPanelNavigationAction, WebPanelSnapshot } from '@ai-workbench/core/desktop/web-panels'
import type { AppSettingsSnapshot, AppSettingsUpdate } from '@ai-workbench/core/desktop/settings'
import type {
  TerminalOutputEvent,
  TerminalPanelAttachPayload,
  TerminalResizePayload,
  TerminalPanelSnapshot
} from '@ai-workbench/core/desktop/terminal-panels'
import type { ArtifactContentPayload, SaveClipboardOptions, SaveClipboardResult, WorkspaceSnapshot } from '@ai-workbench/core/desktop/workspace'

interface WorkbenchShellApi {
  platform: string
  versions: {
    chrome: string
    electron: string
    node: string
  }
  clipboard: {
    readText: () => string
    writeText: (text: string) => void
  }
  webPanels: {
    getState: (panelId: string) => Promise<WebPanelSnapshot | null>
    show: (panelId: string, bounds: PanelBounds) => Promise<WebPanelSnapshot | null>
    hide: (panelId: string) => Promise<void>
    updateBounds: (panelId: string, bounds: PanelBounds) => Promise<void>
    navigate: (panelId: string, action: WebPanelNavigationAction, url?: string) => Promise<WebPanelSnapshot | null>
    updateConfig: (panelId: string, update: Pick<WebPanelConfig, 'homeUrl' | 'partition' | 'enabled'>) => Promise<WebPanelSnapshot | null>
    onStateChanged: (listener: (snapshot: WebPanelSnapshot) => void) => () => void
  }
  terminals: {
    attach: (panelId: string) => Promise<TerminalPanelAttachPayload | null>
    getState: (panelId: string) => Promise<TerminalPanelSnapshot | null>
    start: (panelId: string) => Promise<TerminalPanelSnapshot | null>
    restart: (panelId: string) => Promise<TerminalPanelSnapshot | null>
    write: (panelId: string, data: string) => Promise<void>
    resize: (panelId: string, size: TerminalResizePayload) => Promise<void>
    clear: (panelId: string) => Promise<TerminalPanelAttachPayload | null>
    onOutput: (listener: (event: TerminalOutputEvent) => void) => () => void
    onStateChanged: (listener: (snapshot: TerminalPanelSnapshot) => void) => () => void
  }
  workspace: {
    getState: () => Promise<WorkspaceSnapshot | null>
    readArtifact: (artifactId: string) => Promise<ArtifactContentPayload | null>
    deleteScope: (scopeId: string) => Promise<WorkspaceSnapshot | null>
    createThread: (title?: string | null) => Promise<WorkspaceSnapshot | null>
    selectThread: (threadId: string | null) => Promise<WorkspaceSnapshot | null>
    renameThread: (threadId: string, title: string) => Promise<WorkspaceSnapshot | null>
    reassignScopeThread: (scopeId: string, threadId: string) => Promise<WorkspaceSnapshot | null>
    resync: (panelId?: string) => Promise<WorkspaceSnapshot | null>
    chooseRoot: () => Promise<WorkspaceSnapshot | null>
    saveClipboard: (options: SaveClipboardOptions) => Promise<SaveClipboardResult | null>
    onStateChanged: (listener: (snapshot: WorkspaceSnapshot) => void) => () => void
  }
  settings: {
    getState: () => Promise<AppSettingsSnapshot | null>
    update: (update: AppSettingsUpdate) => Promise<AppSettingsSnapshot | null>
  }
}

declare global {
  interface Window {
    workbenchShell: WorkbenchShellApi
  }
}

export {}
