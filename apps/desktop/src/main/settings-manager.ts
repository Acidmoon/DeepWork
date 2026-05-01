import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getWebPanelConfig, normalizeWebPanelUrl, webPanelConfigs, type WebPanelConfig } from '@ai-workbench/core/desktop/web-panels'
import { terminalPanelConfigs } from '@ai-workbench/core/desktop/terminal-panels'
import type {
  AppSettingsSnapshot,
  AppSettingsUpdate,
  BuiltInTerminalPanelSettings,
  CustomTerminalPanelSettings,
  CustomWebPanelSettings,
  StoredWebPanelSettings
} from '@ai-workbench/core/desktop/settings'
import {
  defaultAppSettings,
  normalizeCliRetrievalPreference,
  normalizeTerminalBehaviorSettings,
  normalizeThreadContinuationPreference,
  normalizeWorkspaceProfileRoot,
  normalizeWorkspaceProfiles
} from '@ai-workbench/core/desktop/settings'

const BUILT_IN_PANEL_IDS = new Set([...webPanelConfigs, ...terminalPanelConfigs].map((panel) => panel.id))

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

function normalizeWebPanelHomeUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const result = normalizeWebPanelUrl(value)
  return result.ok ? result.url : null
}

function normalizeBuiltInWebPanels(value: unknown): Record<string, StoredWebPanelSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const entries: Array<[string, StoredWebPanelSettings]> = []

  for (const [panelId, rawConfig] of Object.entries(value as Record<string, unknown>)) {
    const baseConfig = getWebPanelConfig(panelId)
    if (!baseConfig || !rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
      continue
    }

    const rawSettings = rawConfig as Partial<StoredWebPanelSettings>
    const homeUrl = normalizeWebPanelHomeUrl(rawSettings.homeUrl ?? baseConfig.homeUrl)
    if (!homeUrl) {
      continue
    }

    entries.push([
      panelId,
      {
        homeUrl,
        partition: normalizeNonEmptyString(rawSettings.partition) ?? baseConfig.partition,
        enabled: typeof rawSettings.enabled === 'boolean' ? rawSettings.enabled : baseConfig.enabled
      }
    ])
  }

  return Object.fromEntries(entries)
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

function normalizeCustomWebPanels(value: unknown, reservedIds: Set<string> = BUILT_IN_PANEL_IDS): CustomWebPanelSettings[] {
  if (!Array.isArray(value)) {
    return []
  }

  const panels: CustomWebPanelSettings[] = []
  const seenIds = new Set<string>()

  for (const rawPanel of value) {
    if (!rawPanel || typeof rawPanel !== 'object' || Array.isArray(rawPanel)) {
      continue
    }

    const id = normalizeNonEmptyString((rawPanel as CustomWebPanelSettings).id)
    const title = normalizeNonEmptyString((rawPanel as CustomWebPanelSettings).title)
    const sectionId = normalizeNonEmptyString((rawPanel as CustomWebPanelSettings).sectionId)
    const homeUrl = normalizeWebPanelHomeUrl((rawPanel as CustomWebPanelSettings).homeUrl)
    const enabled = (rawPanel as Partial<CustomWebPanelSettings>).enabled

    if (!id || !title || !sectionId || !homeUrl || typeof enabled !== 'boolean') {
      continue
    }

    if (reservedIds.has(id) || seenIds.has(id)) {
      continue
    }

    seenIds.add(id)
    panels.push({
      id,
      title,
      sectionId,
      homeUrl,
      partition: normalizeNonEmptyString((rawPanel as CustomWebPanelSettings).partition) ?? `persist:${id}`,
      enabled
    })
  }

  return panels
}

function normalizeCustomTerminalPanels(
  value: unknown,
  reservedIds: Set<string> = BUILT_IN_PANEL_IDS
): CustomTerminalPanelSettings[] {
  if (!Array.isArray(value)) {
    return []
  }

  const panels: CustomTerminalPanelSettings[] = []
  const seenIds = new Set<string>()

  for (const rawPanel of value) {
    if (!rawPanel || typeof rawPanel !== 'object' || Array.isArray(rawPanel)) {
      continue
    }

    const id = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).id)
    const title = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).title)
    const sectionId = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).sectionId)
    const shell = normalizeNonEmptyString((rawPanel as CustomTerminalPanelSettings).shell)

    if (!id || !title || !sectionId || !shell || reservedIds.has(id) || seenIds.has(id)) {
      continue
    }

    seenIds.add(id)
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
    const homeUrl = normalizeWebPanelHomeUrl(config.homeUrl)
    if (!homeUrl) {
      return this.snapshot
    }

    const normalizedConfig = {
      homeUrl,
      partition: normalizeNonEmptyString(config.partition) ?? `persist:${panelId}`,
      enabled: config.enabled === true
    }
    const customIndex = this.snapshot.customWebPanels.findIndex((panel) => panel.id === panelId)
    if (customIndex >= 0) {
      const nextCustomPanels = [...this.snapshot.customWebPanels]
      nextCustomPanels[customIndex] = {
        ...nextCustomPanels[customIndex],
        ...normalizedConfig
      }

      this.snapshot = this.normalizeSettingsSnapshot({
        ...this.snapshot,
        customWebPanels: nextCustomPanels
      })

      this.writeSettings(this.snapshot)
      return this.snapshot
    }

    if (!getWebPanelConfig(panelId)) {
      return this.snapshot
    }

    this.snapshot = this.normalizeSettingsSnapshot({
      ...this.snapshot,
      webPanels: {
        ...this.snapshot.webPanels,
        [panelId]: normalizedConfig
      }
    })

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
    const customWebPanels = normalizeCustomWebPanels(value.customWebPanels)
    const customTerminalReservedIds = new Set([...BUILT_IN_PANEL_IDS, ...customWebPanels.map((panel) => panel.id)])

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
      webPanels: normalizeBuiltInWebPanels(value.webPanels),
      builtInTerminalPanels: normalizeBuiltInTerminalPanels(value.builtInTerminalPanels),
      customWebPanels,
      customTerminalPanels: normalizeCustomTerminalPanels(value.customTerminalPanels, customTerminalReservedIds)
    }
  }

  private writeSettings(snapshot: AppSettingsSnapshot): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(snapshot, null, 2), 'utf8')
  }
}
