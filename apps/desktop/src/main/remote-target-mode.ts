import type { RemoteBridgeSettings, RemoteBridgeTargetMode } from '@ai-workbench/core/desktop/settings'
import { normalizeRemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'

export interface RemoteConversationTarget {
  chatId: string
  panelId: string
  mode: RemoteBridgeTargetMode
  updatedAt: string
}

export interface RemoteTargetModeSelectionResult {
  ok: boolean
  target: RemoteConversationTarget | null
  error: string | null
}

export class RemoteTargetModeRegistry {
  private readonly targets = new Map<string, RemoteConversationTarget>()

  constructor(
    private readonly defaultPanelId: string,
    private readonly defaultMode: RemoteBridgeTargetMode,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  getTarget(chatId: string): RemoteConversationTarget {
    const existing = this.targets.get(chatId)
    if (existing) {
      return existing
    }

    const target = {
      chatId,
      panelId: this.defaultPanelId,
      mode: this.defaultMode,
      updatedAt: this.now()
    }
    this.targets.set(chatId, target)
    return target
  }

  selectMode(chatId: string, mode: RemoteBridgeTargetMode, authorized: boolean): RemoteTargetModeSelectionResult {
    if (!authorized) {
      return {
        ok: false,
        target: this.getTarget(chatId),
        error: 'Only an authorized remote actor can change target mode.'
      }
    }

    const existing = this.getTarget(chatId)
    const target = {
      ...existing,
      mode,
      updatedAt: this.now()
    }
    this.targets.set(chatId, target)
    return {
      ok: true,
      target,
      error: null
    }
  }

  resolveForMessage(chatId: string, requestedMode: RemoteBridgeTargetMode | null = null): RemoteTargetModeSelectionResult {
    const existing = this.getTarget(chatId)
    if (requestedMode && requestedMode !== existing.mode) {
      return {
        ok: false,
        target: existing,
        error: 'Remote target mode changes require an explicit authorized command or configuration update.'
      }
    }

    return {
      ok: true,
      target: existing,
      error: null
    }
  }
}

export function rollbackStructuredMode(settings: RemoteBridgeSettings): RemoteBridgeSettings {
  return normalizeRemoteBridgeSettings({
    ...settings,
    targetMode: 'pty',
    defaultPanelId: settings.defaultPanelId,
    enabledPanelIds: settings.enabledPanelIds
  })
}
