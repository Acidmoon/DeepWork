import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TerminalManager } from './terminal-manager'
import { WebPanelManager } from './web-panel-manager'
import { WorkspaceManager } from './workspace-manager'
import { SettingsManager } from './settings-manager'
import type { PanelBounds, WebPanelConfig, WebPanelNavigationAction } from '@ai-workbench/core/desktop/web-panels'
import type { TerminalResizePayload } from '@ai-workbench/core/desktop/terminal-panels'
import { resolveStartupWorkspaceRoot, type AppSettingsSnapshot, type AppSettingsUpdate } from '@ai-workbench/core/desktop/settings'
import type { SaveClipboardOptions } from '@ai-workbench/core/desktop/workspace'

const __dirname = dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let webPanelManager: WebPanelManager | null = null
let terminalManager: TerminalManager | null = null
let workspaceManager: WorkspaceManager | null = null
let settingsManager: SettingsManager | null = null

function resolveAppPath(name: 'userData' | 'documents', overrideEnv: string): string {
  const override = process.env[overrideEnv]?.trim()
  return override || app.getPath(name)
}

function getUserDataPath(): string {
  return resolveAppPath('userData', 'DEEPWORK_USER_DATA_DIR')
}

function getDocumentsPath(): string {
  return resolveAppPath('documents', 'DEEPWORK_DOCUMENTS_DIR')
}

function getResolvedWorkspaceRoot(snapshot: AppSettingsSnapshot): string | null {
  return resolveStartupWorkspaceRoot(snapshot)
}

function syncWorkspaceRoot(root: string | null): void {
  const workspaceSnapshot = workspaceManager?.setWorkspaceRoot(root) ?? null
  if (workspaceSnapshot) {
    terminalManager?.syncWorkspaceRoot(workspaceSnapshot.workspaceRoot)
  }
}

function syncRuntimeSettings(snapshot: AppSettingsSnapshot): void {
  webPanelManager?.syncCustomPanels(snapshot.customWebPanels)
  terminalManager?.syncBuiltInOverrides(snapshot.builtInTerminalPanels)
  terminalManager?.syncCustomPanels(snapshot.customTerminalPanels)
  terminalManager?.syncStartupPreludeCommands(snapshot.terminalPreludeCommands)
  terminalManager?.syncCliRetrievalPreference(snapshot.cliRetrievalPreference)
  workspaceManager?.syncThreadContinuationPreference(snapshot.threadContinuationPreference)
}

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

function schedulePackageSmokeResult(): void {
  const resultPath = process.env.DEEPWORK_PACKAGE_SMOKE_RESULT?.trim()
  if (!resultPath || !mainWindow) {
    return
  }

  const timeoutMs = Number.parseInt(process.env.DEEPWORK_PACKAGE_SMOKE_TIMEOUT_MS ?? '1200', 10)
  const delay = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 1200

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }

    void mainWindow.webContents
      .executeJavaScript(
        "Boolean(document.querySelector('.shell') && document.querySelector('.home-workspace'))"
      )
      .then((rendererReady: boolean) => {
        const workspaceSnapshot = workspaceManager?.getSnapshot() ?? null
        const settingsSnapshot = settingsManager?.getSnapshot() ?? null
        const payload = {
          rendererReady,
          workspaceRoot: workspaceSnapshot?.workspaceRoot ?? null,
          workspaceInitialized: workspaceSnapshot?.initialized ?? null,
          settingsWorkspaceRoot: settingsSnapshot?.workspaceRoot ?? null,
          settingsSnapshot
        }
        mkdirSync(dirname(resultPath), { recursive: true })
        writeFileSync(resultPath, JSON.stringify(payload, null, 2), 'utf8')
      })
      .catch((error: unknown) => {
        mkdirSync(dirname(resultPath), { recursive: true })
        writeFileSync(
          resultPath,
          JSON.stringify(
            {
              rendererReady: false,
              error: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          ),
          'utf8'
        )
      })
      .finally(() => {
        app.quit()
      })
  }, delay)
}

