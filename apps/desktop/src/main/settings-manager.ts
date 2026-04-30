import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { WebPanelConfig } from '@ai-workbench/core/desktop/web-panels'
import type {
  AppSettingsSnapshot,
  AppSettingsUpdate,
  BuiltInTerminalPanelSettings,
  CustomTerminalPanelSettings
} from '@ai-workbench/core/desktop/settings'
import {
  defaultAppSettings,
  normalizeCliRetrievalPreference,
  normalizeTerminalBehaviorSettings,
  normalizeThreadContinuationPreference,
  normalizeWorkspaceProfileRoot,
  normalizeWorkspaceProfiles
} from '@ai-workbench/core/desktop/settings'

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function normalizeWorkspaceRoot(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedRoot = normalizeWorkspaceProfileRoot(value)
  return normalizedRoot.length > 0 ? normalizedRoot : null
}

function normalizeBuiltInTerminalPanels(value: unknown): Record<string, BuiltInTerminalPanelSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const entries: Array<[string, BuiltInTerminalPanelSettings]> = []

  for (const [panelId, rawConfig] of Object.entries(value as Record<string, unknown>)) {
    if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
      continue
    }

    const cwd = normalizeNonEmptyString((rawConfig as BuiltInTerminalPanelSettings).cwd)
    const startupCommand = normalizeNonEmptyString((rawConfig as BuiltInTerminalPanelSettings).startupCommand)

    if (!cwd && !startupCommand) {
      continue
    }

    entries.push([
      panelId,
      {
        ...(cwd ? { cwd } : {}),
        ...(startupCommand ? { startupCommand } : {})
      }
    ])
  }

  return Object.fromEntries(entries)
}

function normalizeCustomTerminalPanels(value: unknown): CustomTerminalPanelSettings[] {
  if (!Array.isArray(value)) {
    return []
  }

  const panels: CustomTerminalPanelSettings[] = []

  for (const rawPanel of value) {
    if (!rawPanel || typeof rawPanel !== 'object' || Array.isArray(rawPanel)) {
      continue
    }

    const id = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).id)
    const title = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).title)
    const sectionId = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).sectionId)
    const shell = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).shell)

    if (!id || !title || !sectionId || !shell) {
      continue
    }

    const shellArgs = normalizeStringList((rawPanel as CustomTerminalPanelSettings).shellArgs)
    const cwd = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).cwd)

    panels.push({
      id,
      title,
      sectionId,
      shell,
      shellArgs,
      ...(cwd ? { cwd } : {}),
      startupCommand:
        typeof (rawPanel as CustomTerminalPanelSettings).startupCommand === 'string'
          ? (rawPanel as CustomTerminalPanelSettings).startupCommand.trim()
          : ''
    })
  }

  return panels
}

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
    this.snapshot = this.normalizeSettingsSnapshot({
      ...this.snapshot,
      ...update,
      terminalBehavior: update.terminalBehavior
        ? {
            ...this.snapshot.terminalBehavior,
            ...update.terminalBehavior
          }
        : this.snapshot.terminalBehavior
    })

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

      return this.normalizeSettingsSnapshot(parsed)
    } catch {
      this.writeSettings(defaultAppSettings)
      return defaultAppSettings
    }
  }

  private normalizeSettingsSnapshot(value: Partial<AppSettingsSnapshot>): AppSettingsSnapshot {
    const profileState = normalizeWorkspaceProfiles(value.workspaceProfiles, value.defaultWorkspaceProfileId)

    return {
      ...defaultAppSettings,
      ...value,
      language: value.language ?? defaultAppSettings.language,
      theme: value.theme ?? defaultAppSettings.theme,
      workspaceRoot: normalizeWorkspaceRoot(value.workspaceRoot),
      workspaceProfiles: profileState.workspaceProfiles,
      defaultWorkspaceProfileId: profileState.defaultWorkspaceProfileId,
      terminalPreludeCommands: Array.isArray(value.terminalPreludeCommands)
        ? normalizeStringList(value.terminalPreludeCommands)
        : defaultAppSettings.terminalPreludeCommands,
      terminalBehavior: normalizeTerminalBehaviorSettings(value.terminalBehavior),
      threadContinuationPreference: normalizeThreadContinuationPreference(value.threadContinuationPreference),
      cliRetrievalPreference: normalizeCliRetrievalPreference(value.cliRetrievalPreference),
      webPanels: value.webPanels ?? defaultAppSettings.webPanels,
      builtInTerminalPanels: normalizeBuiltInTerminalPanels(value.builtInTerminalPanels),
      customWebPanels: value.customWebPanels ?? defaultAppSettings.customWebPanels,
      customTerminalPanels: normalizeCustomTerminalPanels(value.customTerminalPanels)
    }
  }

  private writeSettings(snapshot: AppSettingsSnapshot): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(snapshot, null, 2), 'utf8')
  }
}
