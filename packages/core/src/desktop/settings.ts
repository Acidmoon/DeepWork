export type LanguagePreference = 'system' | 'zh-CN' | 'en-US'
export type ThemePreference = 'system' | 'light' | 'dark'
export type ThreadContinuationPreference = 'continue-active-thread' | 'start-new-thread-per-scope'
export type CliRetrievalPreference = 'thread-first' | 'global-first'

export const DEFAULT_TERMINAL_SCROLLBACK_LINES = 1000
export const MIN_TERMINAL_SCROLLBACK_LINES = 100
export const MAX_TERMINAL_SCROLLBACK_LINES = 50000

export interface WorkspaceProfileSettings {
  id: string
  name: string
  root: string
  createdAt: string
  lastUsedAt: string
}

export interface CustomWebPanelSettings {
  id: string
  title: string
  sectionId: string
  homeUrl: string
  partition: string
  enabled: boolean
}

export interface CustomTerminalPanelSettings {
  id: string
  title: string
  sectionId: string
  shell: string
  shellArgs: string[]
  cwd?: string
  startupCommand: string
}

export interface BuiltInTerminalPanelSettings {
  cwd?: string
  startupCommand?: string
}

export interface TerminalBehaviorSettings {
  scrollbackLines: number
  copyOnSelection: boolean
  confirmMultilinePaste: boolean
}

export interface StoredWebPanelSettings {
  homeUrl: string
  partition: string
  enabled: boolean
}

export interface AppSettingsSnapshot {
  language: LanguagePreference
  theme: ThemePreference
  workspaceRoot: string | null
  workspaceProfiles: WorkspaceProfileSettings[]
  defaultWorkspaceProfileId: string | null
  terminalPreludeCommands: string[]
  terminalBehavior: TerminalBehaviorSettings
  threadContinuationPreference: ThreadContinuationPreference
  cliRetrievalPreference: CliRetrievalPreference
  webPanels: Record<string, StoredWebPanelSettings>
  builtInTerminalPanels: Record<string, BuiltInTerminalPanelSettings>
  customWebPanels: CustomWebPanelSettings[]
  customTerminalPanels: CustomTerminalPanelSettings[]
}

export interface AppSettingsUpdate {
  language?: LanguagePreference
  theme?: ThemePreference
  workspaceRoot?: string | null
  workspaceProfiles?: WorkspaceProfileSettings[]
  defaultWorkspaceProfileId?: string | null
  terminalPreludeCommands?: string[]
  terminalBehavior?: Partial<TerminalBehaviorSettings>
  threadContinuationPreference?: ThreadContinuationPreference
  cliRetrievalPreference?: CliRetrievalPreference
  webPanels?: Record<string, StoredWebPanelSettings>
  builtInTerminalPanels?: Record<string, BuiltInTerminalPanelSettings>
  customWebPanels?: CustomWebPanelSettings[]
  customTerminalPanels?: CustomTerminalPanelSettings[]
}

export function normalizeThreadContinuationPreference(value: unknown): ThreadContinuationPreference {
  return value === 'start-new-thread-per-scope' ? 'start-new-thread-per-scope' : 'continue-active-thread'
}

export function normalizeCliRetrievalPreference(value: unknown): CliRetrievalPreference {
  return value === 'global-first' ? 'global-first' : 'thread-first'
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeIntegerInRange(value: unknown, fallback: number, min: number, max: number): number {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numberValue)))
}

export function normalizeTerminalBehaviorSettings(value: unknown): TerminalBehaviorSettings {
  const rawValue = value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<TerminalBehaviorSettings>) : {}

  return {
    scrollbackLines: normalizeIntegerInRange(
      rawValue.scrollbackLines,
      defaultTerminalBehaviorSettings.scrollbackLines,
      MIN_TERMINAL_SCROLLBACK_LINES,
      MAX_TERMINAL_SCROLLBACK_LINES
    ),
    copyOnSelection: normalizeBoolean(rawValue.copyOnSelection, defaultTerminalBehaviorSettings.copyOnSelection),
    confirmMultilinePaste: normalizeBoolean(
      rawValue.confirmMultilinePaste,
      defaultTerminalBehaviorSettings.confirmMultilinePaste
    )
  }
}

export function normalizeWorkspaceProfileRoot(root: string): string {
  return root.trim().replace(/[\\/]+$/, '')
}

export function normalizeWorkspaceProfileKey(root: string): string {
  return normalizeWorkspaceProfileRoot(root).toLocaleLowerCase()
}

export function getWorkspaceProfileNameFromRoot(root: string): string {
  const normalizedRoot = normalizeWorkspaceProfileRoot(root)
  const parts = normalizedRoot.split(/[\\/]+/).filter(Boolean)
  return parts.at(-1) ?? normalizedRoot
}