app.whenReady().then(() => {
  app.setName('DeepWork')
  settingsManager = new SettingsManager(getUserDataPath())
  const initialSettings = settingsManager.getSnapshot()
  const initialWorkspaceRoot = getResolvedWorkspaceRoot(initialSettings)
  mainWindow = createMainWindow()
  workspaceManager = new WorkspaceManager(
    getDocumentsPath(),
    initialWorkspaceRoot,
    initialSettings.threadContinuationPreference,
    (snapshot) => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return
      }

      mainWindow.webContents.send('workspace:state-changed', snapshot)
    }
  )
  webPanelManager = new WebPanelManager(
    mainWindow,
    initialSettings.webPanels,
    initialSettings.customWebPanels,
    (payload) => workspaceManager?.upsertWebContext(payload) ?? null,
    (input) => workspaceManager?.getContinuitySummary(input) ?? null
  )
  terminalManager = new TerminalManager(
    mainWindow,
    getUserDataPath(),
    initialWorkspaceRoot ?? process.cwd(),
    initialSettings.builtInTerminalPanels,
    initialSettings.customTerminalPanels,
    initialSettings.terminalPreludeCommands,
    initialSettings.cliRetrievalPreference,
    (payload) => workspaceManager?.upsertTerminalTranscript(payload) ?? null,
    (sessionScopeId) => {
      workspaceManager?.syncRetrievalAuditArtifacts({ sessionScopeId, emitSnapshot: true })
    },
    (panelId, title, contextLabel) => workspaceManager?.ensureThreadForSession(panelId, title, contextLabel) ?? null,
    (input) => workspaceManager?.getContinuitySummary(input) ?? null
  )
  terminalManager.syncWorkspaceRoot(workspaceManager.getSnapshot().workspaceRoot)
  schedulePackageSmokeResult()

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

      const customConfig = settingsSnapshot.customWebPanels.find((panel) => panel.id === panelId)
      if (customConfig) {
        webPanelManager?.syncCustomPanels(settingsSnapshot.customWebPanels)
        return webPanelManager?.getSnapshot(panelId) ?? null
      }

      const nextConfig = settingsSnapshot.webPanels[panelId]
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
  ipcMain.handle('workspace:create-thread', (_event, title?: string | null) => workspaceManager?.createThread(title ?? null, true) ?? null)
  ipcMain.handle('workspace:select-thread', (_event, threadId: string | null) => workspaceManager?.selectThread(threadId) ?? null)
  ipcMain.handle('workspace:rename-thread', (_event, threadId: string, title: string) => workspaceManager?.renameThread(threadId, title) ?? null)
  ipcMain.handle(
    'workspace:reassign-scope-thread',
    (_event, scopeId: string, threadId: string) => workspaceManager?.reassignScopeToThread(scopeId, threadId) ?? null
  )
  ipcMain.handle('workspace:resync', async (_event, panelId?: string) => {
    await webPanelManager?.capturePersistedContexts(panelId)
    return workspaceManager?.getSnapshot() ?? null
  })
  ipcMain.handle('workspace:maintenance-scan', () => workspaceManager?.scanMaintenance() ?? null)
  ipcMain.handle('workspace:maintenance-rebuild', () => workspaceManager?.rebuildMaintenanceIndexes() ?? null)
  ipcMain.handle('workspace:maintenance-repair', () => workspaceManager?.repairMaintenance() ?? null)
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
  ipcMain.handle('workspace:open-profile', (_event, profileId: string) => {
    if (!settingsManager || !workspaceManager) {
      return null
    }

    const currentSettings = settingsManager.getSnapshot()
    const profile = currentSettings.workspaceProfiles.find((item) => item.id === profileId)
    if (!profile || !profile.root.trim()) {
      return {
        settings: currentSettings,
        workspace: workspaceManager.getSnapshot(),
        error: 'Workspace profile is unavailable.'
      }
    }

    if (!existsSync(profile.root)) {
      return {
        settings: currentSettings,
        workspace: workspaceManager.getSnapshot(),
        error: 'Workspace profile root is unavailable.'
      }
    }

    const now = new Date().toISOString()
    const settings = settingsManager.update({
      workspaceRoot: profile.root,
      workspaceProfiles: currentSettings.workspaceProfiles.map((item) =>
        item.id === profile.id
          ? {
              ...item,
              lastUsedAt: now
            }
          : item
      )
    })
    const workspace = workspaceManager.setWorkspaceRoot(settings.workspaceRoot)
    terminalManager?.syncWorkspaceRoot(workspace.workspaceRoot)

    return {
      settings,
      workspace,
      error: null
    }
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

    syncRuntimeSettings(snapshot)
    if (workspaceManager && Object.prototype.hasOwnProperty.call(update, 'workspaceRoot')) {
      syncWorkspaceRoot(snapshot.workspaceRoot)
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
      settingsManager = new SettingsManager(getUserDataPath())
      const activatedSettings = settingsManager.getSnapshot()
      const activatedWorkspaceRoot = getResolvedWorkspaceRoot(activatedSettings)
      mainWindow = createMainWindow()
      workspaceManager = new WorkspaceManager(
        getDocumentsPath(),
        activatedWorkspaceRoot,
        activatedSettings.threadContinuationPreference,
        (snapshot) => {
          if (!mainWindow || mainWindow.isDestroyed()) {
            return
          }

          mainWindow.webContents.send('workspace:state-changed', snapshot)
        }
      )
      webPanelManager = new WebPanelManager(
        mainWindow,
        activatedSettings.webPanels,
        activatedSettings.customWebPanels,
        (payload) => workspaceManager?.upsertWebContext(payload) ?? null,
        (input) => workspaceManager?.getContinuitySummary(input) ?? null
      )
      terminalManager = new TerminalManager(
        mainWindow,
        getUserDataPath(),
        activatedWorkspaceRoot ?? process.cwd(),
        activatedSettings.builtInTerminalPanels,
        activatedSettings.customTerminalPanels,
        activatedSettings.terminalPreludeCommands,
        activatedSettings.cliRetrievalPreference,
        (payload) => workspaceManager?.upsertTerminalTranscript(payload) ?? null,
        (sessionScopeId) => {
          workspaceManager?.syncRetrievalAuditArtifacts({ sessionScopeId, emitSnapshot: true })
        },
        (panelId, title, contextLabel) => workspaceManager?.ensureThreadForSession(panelId, title, contextLabel) ?? null,
        (input) => workspaceManager?.getContinuitySummary(input) ?? null
      )
      terminalManager.syncWorkspaceRoot(workspaceManager.getSnapshot().workspaceRoot)
      schedulePackageSmokeResult()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
