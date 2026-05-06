export type LanguagePreference = 'system' | 'zh-CN' | 'en-US'
export type ThemePreference = 'system' | 'light' | 'dark'
export type ThreadContinuationPreference = 'continue-active-thread' | 'start-new-thread-per-scope'
export type CliRetrievalPreference = 'thread-first' | 'global-first'
export type RemoteBridgeIntakeMode = 'polling'
export type RemoteBridgeTargetMode = 'pty' | 'codex-exec' | 'codex-app-server'

export const DEFAULT_TERMINAL_SCROLLBACK_LINES = 1000
export const MIN_TERMINAL_SCROLLBACK_LINES = 100
export const MAX_TERMINAL_SCROLLBACK_LINES = 50000
export const DEFAULT_REMOTE_BRIDGE_LOCK_TIMEOUT_MS = 15 * 60 * 1000
export const DEFAULT_REMOTE_BRIDGE_LOCAL_ACTIVITY_BLOCK_MS = 20 * 1000
export const DEFAULT_REMOTE_BRIDGE_MAX_TAIL_CHARACTERS = 12000
export const DEFAULT_REMOTE_BRIDGE_MAX_MESSAGE_CHARACTERS = 3800
export const DEFAULT_REMOTE_BRIDGE_OUTPUT_DEBOUNCE_MS = 1200
export const DEFAULT_REMOTE_BRIDGE_POLLING_INTERVAL_MS = 5000
export const DEFAULT_REMOTE_BRIDGE_API_BASE = 'https://open.feishu.cn/open-apis'
export const MIN_REMOTE_BRIDGE_LOCK_TIMEOUT_MS = 30 * 1000
export const MAX_REMOTE_BRIDGE_LOCK_TIMEOUT_MS = 8 * 60 * 60 * 1000
export const MIN_REMOTE_BRIDGE_OUTPUT_CHARACTERS = 500
export const MAX_REMOTE_BRIDGE_OUTPUT_CHARACTERS = 50000
export const MIN_REMOTE_BRIDGE_OUTPUT_DEBOUNCE_MS = 250
export const MAX_REMOTE_BRIDGE_OUTPUT_DEBOUNCE_MS = 30 * 1000
export const MIN_REMOTE_BRIDGE_POLLING_INTERVAL_MS = 1000
export const MAX_REMOTE_BRIDGE_POLLING_INTERVAL_MS = 60 * 1000

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

export interface FeishuRemoteBridgeCredentials {
  appId: string
  appSecret: string
  verificationToken: string
  encryptKey: string
}

export interface RemoteBridgeOutputSettings {
  maxTailCharacters: number
  maxMessageCharacters: number
  debounceMs: number
  proactiveDelivery: boolean
}

export interface RemoteBridgeLockSettings {
  timeoutMs: number
  localActivityBlockMs: number
  allowLockOwnerDuringLocalActivity: boolean
}

export interface RemoteBridgeSettings {
  enabled: boolean
  intakeMode: RemoteBridgeIntakeMode
  targetMode: RemoteBridgeTargetMode
  apiBase: string
  pollingIntervalMs: number
  credentials: FeishuRemoteBridgeCredentials
  allowedChatIds: string[]
  allowedUserIds: string[]
  adminUserIds: string[]
  enabledPanelIds: string[]
  defaultPanelId: string
  output: RemoteBridgeOutputSettings
  lock: RemoteBridgeLockSettings
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
  remoteBridge: RemoteBridgeSettings
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
  remoteBridge?: Partial<RemoteBridgeSettings>
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

function normalizeSettingsText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeUrlText(value: unknown, fallback: string): string {
  const text = normalizeSettingsText(value)
  if (!text) {
    return fallback
  }

  try {
    const url = new URL(text)
    if (url.protocol !== 'https:') {
      return fallback
    }
    return url.toString().replace(/\/+$/u, '')
  } catch {
    return fallback
  }
}

function normalizeUniqueStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalizedItems: string[] = []
  const seenItems = new Set<string>()

  for (const item of value) {
    const normalized = normalizeSettingsText(item)
    if (!normalized || seenItems.has(normalized)) {
      continue
    }

    seenItems.add(normalized)
    normalizedItems.push(normalized)
  }

  return normalizedItems
}

