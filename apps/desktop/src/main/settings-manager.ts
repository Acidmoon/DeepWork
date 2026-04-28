import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { WebPanelConfig } from '@ai-workbench/core/desktop/web-panels'
import type { AppSettingsSnapshot, AppSettingsUpdate } from '@ai-workbench/core/desktop/settings'
import {
  defaultAppSettings,
  normalizeCliRetrievalPreference,
  normalizeThreadContinuationPreference
} from '@ai-workbench/core/desktop/settings'

export class SettingsManager {
  private readonly filePath: string
  private snapshot: AppSettingsSnapshot

  constructor(baseDirectory: string) {
    this.filePath = join(baseDirectory, 'settings.json')
    this.snapshot = this.readSettings()
  }

  getSnapshot(): AppSettingsSnapshot {
    return this.snapshot
  }

  update(update: AppSettingsUpdate): AppSettingsSnapshot {
    const nextSnapshot = {
      ...this.snapshot,
      ...update
    }
    this.snapshot = {
      ...nextSnapshot,
      threadContinuationPreference: normalizeThreadContinuationPreference(nextSnapshot.threadContinuationPreference),
      cliRetrievalPreference: normalizeCliRetrievalPreference(nextSnapshot.cliRetrievalPreference)
    }

    this.writeSettings(this.snapshot)
    return this.snapshot
  }

  updateWebPanel(panelId: string, config: Pick<WebPanelConfig, 'homeUrl' | 'partition' | 'enabled'>): AppSettingsSnapshot {
    const customIndex = this.snapshot.customWebPanels.findIndex((panel) => panel.id === panelId)
    if (customIndex >= 0) {
      const nextCustomPanels = [...this.snapshot.customWebPanels]
      nextCustomPanels[customIndex] = {
        ...nextCustomPanels[customIndex],
        ...config
      }

      this.snapshot = {
        ...this.snapshot,
        customWebPanels: nextCustomPanels
      }

      this.writeSettings(this.snapshot)
      return this.snapshot
    }

    this.snapshot = {
      ...this.snapshot,
      webPanels: {
        ...this.snapshot.webPanels,
        [panelId]: config
      }
    }

    this.writeSettings(this.snapshot)
    return this.snapshot
  }

  private readSettings(): AppSettingsSnapshot {
    try {
      if (!existsSync(this.filePath)) {
        this.writeSettings(defaultAppSettings)
        return defaultAppSettings
      }

      const raw = readFileSync(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<AppSettingsSnapshot>

      return {
        ...defaultAppSettings,
        ...parsed,
        theme: parsed.theme ?? defaultAppSettings.theme,
        workspaceRoot: parsed.workspaceRoot ?? defaultAppSettings.workspaceRoot,
        terminalPreludeCommands: parsed.terminalPreludeCommands ?? defaultAppSettings.terminalPreludeCommands,
        threadContinuationPreference: normalizeThreadContinuationPreference(parsed.threadContinuationPreference),
        cliRetrievalPreference: normalizeCliRetrievalPreference(parsed.cliRetrievalPreference),
        webPanels: parsed.webPanels ?? defaultAppSettings.webPanels,
        customWebPanels: parsed.customWebPanels ?? defaultAppSettings.customWebPanels,
        customTerminalPanels: parsed.customTerminalPanels ?? defaultAppSettings.customTerminalPanels
      }
    } catch {
      this.writeSettings(defaultAppSettings)
      return defaultAppSettings
    }
  }

  private writeSettings(snapshot: AppSettingsSnapshot): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(snapshot, null, 2), 'utf8')
  }
}
