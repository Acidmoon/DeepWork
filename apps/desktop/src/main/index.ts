import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TerminalManager } from './terminal-manager'
import { WebPanelManager } from './web-panel-manager'
import { WorkspaceManager } from './workspace-manager'
import { SettingsManager } from './settings-manager'
import { FeishuRemoteBridgeApiClient } from './feishu-remote-bridge-api-client'
import { FeishuRemoteBridgeService } from './feishu-remote-bridge-service'
import { CodexAppServerStdioTransport } from './codex-app-server/prototype-client'
import {
  createStructuredCodexAdapterIfEnabled,
  type StructuredCodexThreadIdentityStore
} from './codex-app-server/structured-adapter'
import { JsonlRemoteBridgeAuditSink } from './remote-bridge-audit'
import { PtyRemoteSessionAdapter } from './remote-session-adapter'
import {
  guardIdentifier,
  guardOptionalIdentifier,
  guardOptionalTitle,
  guardOptionalUrl,
  guardPanelBounds,
  guardSaveClipboardOptions,
  guardSettingsUpdate,
  guardTerminalResize,
  guardTerminalWrite,
  guardWebPanelConfigUpdate,
  guardWebPanelNavigationAction
} from './ipc-guards'
import { isRemoteBridgeReady, resolveStartupWorkspaceRoot, type AppSettingsSnapshot } from '@ai-workbench/core/desktop/settings'
import { terminalPanelConfigs } from '@ai-workbench/core/desktop/terminal-panels'

const __dirname = dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null
let webPanelManager: WebPanelManager | null = null
let terminalManager: TerminalManager | null = null
let workspaceManager: WorkspaceManager | null = null
let settingsManager: SettingsManager | null = null
let remoteBridgeService: FeishuRemoteBridgeService | null = null
const structuredCodexThreadStore: StructuredCodexThreadIdentityStore = {
  threads: new Map<string, string>(),
  getThreadId(targetId: string): string | null {
    return this.threads.get(targetId) ?? null
  },
  setThreadId(targetId: string, threadId: string): void {
    this.threads.set(targetId, threadId)
  }
} as StructuredCodexThreadIdentityStore & { threads: Map<string, string> }

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

