import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TerminalManager } from './terminal-manager'
import { WebPanelManager } from './web-panel-manager'
import { WorkspaceManager } from './workspace-manager'
import { SettingsManager } from './settings-manager'
import type { PanelBounds, WebPanelConfig, WebPanelNavigationAction } from '@ai-workbench/core/desktop/web-panels'
import type { TerminalResizePayload } from '@ai-workbench/core/desktop/terminal-panels'
import type { AppSettingsUpdate } from '@ai-workbench/core/desktop/settings'
import type { SaveClipboardOptions } from '@ai-workbench/core/desktop/workspace'

const __dirname = dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let webPanelManager: WebPanelManager | null = null
let terminalManager: TerminalManager | null = null
let workspaceManager: WorkspaceManager | null = null
let settingsManager: SettingsManager | null = null

function createMainWindow(): BrowserWindow {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  const window = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#09111f',
    autoHideMenuBar: true,
    title: 'DeepWork',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  return window
}

app.whenReady().then(() => {
  app.setName('DeepWork')
  settingsManager = new SettingsManager(app.getPath('userData'))
  mainWindow = createMainWindow()
  workspaceManager = new WorkspaceManager(app.getPath('documents'), settingsManager.getSnapshot().workspaceRoot, (snapshot) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    mainWindow.webContents.send('workspace:state-changed', snapshot)
  })
  webPanelManager = new WebPanelManager(
    mainWindow,
    settingsManager.getSnapshot().webPanels,
    settingsManager.getSnapshot().customWebPanels,
    (payload) => workspaceManager?.upsertWebContext(payload) ?? null
  )
  terminalManager = new TerminalManager(
    mainWindow,
    app.getPath('userData'),
    settingsManager.getSnapshot().workspaceRoot ?? process.cwd(),
    settingsManager.getSnapshot().customTerminalPanels,
    settingsManager.getSnapshot().terminalPreludeCommands,
    (payload) => workspaceManager?.upsertTerminalTranscript(payload) ?? null
  )
  terminalManager.syncWorkspaceRoot(workspaceManager.getSnapshot().workspaceRoot)

  ipcMain.handle('web-panel:get-state', (_event, panelId: string) => webPanelManager?.getSnapshot(panelId) ?? null)
  ipcMain.handle('web-panel:show', (_event, panelId: string, bounds: PanelBounds) =>
    webPanelManager?.showPanel(panelId, bounds) ?? null
  )
  ipcMain.handle('web-panel:hide', (_event, panelId: string) => {
    webPanelManager?.hidePanel(panelId)
  })
  ipcMain.handle('web-panel:update-bounds', (_event, panelId: string, bounds: PanelBounds) => {
    webPanelManager?.updateBounds(panelId, bounds)
  })
  ipcMain.handle('web-panel:navigate', (_event, panelId: string, action: WebPanelNavigationAction, url?: string) =>
    webPanelManager?.navigate(panelId, action, url) ?? null
  )
  ipcMain.handle(
    'web-panel:update-config',
    (_event, panelId: string, update: Pick<WebPanelConfig, 'homeUrl' | 'partition' | 'enabled'>) => {
      const settingsSnapshot = settingsManager?.updateWebPanel(panelId, update)
      if (!settingsSnapshot) {
        return null
      }

      webPanelManager?.syncCustomPanels(settingsSnapshot.customWebPanels)
      const nextConfig =
        settingsSnapshot.webPanels[panelId] ??
        settingsSnapshot.customWebPanels.find((panel) => panel.id === panelId)

      return nextConfig ? (webPanelManager?.updateConfig(panelId, nextConfig) ?? null) : null
    }
  )
  ipcMain.handle('terminal:attach', (_event, panelId: string) => terminalManager?.attach(panelId) ?? null)
  ipcMain.handle('terminal:get-state', (_event, panelId: string) => terminalManager?.getSnapshot(panelId) ?? null)
  ipcMain.handle('terminal:start', (_event, panelId: string) => terminalManager?.start(panelId) ?? null)
  ipcMain.handle('terminal:restart', (_event, panelId: string) => terminalManager?.restart(panelId) ?? null)
  ipcMain.handle('terminal:write', (_event, panelId: string, data: string) => {
    terminalManager?.write(panelId, data)
  })
  ipcMain.handle('terminal:resize', (_event, panelId: string, size: TerminalResizePayload) => {
    terminalManager?.resize(panelId, size)
  })
  ipcMain.handle('terminal:clear', (_event, panelId: string) => terminalManager?.clearBuffer(panelId) ?? null)
  ipcMain.handle('workspace:get-state', () => workspaceManager?.getSnapshot() ?? null)
  ipcMain.handle('workspace:read-artifact', (_event, artifactId: string) => workspaceManager?.readArtifactContent(artifactId) ?? null)
  ipcMain.handle('workspace:delete-scope', (_event, scopeId: string) => workspaceManager?.deleteScope(scopeId) ?? null)
  ipcMain.handle('workspace:choose-root', async () => {
    if (!mainWindow || !workspaceManager) {
      return null
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return workspaceManager.getSnapshot()
    }

    const snapshot = workspaceManager.setWorkspaceRoot(result.filePaths[0])
    settingsManager?.update({ workspaceRoot: snapshot.workspaceRoot })
    terminalManager?.syncWorkspaceRoot(snapshot.workspaceRoot)
    return snapshot
  })
  ipcMain.handle('workspace:save-clipboard', (_event, options: SaveClipboardOptions) =>
    workspaceManager?.saveClipboardAsArtifact(options) ?? null
  )
  ipcMain.handle('settings:get-state', () => settingsManager?.getSnapshot() ?? null)
  ipcMain.handle('settings:update', (_event, update: AppSettingsUpdate) => {
    const snapshot = settingsManager?.update(update) ?? null
    if (!snapshot) {
      return null
    }

    webPanelManager?.syncCustomPanels(snapshot.customWebPanels)
    terminalManager?.syncCustomPanels(snapshot.customTerminalPanels)
    terminalManager?.syncStartupPreludeCommands(snapshot.terminalPreludeCommands)
    if (workspaceManager && Object.prototype.hasOwnProperty.call(update, 'workspaceRoot')) {
      const workspaceSnapshot = workspaceManager.setWorkspaceRoot(snapshot.workspaceRoot)
      terminalManager?.syncWorkspaceRoot(workspaceSnapshot.workspaceRoot)
    }
    return snapshot
  })

  mainWindow.on('closed', () => {
    webPanelManager?.dispose()
    terminalManager?.dispose()
    webPanelManager = null
    terminalManager = null
    workspaceManager = null
    settingsManager = null
    mainWindow = null
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      settingsManager = new SettingsManager(app.getPath('userData'))
      mainWindow = createMainWindow()
      workspaceManager = new WorkspaceManager(app.getPath('documents'), settingsManager.getSnapshot().workspaceRoot, (snapshot) => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          return
        }

        mainWindow.webContents.send('workspace:state-changed', snapshot)
      })
      webPanelManager = new WebPanelManager(
        mainWindow,
        settingsManager.getSnapshot().webPanels,
        settingsManager.getSnapshot().customWebPanels,
        (payload) => workspaceManager?.upsertWebContext(payload) ?? null
      )
      terminalManager = new TerminalManager(
        mainWindow,
        app.getPath('userData'),
        settingsManager.getSnapshot().workspaceRoot ?? process.cwd(),
        settingsManager.getSnapshot().customTerminalPanels,
        settingsManager.getSnapshot().terminalPreludeCommands,
        (payload) => workspaceManager?.upsertTerminalTranscript(payload) ?? null
      )
      terminalManager.syncWorkspaceRoot(workspaceManager.getSnapshot().workspaceRoot)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
