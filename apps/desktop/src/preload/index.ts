import { clipboard, contextBridge, ipcRenderer } from 'electron'
import type { PanelBounds, WebPanelConfig, WebPanelNavigationAction, WebPanelSnapshot } from '@ai-workbench/core/desktop/web-panels'
import type {
  TerminalOutputEvent,
  TerminalPanelAttachPayload,
  TerminalResizePayload,
  TerminalPanelSnapshot
} from '@ai-workbench/core/desktop/terminal-panels'
import type { AppSettingsSnapshot, AppSettingsUpdate } from '@ai-workbench/core/desktop/settings'
import type { ArtifactContentPayload, SaveClipboardOptions, SaveClipboardResult, WorkspaceSnapshot } from '@ai-workbench/core/desktop/workspace'

contextBridge.exposeInMainWorld('workbenchShell', {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  },
  clipboard: {
    readText: () => clipboard.readText(),
    writeText: (text: string) => clipboard.writeText(text)
  },
  webPanels: {
    getState: (panelId: string) => ipcRenderer.invoke('web-panel:get-state', panelId) as Promise<WebPanelSnapshot | null>,
    show: (panelId: string, bounds: PanelBounds) =>
      ipcRenderer.invoke('web-panel:show', panelId, bounds) as Promise<WebPanelSnapshot | null>,
    hide: (panelId: string) => ipcRenderer.invoke('web-panel:hide', panelId) as Promise<void>,
    updateBounds: (panelId: string, bounds: PanelBounds) =>
      ipcRenderer.invoke('web-panel:update-bounds', panelId, bounds) as Promise<void>,
    navigate: (panelId: string, action: WebPanelNavigationAction, url?: string) =>
      ipcRenderer.invoke('web-panel:navigate', panelId, action, url) as Promise<WebPanelSnapshot | null>,
    updateConfig: (panelId: string, update: Pick<WebPanelConfig, 'homeUrl' | 'partition' | 'enabled'>) =>
      ipcRenderer.invoke('web-panel:update-config', panelId, update) as Promise<WebPanelSnapshot | null>,
    onStateChanged: (listener: (snapshot: WebPanelSnapshot) => void) => {
      const wrapped = (_event: Electron.IpcRendererEvent, snapshot: WebPanelSnapshot) => {
        listener(snapshot)
      }

      ipcRenderer.on('web-panel:state-changed', wrapped)
      return () => {
        ipcRenderer.removeListener('web-panel:state-changed', wrapped)
      }
    }
  },
  terminals: {
    attach: (panelId: string) => ipcRenderer.invoke('terminal:attach', panelId) as Promise<TerminalPanelAttachPayload | null>,
    getState: (panelId: string) => ipcRenderer.invoke('terminal:get-state', panelId) as Promise<TerminalPanelSnapshot | null>,
    start: (panelId: string) => ipcRenderer.invoke('terminal:start', panelId) as Promise<TerminalPanelSnapshot | null>,
    restart: (panelId: string) => ipcRenderer.invoke('terminal:restart', panelId) as Promise<TerminalPanelSnapshot | null>,
    write: (panelId: string, data: string) => ipcRenderer.invoke('terminal:write', panelId, data) as Promise<void>,
    resize: (panelId: string, size: TerminalResizePayload) =>
      ipcRenderer.invoke('terminal:resize', panelId, size) as Promise<void>,
    clear: (panelId: string) => ipcRenderer.invoke('terminal:clear', panelId) as Promise<TerminalPanelAttachPayload | null>,
    onOutput: (listener: (event: TerminalOutputEvent) => void) => {
      const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalOutputEvent) => {
        listener(payload)
      }

      ipcRenderer.on('terminal:output', wrapped)
      return () => {
        ipcRenderer.removeListener('terminal:output', wrapped)
      }
    },
    onStateChanged: (listener: (snapshot: TerminalPanelSnapshot) => void) => {
      const wrapped = (_event: Electron.IpcRendererEvent, snapshot: TerminalPanelSnapshot) => {
        listener(snapshot)
      }

      ipcRenderer.on('terminal:state-changed', wrapped)
      return () => {
        ipcRenderer.removeListener('terminal:state-changed', wrapped)
      }
    }
  },
  workspace: {
    getState: () => ipcRenderer.invoke('workspace:get-state') as Promise<WorkspaceSnapshot | null>,
    readArtifact: (artifactId: string) => ipcRenderer.invoke('workspace:read-artifact', artifactId) as Promise<ArtifactContentPayload | null>,
    deleteScope: (scopeId: string) => ipcRenderer.invoke('workspace:delete-scope', scopeId) as Promise<WorkspaceSnapshot | null>,
    createThread: (title?: string | null) => ipcRenderer.invoke('workspace:create-thread', title) as Promise<WorkspaceSnapshot | null>,
    selectThread: (threadId: string | null) => ipcRenderer.invoke('workspace:select-thread', threadId) as Promise<WorkspaceSnapshot | null>,
    renameThread: (threadId: string, title: string) =>
      ipcRenderer.invoke('workspace:rename-thread', threadId, title) as Promise<WorkspaceSnapshot | null>,
    reassignScopeThread: (scopeId: string, threadId: string) =>
      ipcRenderer.invoke('workspace:reassign-scope-thread', scopeId, threadId) as Promise<WorkspaceSnapshot | null>,
    resync: (panelId?: string) => ipcRenderer.invoke('workspace:resync', panelId) as Promise<WorkspaceSnapshot | null>,
    chooseRoot: () => ipcRenderer.invoke('workspace:choose-root') as Promise<WorkspaceSnapshot | null>,
    openProfile: (profileId: string) =>
      ipcRenderer.invoke('workspace:open-profile', profileId) as Promise<{
        settings: AppSettingsSnapshot
        workspace: WorkspaceSnapshot | null
        error: string | null
      } | null>,
    saveClipboard: (options: SaveClipboardOptions) =>
      ipcRenderer.invoke('workspace:save-clipboard', options) as Promise<SaveClipboardResult | null>,
    onStateChanged: (listener: (snapshot: WorkspaceSnapshot) => void) => {
      const wrapped = (_event: Electron.IpcRendererEvent, snapshot: WorkspaceSnapshot) => {
        listener(snapshot)
      }

      ipcRenderer.on('workspace:state-changed', wrapped)
      return () => {
        ipcRenderer.removeListener('workspace:state-changed', wrapped)
      }
    }
  },
  settings: {
    getState: () => ipcRenderer.invoke('settings:get-state') as Promise<AppSettingsSnapshot | null>,
    update: (update: AppSettingsUpdate) => ipcRenderer.invoke('settings:update', update) as Promise<AppSettingsSnapshot | null>
  }
})