function normalizeWorkspaceProfileText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function createWorkspaceProfile(
  root: string,
  now: string,
  name: string = getWorkspaceProfileNameFromRoot(root)
): WorkspaceProfileSettings | null {
  const normalizedRoot = normalizeWorkspaceProfileRoot(root)
  const normalizedName = normalizeWorkspaceProfileText(name)

  if (!normalizedRoot || !normalizedName) {
    return null
  }

  return {
    id: `workspace-${normalizedWorkspaceProfileId(normalizedRoot)}`,
    name: normalizedName,
    root: normalizedRoot,
    createdAt: now,
    lastUsedAt: now
  }
}

function normalizedWorkspaceProfileId(root: string): string {
  const normalizedRoot = normalizeWorkspaceProfileRoot(root).toLocaleLowerCase()
  const slug = normalizedRoot
    .replace(/^[a-z]:/i, (drive) => drive.slice(0, 1))
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLocaleLowerCase()

  return slug || 'workspace'
}

export function normalizeWorkspaceProfiles(
  value: unknown,
  defaultWorkspaceProfileId: unknown = null
): {
  workspaceProfiles: WorkspaceProfileSettings[]
  defaultWorkspaceProfileId: string | null
} {
  if (!Array.isArray(value)) {
    return {
      workspaceProfiles: [],
      defaultWorkspaceProfileId: null
    }
  }

  const profiles: WorkspaceProfileSettings[] = []
  const seenRoots = new Set<string>()
  const seenIds = new Set<string>()

  for (const rawProfile of value) {
    if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) {
      continue
    }

    const profile = rawProfile as Partial<WorkspaceProfileSettings>
    const root = normalizeWorkspaceProfileText(profile.root)
    if (!root) {
      continue
    }

    const normalizedRoot = normalizeWorkspaceProfileRoot(root)
    const rootKey = normalizeWorkspaceProfileKey(normalizedRoot)
    if (seenRoots.has(rootKey)) {
      continue
    }

    const rawId = normalizeWorkspaceProfileText(profile.id)
    const fallbackId = `workspace-${normalizedWorkspaceProfileId(normalizedRoot)}`
    let id = rawId ?? fallbackId
    let suffix = 2
    while (seenIds.has(id)) {
      id = `${fallbackId}-${suffix}`
      suffix += 1
    }

    const name = normalizeWorkspaceProfileText(profile.name) ?? getWorkspaceProfileNameFromRoot(normalizedRoot)
    const createdAt = normalizeWorkspaceProfileText(profile.createdAt) ?? normalizeWorkspaceProfileText(profile.lastUsedAt) ?? ''
    const lastUsedAt = normalizeWorkspaceProfileText(profile.lastUsedAt) ?? createdAt

    profiles.push({
      id,
      name,
      root: normalizedRoot,
      createdAt,
      lastUsedAt
    })
    seenRoots.add(rootKey)
    seenIds.add(id)
  }

  const requestedDefaultId = normalizeWorkspaceProfileText(defaultWorkspaceProfileId)
  const normalizedDefaultId =
    requestedDefaultId && profiles.some((profile) => profile.id === requestedDefaultId) ? requestedDefaultId : null

  return {
    workspaceProfiles: profiles,
    defaultWorkspaceProfileId: normalizedDefaultId
  }
}

export function resolveStartupWorkspaceRoot(settings: Pick<AppSettingsSnapshot, 'workspaceRoot' | 'workspaceProfiles' | 'defaultWorkspaceProfileId'>): string | null {
  const defaultProfile =
    settings.defaultWorkspaceProfileId === null
      ? null
      : settings.workspaceProfiles.find((profile) => profile.id === settings.defaultWorkspaceProfileId)
  const defaultRoot = defaultProfile?.root ? normalizeWorkspaceProfileRoot(defaultProfile.root) : ''
  const activeRoot = settings.workspaceRoot ? normalizeWorkspaceProfileRoot(settings.workspaceRoot) : ''

  return defaultRoot || activeRoot || null
}

export const defaultTerminalBehaviorSettings: TerminalBehaviorSettings = {
  scrollbackLines: DEFAULT_TERMINAL_SCROLLBACK_LINES,
  copyOnSelection: false,
  confirmMultilinePaste: true
}

export const defaultAppSettings: AppSettingsSnapshot = {
  language: 'system',
  theme: 'system',
  workspaceRoot: null,
  workspaceProfiles: [],
  defaultWorkspaceProfileId: null,
  terminalPreludeCommands: ['proxy_on'],
  terminalBehavior: defaultTerminalBehaviorSettings,
  threadContinuationPreference: 'continue-active-thread',
  cliRetrievalPreference: 'thread-first',
  webPanels: {},
  builtInTerminalPanels: {},
  customWebPanels: [],
  customTerminalPanels: []
}