function getAvailableRemotePanelIds(snapshot: AppSettingsSnapshot): string[] {
  return [...terminalPanelConfigs.map((panel) => panel.id), ...snapshot.customTerminalPanels.map((panel) => panel.id)]
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

function syncRemoteBridgeService(snapshot: AppSettingsSnapshot): void {
  try {
    remoteBridgeService?.dispose()
  } catch (error) {
    console.warn(
      `[remote-bridge] Failed to dispose remote bridge service: ${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    remoteBridgeService = null
  }

  if (!terminalManager) {
    return
  }

  const availablePanelIds = getAvailableRemotePanelIds(snapshot)
  if (!isRemoteBridgeReady(snapshot.remoteBridge, availablePanelIds)) {
    return
  }

  let nextService: FeishuRemoteBridgeService | null = null
  let disposableAdapter: { dispose?: () => void } | null = null
  try {
    const auditSink = new JsonlRemoteBridgeAuditSink(join(getUserDataPath(), 'remote-bridge-audit.jsonl'))
    const defaultPanelSnapshot = terminalManager.getSnapshot(snapshot.remoteBridge.defaultPanelId)
    const remoteCwd = defaultPanelSnapshot?.cwd ?? getResolvedWorkspaceRoot(snapshot) ?? process.cwd()
    const adapter =
      snapshot.remoteBridge.targetMode === 'codex-app-server'
        ? createStructuredCodexAdapterIfEnabled({
            settings: snapshot.remoteBridge,
            transport: new CodexAppServerStdioTransport({
              cwd: remoteCwd,
              autoApproveServerRequests: true
            }),
            threadStore: structuredCodexThreadStore,
            options: {
              cwd: remoteCwd,
              title: 'Codex App Server'
            }
          })
        : new PtyRemoteSessionAdapter(terminalManager, snapshot.remoteBridge.enabledPanelIds, {
            lockTimeoutMs: snapshot.remoteBridge.lock.timeoutMs,
            localActivityBlockMs: snapshot.remoteBridge.lock.localActivityBlockMs,
            allowLockOwnerDuringLocalActivity: snapshot.remoteBridge.lock.allowLockOwnerDuringLocalActivity,
            adminUserIds: snapshot.remoteBridge.adminUserIds
          })
    if (!adapter) {
      return
    }

    disposableAdapter = adapter as { dispose?: () => void }
    const client = new FeishuRemoteBridgeApiClient(snapshot.remoteBridge)
    nextService = new FeishuRemoteBridgeService({
      settings: snapshot.remoteBridge,
      availablePanelIds,
      adapter,
      client,
      auditSink
    })
    if (!nextService.start()) {
      nextService.dispose()
      return
    }

    remoteBridgeService = nextService
    nextService = null
    disposableAdapter = null
  } catch (error) {
    try {
      nextService?.dispose()
      if (!nextService) {
        disposableAdapter?.dispose?.()
      }
    } catch (disposeError) {
      console.warn(
        `[remote-bridge] Failed to clean up failed remote bridge service: ${
          disposeError instanceof Error ? disposeError.message : String(disposeError)
        }`
      )
    }
    console.warn(
      `[remote-bridge] Failed to start remote bridge service: ${error instanceof Error ? error.message : String(error)}`
    )
  }
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
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: app.isPackaged
    }
  })

  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    if (process.env.DEEPWORK_RENDERER_DEBUG === '1') {
      console.error(`[renderer:did-fail-load] ${errorCode} ${errorDescription} ${validatedUrl}`)
    }
  })
  window.webContents.on('render-process-gone', (_event, details) => {
    if (process.env.DEEPWORK_RENDERER_DEBUG === '1') {
      console.error(`[renderer:gone] ${details.reason} exitCode=${details.exitCode}`)
    }
  })
  window.webContents.on('preload-error', (_event, preloadPath, error) => {
    if (process.env.DEEPWORK_RENDERER_DEBUG === '1') {
      console.error(`[renderer:preload-error] ${preloadPath}: ${error.message}`)
    }
  })

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
        `({
          rendererReady: Boolean(document.querySelector('.shell') && document.querySelector('.home-workspace')),
          location: window.location.href,
          title: document.title,
          bodyText: document.body?.innerText?.slice(0, 1000) ?? '',
          rootHtml: document.querySelector('#root')?.innerHTML?.slice(0, 1000) ?? '',
          rootChildCount: document.querySelector('#root')?.childElementCount ?? 0
        })`
      )
      .then((rendererDiagnostics: {
        rendererReady: boolean
        location: string
        title: string
        bodyText: string
        rootHtml: string
        rootChildCount: number
      }) => {
        const workspaceSnapshot = workspaceManager?.getSnapshot() ?? null
        const settingsSnapshot = settingsManager?.getSnapshot() ?? null
        const payload = {
          rendererReady: rendererDiagnostics.rendererReady,
          rendererDiagnostics,
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
  syncRemoteBridgeService(initialSettings)
  schedulePackageSmokeResult()

  ipcMain.handle('web-panel:get-state', (_event, panelId: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    return guardedPanelId ? (webPanelManager?.getSnapshot(guardedPanelId) ?? null) : null
  })
  ipcMain.handle('web-panel:show', (_event, panelId: unknown, bounds: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    const guardedBounds = guardPanelBounds(bounds)
    return guardedPanelId && guardedBounds ? (webPanelManager?.showPanel(guardedPanelId, guardedBounds) ?? null) : null
  })
  ipcMain.handle('web-panel:hide', (_event, panelId: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    if (guardedPanelId) {
      webPanelManager?.hidePanel(guardedPanelId)
    }
  })
  ipcMain.handle('web-panel:update-bounds', (_event, panelId: unknown, bounds: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    const guardedBounds = guardPanelBounds(bounds)
    if (guardedPanelId && guardedBounds) {
      webPanelManager?.updateBounds(guardedPanelId, guardedBounds)
    }
  })
  ipcMain.handle('web-panel:navigate', (_event, panelId: unknown, action: unknown, url?: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    const guardedAction = guardWebPanelNavigationAction(action)
    const guardedUrl = guardOptionalUrl(url)
    return guardedPanelId && guardedAction && guardedUrl !== null
      ? (webPanelManager?.navigate(guardedPanelId, guardedAction, guardedUrl) ?? null)
      : null
  })
  ipcMain.handle(
    'web-panel:update-config',
    (_event, panelId: unknown, update: unknown) => {
      const guardedPanelId = guardIdentifier(panelId)
      const guardedUpdate = guardWebPanelConfigUpdate(update)
      if (!guardedPanelId || !guardedUpdate) {
        return null
      }

      const settingsSnapshot = settingsManager?.updateWebPanel(guardedPanelId, guardedUpdate)
      if (!settingsSnapshot) {
        return null
      }

      const customConfig = settingsSnapshot.customWebPanels.find((panel) => panel.id === guardedPanelId)
      if (customConfig) {
        webPanelManager?.syncCustomPanels(settingsSnapshot.customWebPanels)
        return webPanelManager?.getSnapshot(guardedPanelId) ?? null
      }

      const nextConfig = settingsSnapshot.webPanels[guardedPanelId]
      return nextConfig ? (webPanelManager?.updateConfig(guardedPanelId, nextConfig) ?? null) : null
    }
  )
  ipcMain.handle('terminal:attach', (_event, panelId: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    return guardedPanelId ? (terminalManager?.attach(guardedPanelId) ?? null) : null
  })
  ipcMain.handle('terminal:get-state', (_event, panelId: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    return guardedPanelId ? (terminalManager?.getSnapshot(guardedPanelId) ?? null) : null
  })
  ipcMain.handle('terminal:start', (_event, panelId: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    return guardedPanelId ? (terminalManager?.start(guardedPanelId) ?? null) : null
  })
  ipcMain.handle('terminal:restart', (_event, panelId: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    return guardedPanelId ? (terminalManager?.restart(guardedPanelId) ?? null) : null
  })
  ipcMain.handle('terminal:write', (_event, panelId: unknown, data: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    const guardedData = guardTerminalWrite(data)
    if (guardedPanelId && guardedData !== null) {
      terminalManager?.write(guardedPanelId, guardedData)
    }
  })
  ipcMain.handle('terminal:resize', (_event, panelId: unknown, size: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    const guardedSize = guardTerminalResize(size)
    if (guardedPanelId && guardedSize) {
      terminalManager?.resize(guardedPanelId, guardedSize)
    }
  })
  ipcMain.handle('terminal:clear', (_event, panelId: unknown) => {
    const guardedPanelId = guardIdentifier(panelId)
    return guardedPanelId ? (terminalManager?.clearBuffer(guardedPanelId) ?? null) : null
  })
  ipcMain.handle('workspace:get-state', () => workspaceManager?.getSnapshot() ?? null)
  ipcMain.handle('workspace:read-artifact', (_event, artifactId: unknown) => {
    const guardedArtifactId = guardIdentifier(artifactId)
    return guardedArtifactId ? (workspaceManager?.readArtifactContent(guardedArtifactId) ?? null) : null
  })
  ipcMain.handle('workspace:delete-scope', (_event, scopeId: unknown) => {
    const guardedScopeId = guardIdentifier(scopeId)
    return guardedScopeId ? (workspaceManager?.deleteScope(guardedScopeId) ?? null) : null
  })
  ipcMain.handle('workspace:create-thread', (_event, title?: unknown) => {
    const guardedTitle = guardOptionalTitle(title)
    return title !== undefined && title !== null && guardedTitle === null
      ? null
      : (workspaceManager?.createThread(guardedTitle ?? null, true) ?? null)
  })
  ipcMain.handle('workspace:select-thread', (_event, threadId: unknown) => {
    const guardedThreadId = guardOptionalIdentifier(threadId)
    return threadId !== null && threadId !== undefined && guardedThreadId === null
      ? null
      : (workspaceManager?.selectThread(guardedThreadId) ?? null)
  })
  ipcMain.handle('workspace:rename-thread', (_event, threadId: unknown, title: unknown) => {
    const guardedThreadId = guardIdentifier(threadId)
    const guardedTitle = guardOptionalTitle(title)
    return guardedThreadId && guardedTitle ? (workspaceManager?.renameThread(guardedThreadId, guardedTitle) ?? null) : null
  })
  ipcMain.handle(
    'workspace:reassign-scope-thread',
    (_event, scopeId: unknown, threadId: unknown) => {
      const guardedScopeId = guardIdentifier(scopeId)
      const guardedThreadId = guardIdentifier(threadId)
      return guardedScopeId && guardedThreadId
        ? (workspaceManager?.reassignScopeToThread(guardedScopeId, guardedThreadId) ?? null)
        : null
    }
  )
  ipcMain.handle('workspace:resync', async (_event, panelId?: unknown) => {
    const guardedPanelId = guardOptionalIdentifier(panelId)
    if (panelId !== undefined && panelId !== null && guardedPanelId === null) {
      return workspaceManager?.getSnapshot() ?? null
    }

    await webPanelManager?.capturePersistedContexts(guardedPanelId ?? undefined)
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
  ipcMain.handle('workspace:open-profile', (_event, profileId: unknown) => {
    if (!settingsManager || !workspaceManager) {
      return null
    }

    const currentSettings = settingsManager.getSnapshot()
    const guardedProfileId = guardIdentifier(profileId)
    if (!guardedProfileId) {
      return {
        settings: currentSettings,
        workspace: workspaceManager.getSnapshot(),
        error: 'Workspace profile is unavailable.'
      }
    }

    const profile = currentSettings.workspaceProfiles.find((item) => item.id === guardedProfileId)
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
  ipcMain.handle('workspace:save-clipboard', (_event, options: unknown) => {
    const guardedOptions = guardSaveClipboardOptions(options)
    return guardedOptions ? (workspaceManager?.saveClipboardAsArtifact(guardedOptions) ?? null) : null
  })
  ipcMain.handle('settings:get-state', () => settingsManager?.getSnapshot() ?? null)
  ipcMain.handle('settings:update', (_event, update: unknown) => {
    const guardedUpdate = guardSettingsUpdate(update)
    if (!guardedUpdate) {
      return null
    }

    const snapshot = settingsManager?.update(guardedUpdate) ?? null
    if (!snapshot) {
      return null
    }

    syncRuntimeSettings(snapshot)
    if (Object.prototype.hasOwnProperty.call(guardedUpdate, 'remoteBridge')) {
      syncRemoteBridgeService(snapshot)
    }
    if (workspaceManager && Object.prototype.hasOwnProperty.call(guardedUpdate, 'workspaceRoot')) {
      syncWorkspaceRoot(snapshot.workspaceRoot)
    }
    return snapshot
  })

  mainWindow.on('closed', () => {
    remoteBridgeService?.dispose()
    webPanelManager?.dispose()
    terminalManager?.dispose()
    remoteBridgeService = null
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
      syncRemoteBridgeService(activatedSettings)
      schedulePackageSmokeResult()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
