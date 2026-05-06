import type {
  TerminalOutputEvent,
  TerminalPanelAttachPayload,
  TerminalPanelSnapshot,
  TerminalPanelStatus
} from '@ai-workbench/core/desktop/terminal-panels'

export type RemoteSessionAdapterMode = 'pty' | 'codex-exec' | 'codex-app-server'
export type RemoteSessionControlAction = 'interrupt'

export interface RemoteSessionActor {
  userId: string
  chatId: string
}

export interface RemoteSessionStatus {
  mode: RemoteSessionAdapterMode
  panelId: string
  title: string
  remoteCapable: boolean
  status: TerminalPanelStatus
  hasSession: boolean
  isRunning: boolean
  pid: number | null
  cwd: string
  bufferSize: number
  launchCount: number
  lastOutputAt: string | null
  lock: RemoteSessionLockState | null
}

export interface RemoteSessionLockState {
  ownerUserId: string
  chatId: string
  acquiredAt: string
  expiresAt: string
}

export interface RemoteSessionWriteResult {
  accepted: boolean
  status: RemoteSessionStatus | null
  error: string | null
  inputLength: number
}

export interface RemoteSessionControlResult {
  issued: boolean
  status: RemoteSessionStatus | null
  error: string | null
}

export interface RemoteSessionLockResult {
  ok: boolean
  status: RemoteSessionStatus | null
  lock: RemoteSessionLockState | null
  error: string | null
}

export interface RemoteSessionTailOptions {
  maxCharacters: number
}

export interface RemoteSessionTailResult {
  panelId: string
  content: string
  truncated: boolean
}

export interface RemoteSessionOutputEvent {
  panelId: string
  data: string
}

export interface RemoteSessionAdapter {
  ensureSession(panelId: string): RemoteSessionStatus | null
  getStatus(panelId: string): RemoteSessionStatus | null
  writeLine(panelId: string, text: string, actor: RemoteSessionActor): RemoteSessionWriteResult
  sendControl(panelId: string, action: RemoteSessionControlAction, actor: RemoteSessionActor): RemoteSessionControlResult
  acquireLock(panelId: string, actor: RemoteSessionActor): RemoteSessionLockResult
  releaseLock(panelId: string, actor: RemoteSessionActor): RemoteSessionLockResult
  tail(panelId: string, options: RemoteSessionTailOptions): RemoteSessionTailResult | null
  subscribeOutput(panelId: string, listener: (event: RemoteSessionOutputEvent) => void): () => void
}

export interface TerminalManagerRemoteHost {
  attach(panelId: string): TerminalPanelAttachPayload | null
  getLastLocalInputAt(panelId: string): string | null
  getSnapshot(panelId: string): TerminalPanelSnapshot | null
  start(panelId: string): TerminalPanelSnapshot | null
  write(panelId: string, data: string, source?: 'local' | 'remote'): void
  subscribeOutput(listener: (event: TerminalOutputEvent) => void): () => void
}

export interface PtyRemoteSessionAdapterOptions {
  lockTimeoutMs?: number
  localActivityBlockMs?: number
  allowLockOwnerDuringLocalActivity?: boolean
  adminUserIds?: readonly string[]
  now?: () => Date
}

