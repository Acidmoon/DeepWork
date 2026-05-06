import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'
import { normalizeRemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'

export const REMOTE_BRIDGE_CONFIG_FILE_NAME = 'remote-bridge.json'
export const PORTABLE_REMOTE_BRIDGE_CONFIG_FILE_NAME = 'config/remote-bridge.json'
export const LOCAL_PORTABLE_REMOTE_BRIDGE_CONFIG_FILE_NAME = 'config/remote-bridge.local.json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeEnvValue(value: string | undefined): string {
  return value?.trim() ?? ''
}

function findUpwardConfigPath(startDirectory: string, relativeFileName: string): string | null {
  let directory = resolve(startDirectory)

  while (true) {
    const candidate = join(directory, relativeFileName)
    if (existsSync(candidate)) {
      return candidate
    }

    const parent = dirname(directory)
    if (parent === directory) {
      return null
    }
    directory = parent
  }
}

export function resolveRemoteBridgeConfigPath(
  baseDirectory: string,
  overridePath: string | undefined = process.env.DEEPWORK_REMOTE_BRIDGE_CONFIG,
  portableRoot: string = process.cwd()
): string {
  const normalizedOverride = overridePath?.trim()
  if (normalizedOverride) {
    return normalizedOverride
  }

  const localPortablePath = findUpwardConfigPath(portableRoot, LOCAL_PORTABLE_REMOTE_BRIDGE_CONFIG_FILE_NAME)
  if (localPortablePath) {
    return localPortablePath
  }

  const portablePath = findUpwardConfigPath(portableRoot, PORTABLE_REMOTE_BRIDGE_CONFIG_FILE_NAME)
  if (portablePath) {
    return portablePath
  }

  return join(baseDirectory, REMOTE_BRIDGE_CONFIG_FILE_NAME)
}

export function readRemoteBridgeConfigFile(path: string): RemoteBridgeSettings | null {
  if (!existsSync(path)) {
    return null
  }

  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown
  const rawConfig = isRecord(parsed) && isRecord(parsed.remoteBridge) ? parsed.remoteBridge : parsed
  return normalizeRemoteBridgeSettings(rawConfig)
}

export function writeRemoteBridgeConfigFile(path: string, settings: RemoteBridgeSettings): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        remoteBridge: normalizeRemoteBridgeSettings(settings)
      },
      null,
      2
    )}\n`,
    'utf8'
  )
}

export function readFeishuEnvRemoteBridgeConfig(path: string): RemoteBridgeSettings {
  const entries = new Map<string, string>()

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue
    }

    const [key = '', ...rest] = trimmed.split('=')
    entries.set(key.trim(), rest.join('=').trim())
  }

  return normalizeRemoteBridgeSettings({
    enabled: false,
    intakeMode: 'polling',
    targetMode: 'pty',
    apiBase: normalizeEnvValue(entries.get('FEISHU_API_BASE')),
    pollingIntervalMs: normalizeEnvValue(entries.get('FEISHU_POLLING_INTERVAL_MS')),
    credentials: {
      appId: normalizeEnvValue(entries.get('FEISHU_APP_ID')),
      appSecret: normalizeEnvValue(entries.get('FEISHU_APP_SECRET')),
      verificationToken: normalizeEnvValue(entries.get('FEISHU_VERIFICATION_TOKEN')),
      encryptKey: normalizeEnvValue(entries.get('FEISHU_ENCRYPT_KEY'))
    },
    allowedChatIds: [normalizeEnvValue(entries.get('FEISHU_CHAT_ID'))].filter(Boolean),
    allowedUserIds: [normalizeEnvValue(entries.get('ALLOWED_USER_ID'))].filter(Boolean),
    adminUserIds: [normalizeEnvValue(entries.get('ALLOWED_USER_ID'))].filter(Boolean),
    enabledPanelIds: ['codex-cli'],
    defaultPanelId: 'codex-cli',
    output: {
      maxTailCharacters: 12000,
      maxMessageCharacters: 3800,
      debounceMs: 1200,
      proactiveDelivery: false
    },
    lock: {
      timeoutMs: 15 * 60 * 1000,
      localActivityBlockMs: 20 * 1000,
      allowLockOwnerDuringLocalActivity: false
    }
  })
}