function normalizeRemoteBridgeCredentials(value: unknown): FeishuRemoteBridgeCredentials {
  const rawValue =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<FeishuRemoteBridgeCredentials>) : {}

  return {
    appId: normalizeSettingsText(rawValue.appId),
    appSecret: normalizeSettingsText(rawValue.appSecret),
    verificationToken: normalizeSettingsText(rawValue.verificationToken),
    encryptKey: normalizeSettingsText(rawValue.encryptKey)
  }
}

function normalizeRemoteBridgeOutputSettings(value: unknown): RemoteBridgeOutputSettings {
  const rawValue =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<RemoteBridgeOutputSettings>) : {}

  return {
    maxTailCharacters: normalizeIntegerInRange(
      rawValue.maxTailCharacters,
      defaultRemoteBridgeOutputSettings.maxTailCharacters,
      MIN_REMOTE_BRIDGE_OUTPUT_CHARACTERS,
      MAX_REMOTE_BRIDGE_OUTPUT_CHARACTERS
    ),
    maxMessageCharacters: normalizeIntegerInRange(
      rawValue.maxMessageCharacters,
      defaultRemoteBridgeOutputSettings.maxMessageCharacters,
      MIN_REMOTE_BRIDGE_OUTPUT_CHARACTERS,
      MAX_REMOTE_BRIDGE_OUTPUT_CHARACTERS
    ),
    debounceMs: normalizeIntegerInRange(
      rawValue.debounceMs,
      defaultRemoteBridgeOutputSettings.debounceMs,
      MIN_REMOTE_BRIDGE_OUTPUT_DEBOUNCE_MS,
      MAX_REMOTE_BRIDGE_OUTPUT_DEBOUNCE_MS
    ),
    proactiveDelivery: normalizeBoolean(rawValue.proactiveDelivery, defaultRemoteBridgeOutputSettings.proactiveDelivery)
  }
}

function normalizeRemoteBridgeLockSettings(value: unknown): RemoteBridgeLockSettings {
  const rawValue =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<RemoteBridgeLockSettings>) : {}

  return {
    timeoutMs: normalizeIntegerInRange(
      rawValue.timeoutMs,
      defaultRemoteBridgeLockSettings.timeoutMs,
      MIN_REMOTE_BRIDGE_LOCK_TIMEOUT_MS,
      MAX_REMOTE_BRIDGE_LOCK_TIMEOUT_MS
    ),
    localActivityBlockMs: normalizeIntegerInRange(
      rawValue.localActivityBlockMs,
      defaultRemoteBridgeLockSettings.localActivityBlockMs,
      0,
      MAX_REMOTE_BRIDGE_LOCK_TIMEOUT_MS
    ),
    allowLockOwnerDuringLocalActivity: normalizeBoolean(
      rawValue.allowLockOwnerDuringLocalActivity,
      defaultRemoteBridgeLockSettings.allowLockOwnerDuringLocalActivity
    )
  }
}

export function normalizeRemoteBridgeTargetMode(value: unknown): RemoteBridgeTargetMode {
  if (value === 'codex-exec') {
    return 'codex-exec'
  }
  return value === 'codex-app-server' ? 'codex-app-server' : 'pty'
}

export function normalizeRemoteBridgeSettings(value: unknown): RemoteBridgeSettings {
  const rawValue =
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<RemoteBridgeSettings>) : {}
  const enabledPanelIds = normalizeUniqueStringList(rawValue.enabledPanelIds)
  const defaultPanelId = normalizeSettingsText(rawValue.defaultPanelId)

  return {
    enabled: normalizeBoolean(rawValue.enabled, false),
    intakeMode: 'polling',
    targetMode: normalizeRemoteBridgeTargetMode(rawValue.targetMode),
    apiBase: normalizeUrlText(rawValue.apiBase, defaultRemoteBridgeSettings.apiBase),
    pollingIntervalMs: normalizeIntegerInRange(
      rawValue.pollingIntervalMs,
      defaultRemoteBridgeSettings.pollingIntervalMs,
      MIN_REMOTE_BRIDGE_POLLING_INTERVAL_MS,
      MAX_REMOTE_BRIDGE_POLLING_INTERVAL_MS
    ),
    credentials: normalizeRemoteBridgeCredentials(rawValue.credentials),
    allowedChatIds: normalizeUniqueStringList(rawValue.allowedChatIds),
    allowedUserIds: normalizeUniqueStringList(rawValue.allowedUserIds),
    adminUserIds: normalizeUniqueStringList(rawValue.adminUserIds),
    enabledPanelIds:
      enabledPanelIds.length > 0 ? enabledPanelIds : defaultRemoteBridgeSettings.enabledPanelIds,
    defaultPanelId: defaultPanelId || defaultRemoteBridgeSettings.defaultPanelId,
    output: normalizeRemoteBridgeOutputSettings(rawValue.output),
    lock: normalizeRemoteBridgeLockSettings(rawValue.lock)
  }
}