export function createRemotePtySubmitSequence(text: string): string {
  const pastedText = text.replace(/\x1b\[200~/gu, '').replace(/\x1b\[201~/gu, '')
  return pastedText ? `\x1b[200~${pastedText}\x1b[201~\r` : '\r'
}

export class PtyRemoteSessionAdapter implements RemoteSessionAdapter {
  private readonly remoteCapablePanelIds: ReadonlySet<string>
  private readonly adminUserIds: ReadonlySet<string>
  private readonly lockTimeoutMs: number
  private readonly localActivityBlockMs: number
  private readonly allowLockOwnerDuringLocalActivity: boolean
  private readonly now: () => Date
  private readonly locks = new Map<string, RemoteSessionLockState>()

  constructor(
    private readonly terminalManager: TerminalManagerRemoteHost,
    remoteCapablePanelIds: readonly string[] = ['codex-cli'],
    options: PtyRemoteSessionAdapterOptions = {}
  ) {
    this.remoteCapablePanelIds = new Set(remoteCapablePanelIds)
    this.adminUserIds = new Set(options.adminUserIds ?? [])
    this.lockTimeoutMs = Math.max(0, Math.floor(options.lockTimeoutMs ?? 15 * 60 * 1000))
    this.localActivityBlockMs = Math.max(0, Math.floor(options.localActivityBlockMs ?? 20 * 1000))
    this.allowLockOwnerDuringLocalActivity = options.allowLockOwnerDuringLocalActivity === true
    this.now = options.now ?? (() => new Date())
  }

  ensureSession(panelId: string): RemoteSessionStatus | null {
    if (!this.isRemoteCapable(panelId)) {
      return null
    }

    const currentSnapshot = this.terminalManager.getSnapshot(panelId)
    const snapshot = currentSnapshot?.isRunning ? currentSnapshot : this.terminalManager.start(panelId)
    return this.toRemoteStatus(snapshot)
  }

  getStatus(panelId: string): RemoteSessionStatus | null {
    return this.toRemoteStatus(this.terminalManager.getSnapshot(panelId))
  }

  writeLine(panelId: string, text: string, _actor: RemoteSessionActor): RemoteSessionWriteResult {
    const status = this.getStatus(panelId)
    if (!status?.remoteCapable) {
      return {
        accepted: false,
        status,
        error: 'Remote PTY access is not enabled for this panel.',
        inputLength: text.length
      }
    }
    const activeLock = this.getActiveLock(panelId)
    if (activeLock && !this.isLockOwner(activeLock, _actor)) {
      return {
        accepted: false,
        status,
        error: 'Remote PTY session is locked by another remote actor.',
        inputLength: text.length
      }
    }
    if (this.isLocalActivityBlocking(panelId, _actor, activeLock)) {
      return {
        accepted: false,
        status,
        error: 'Local terminal input is active; remote text input is temporarily blocked.',
        inputLength: text.length
      }
    }

    if (!status.isRunning) {
      return {
        accepted: false,
        status,
        error: 'Remote PTY session is not running.',
        inputLength: text.length
      }
    }

    this.terminalManager.write(panelId, createRemotePtySubmitSequence(text), 'remote')
    return {
      accepted: true,
      status: this.getStatus(panelId),
      error: null,
      inputLength: text.length
    }
  }

  sendControl(
    panelId: string,
    action: RemoteSessionControlAction,
    _actor: RemoteSessionActor
  ): RemoteSessionControlResult {
    const status = this.getStatus(panelId)
    if (!status?.remoteCapable) {
      return {
        issued: false,
        status,
        error: 'Remote PTY access is not enabled for this panel.'
      }
    }
    if (!status.isRunning) {
      return {
        issued: false,
        status,
        error: 'Remote PTY session is not running.'
      }
    }

    switch (action) {
      case 'interrupt':
        this.terminalManager.write(panelId, '\u0003', 'remote')
        return {
          issued: true,
          status: this.getStatus(panelId),
          error: null
        }
    }
  }

  acquireLock(panelId: string, actor: RemoteSessionActor): RemoteSessionLockResult {
    const status = this.getStatus(panelId)
    if (!status?.remoteCapable) {
      return {
        ok: false,
        status,
        lock: null,
        error: 'Remote PTY access is not enabled for this panel.'
      }
    }

    const activeLock = this.getActiveLock(panelId)
    if (activeLock && !this.isLockOwner(activeLock, actor)) {
      return {
        ok: false,
        status,
        lock: activeLock,
        error: 'Remote PTY session is locked by another remote actor.'
      }
    }

    const now = this.now()
    const lock: RemoteSessionLockState = {
      ownerUserId: actor.userId,
      chatId: actor.chatId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.lockTimeoutMs).toISOString()
    }
    this.locks.set(panelId, lock)
    return {
      ok: true,
      status: this.getStatus(panelId),
      lock,
      error: null
    }
  }

  releaseLock(panelId: string, actor: RemoteSessionActor): RemoteSessionLockResult {
    const status = this.getStatus(panelId)
    if (!status?.remoteCapable) {
      return {
        ok: false,
        status,
        lock: null,
        error: 'Remote PTY access is not enabled for this panel.'
      }
    }

    const activeLock = this.getActiveLock(panelId)
    if (!activeLock) {
      return {
        ok: true,
        status,
        lock: null,
        error: null
      }
    }
    if (!this.isLockOwner(activeLock, actor) && !this.adminUserIds.has(actor.userId)) {
      return {
        ok: false,
        status,
        lock: activeLock,
        error: 'Only the lock owner or an administrator can unlock this remote PTY session.'
      }
    }

    this.locks.delete(panelId)
    return {
      ok: true,
      status: this.getStatus(panelId),
      lock: null,
      error: null
    }
  }

  tail(panelId: string, options: RemoteSessionTailOptions): RemoteSessionTailResult | null {
    if (!this.isRemoteCapable(panelId)) {
      return null
    }

    const attached = this.terminalManager.attach(panelId)
    if (!attached) {
      return null
    }

    const maxCharacters = Math.max(0, Math.floor(options.maxCharacters))
    const truncated = attached.buffer.length > maxCharacters
    return {
      panelId,
      content: truncated ? attached.buffer.slice(attached.buffer.length - maxCharacters) : attached.buffer,
      truncated
    }
  }

  subscribeOutput(panelId: string, listener: (event: RemoteSessionOutputEvent) => void): () => void {
    if (!this.isRemoteCapable(panelId)) {
      return () => {}
    }

    return this.terminalManager.subscribeOutput((event) => {
      if (event.panelId === panelId) {
        listener(event)
      }
    })
  }

  private isRemoteCapable(panelId: string): boolean {
    return this.remoteCapablePanelIds.has(panelId)
  }

  private toRemoteStatus(snapshot: TerminalPanelSnapshot | null): RemoteSessionStatus | null {
    if (!snapshot) {
      return null
    }

    return {
      mode: 'pty',
      panelId: snapshot.panelId,
      title: snapshot.title,
      remoteCapable: this.isRemoteCapable(snapshot.panelId),
      status: snapshot.status,
      hasSession: snapshot.hasSession,
      isRunning: snapshot.isRunning,
      pid: snapshot.pid,
      cwd: snapshot.cwd,
      bufferSize: snapshot.bufferSize,
      launchCount: snapshot.launchCount,
      lastOutputAt: snapshot.lastOutputAt,
      lock: this.getActiveLock(snapshot.panelId)
    }
  }

  private getActiveLock(panelId: string): RemoteSessionLockState | null {
    const lock = this.locks.get(panelId)
    if (!lock) {
      return null
    }

    if (Date.parse(lock.expiresAt) <= this.now().getTime()) {
      this.locks.delete(panelId)
      return null
    }

    return lock
  }

  private isLockOwner(lock: RemoteSessionLockState, actor: RemoteSessionActor): boolean {
    return lock.ownerUserId === actor.userId && lock.chatId === actor.chatId
  }

  private isLocalActivityBlocking(
    panelId: string,
    actor: RemoteSessionActor,
    activeLock: RemoteSessionLockState | null
  ): boolean {
    if (this.localActivityBlockMs <= 0) {
      return false
    }

    const lastLocalInputAt = this.terminalManager.getLastLocalInputAt(panelId)
    if (!lastLocalInputAt) {
      return false
    }

    const localInputTime = Date.parse(lastLocalInputAt)
    if (!Number.isFinite(localInputTime) || this.now().getTime() - localInputTime > this.localActivityBlockMs) {
      return false
    }

    return !(activeLock && this.isLockOwner(activeLock, actor) && this.allowLockOwnerDuringLocalActivity)
  }
}