export function validateRemoteBridgeSettings(
  settings: RemoteBridgeSettings,
  availablePanelIds: ReadonlySet<string> | readonly string[] = []
): string[] {
  if (!settings.enabled) {
    return []
  }

  const errors: string[] = []
  const panelIds: ReadonlySet<string> = Array.isArray(availablePanelIds)
    ? new Set(availablePanelIds)
    : (availablePanelIds as ReadonlySet<string>)

  if (!settings.credentials.appId) {
    errors.push('Feishu app id is required when the remote bridge is enabled.')
  }
  if (!settings.credentials.appSecret) {
    errors.push('Feishu app secret is required when the remote bridge is enabled.')
  }
  if (settings.allowedChatIds.length === 0) {
    errors.push('At least one allowed Feishu chat id is required when the remote bridge is enabled.')
  }
  if (settings.allowedUserIds.length === 0) {
    errors.push('At least one allowed Feishu user id is required when the remote bridge is enabled.')
  }
  if (settings.enabledPanelIds.length === 0) {
    errors.push('At least one remote-enabled terminal panel is required when the remote bridge is enabled.')
  }
  if (!settings.enabledPanelIds.includes(settings.defaultPanelId)) {
    errors.push('The default remote bridge panel must be included in enabledPanelIds.')
  }
  if (panelIds.size > 0) {
    for (const panelId of settings.enabledPanelIds) {
      if (!panelIds.has(panelId)) {
        errors.push(`Remote bridge panel is unavailable: ${panelId}`)
      }
    }
  }

  return errors
}

export function isRemoteBridgeReady(settings: RemoteBridgeSettings, availablePanelIds: ReadonlySet<string> | readonly string[] = []): boolean {
  return settings.enabled && validateRemoteBridgeSettings(settings, availablePanelIds).length === 0
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

export const defaultRemoteBridgeOutputSettings: RemoteBridgeOutputSettings = {
  maxTailCharacters: DEFAULT_REMOTE_BRIDGE_MAX_TAIL_CHARACTERS,
  maxMessageCharacters: DEFAULT_REMOTE_BRIDGE_MAX_MESSAGE_CHARACTERS,
  debounceMs: DEFAULT_REMOTE_BRIDGE_OUTPUT_DEBOUNCE_MS,
  proactiveDelivery: false
}

export const defaultRemoteBridgeLockSettings: RemoteBridgeLockSettings = {
  timeoutMs: DEFAULT_REMOTE_BRIDGE_LOCK_TIMEOUT_MS,
  localActivityBlockMs: DEFAULT_REMOTE_BRIDGE_LOCAL_ACTIVITY_BLOCK_MS,
  allowLockOwnerDuringLocalActivity: false
}

export const defaultRemoteBridgeSettings: RemoteBridgeSettings = {
  enabled: false,
  intakeMode: 'polling',
  targetMode: 'pty',
  apiBase: DEFAULT_REMOTE_BRIDGE_API_BASE,
  pollingIntervalMs: DEFAULT_REMOTE_BRIDGE_POLLING_INTERVAL_MS,
  credentials: {
    appId: '',
    appSecret: '',
    verificationToken: '',
    encryptKey: ''
  },
  allowedChatIds: [],
  allowedUserIds: [],
  adminUserIds: [],
  enabledPanelIds: ['codex-cli'],
  defaultPanelId: 'codex-cli',
  output: defaultRemoteBridgeOutputSettings,
  lock: defaultRemoteBridgeLockSettings
}

export const defaultAppSettings: AppSettingsSnapshot = {
  language: 'system',
  theme: 'system',
  workspaceRoot: null,
  workspaceProfiles: [],
  defaultWorkspaceProfileId: null,
  terminalPreludeCommands: ['proxy_on'],
  terminalBehavior: defaultTerminalBehaviorSettings,
  remoteBridge: defaultRemoteBridgeSettings,
  threadContinuationPreference: 'continue-active-thread',
  cliRetrievalPreference: 'thread-first',
  webPanels: {},
  builtInTerminalPanels: {},
  customWebPanels: [],
  customTerminalPanels: []
}
