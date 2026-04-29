import { appendFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'
import type { IPty } from 'node-pty'
import * as pty from 'node-pty'
import type {
  BuiltInTerminalPanelSettings,
  CliRetrievalPreference,
  CustomTerminalPanelSettings
} from '@ai-workbench/core/desktop/settings'
import { sanitizeContextLabel, sanitizeOrigin } from '@ai-workbench/core/desktop/workspace'
import {
  applyBuiltInTerminalPanelSettings,
  createCustomTerminalPanelConfig,
  getTerminalPanelConfig,
  terminalPanelConfigs,
  type TerminalOutputEvent,
  type TerminalPanelAttachPayload,
  type TerminalPanelConfig,
  type TerminalPanelSnapshot,
  type TerminalResizePayload
} from '@ai-workbench/core/desktop/terminal-panels'

const DEFAULT_COLS = 120
const DEFAULT_ROWS = 32
const MAX_BUFFER_SIZE = 180_000
const STARTUP_COMMAND_DELAY_MS = 1_600
const TRANSCRIPT_FLUSH_DELAY_MS = 1_200

function psQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

interface ManagedSessionIdentity {
  panelId: string
  title: string
  launchCount: number
  contextLabel: string
  sessionScopeId: string
  threadId: string | null
  threadTitle: string | null
  retrievalAuditPath: string
  retrievalStatePath: string
}

function createManagedSessionIdentity(
  workspaceRoot: string,
  panelId: string,
  title: string,
  launchCount: number,
  contextLabel: string,
  threadIdentity: { threadId: string; title: string } | null = null
): ManagedSessionIdentity {
  const sessionScopeId = `${sanitizeOrigin(panelId)}__${sanitizeContextLabel(contextLabel)}`
  const retrievalDirectory = join(workspaceRoot, 'logs', 'retrieval')

  return {
    panelId,
    title,
    launchCount,
    contextLabel,
    sessionScopeId,
    threadId: threadIdentity?.threadId ?? null,
    threadTitle: threadIdentity?.title ?? null,
    retrievalAuditPath: join(retrievalDirectory, `${sessionScopeId}.jsonl`),
    retrievalStatePath: join(retrievalDirectory, `${sessionScopeId}.pending.json`)
  }
}

function createWorkspaceBootstrap(
  workspaceRoot: string,
  sessionCwd: string,
  sessionIdentity: ManagedSessionIdentity | null = null,
  retrievalPreference: CliRetrievalPreference = 'thread-first'
): string {
  const toolsPath = join(workspaceRoot, 'rules', 'WORKBENCH_TOOLS.ps1')
  const environmentAssignments = {
    AI_WORKBENCH_WORKSPACE_ROOT: workspaceRoot,
    AI_WORKBENCH_MANAGED_SESSION: '1',
    AI_WORKBENCH_SESSION_PANEL_ID: sessionIdentity?.panelId ?? '',
    AI_WORKBENCH_SESSION_TITLE: sessionIdentity?.title ?? '',
    AI_WORKBENCH_SESSION_LAUNCH_COUNT: sessionIdentity ? String(sessionIdentity.launchCount) : '',
    AI_WORKBENCH_SESSION_CONTEXT_LABEL: sessionIdentity?.contextLabel ?? '',
    AI_WORKBENCH_SESSION_SCOPE_ID: sessionIdentity?.sessionScopeId ?? '',
    AI_WORKBENCH_THREAD_ID: sessionIdentity?.threadId ?? '',
    AI_WORKBENCH_THREAD_TITLE: sessionIdentity?.threadTitle ?? '',
    AI_WORKBENCH_RETRIEVAL_AUDIT_PATH: sessionIdentity?.retrievalAuditPath ?? '',
    AI_WORKBENCH_RETRIEVAL_STATE_PATH: sessionIdentity?.retrievalStatePath ?? '',
    AI_WORKBENCH_CLI_RETRIEVAL_PREFERENCE: retrievalPreference
  }

  return [
    ...Object.entries(environmentAssignments).map(([key, value]) => `$env:${key}=${psQuote(value)}`),
    `if (Test-Path -LiteralPath ${psQuote(sessionCwd)}) { Set-Location -LiteralPath ${psQuote(sessionCwd)} }`,
    `if (Test-Path -LiteralPath ${psQuote(toolsPath)}) { . ${psQuote(toolsPath)} }`
  ].join('\r')
}

interface ManagedTerminalSession {
  config: TerminalPanelConfig
  ptyProcess: IPty | null
  snapshot: TerminalPanelSnapshot
  buffer: string
  captureBuffer: string
  bootTimer: NodeJS.Timeout | null
  captureTimer: NodeJS.Timeout | null
  auditSyncTimer: NodeJS.Timeout | null
  logPath: string
  hasReceivedData: boolean
  hasMeaningfulUserInput: boolean
  sessionToken: number
  captureArtifactId: string | null
  contextLabel: string | null
  sessionScopeId: string | null
  threadId: string | null
  threadTitle: string | null
  retrievalAuditPath: string | null
  retrievalStatePath: string | null
}

interface PersistTerminalTranscriptPayload {
  artifactId: string | null
  panelId: string
  title: string
  launchCount: number
  contextLabel: string
  threadId?: string | null
  content: string
}

function attachSessionContinuity(
  snapshot: TerminalPanelSnapshot,
  continuity: {
    contextLabel: string | null
    sessionScopeId: string | null
    threadId: string | null
    threadTitle: string | null
  }
): TerminalPanelSnapshot {
  return {
    ...snapshot,
    contextLabel: continuity.contextLabel,
    sessionScopeId: continuity.sessionScopeId,
    threadId: continuity.threadId,
    threadTitle: continuity.threadTitle
  }
}

function trimBuffer(buffer: string): string {
  if (buffer.length <= MAX_BUFFER_SIZE) {
    return buffer
  }

  return buffer.slice(buffer.length - MAX_BUFFER_SIZE)
}

function appendLog(logPath: string, chunk: string): void {
  appendFileSync(logPath, chunk, 'utf8')
}

function hasMeaningfulTerminalInput(data: string): boolean {
  return (
    data
      .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim().length > 0
  )
}

function createInitialSnapshot(config: TerminalPanelConfig, cwd: string, logPath: string): TerminalPanelSnapshot {
  return {
    panelId: config.id,
    title: config.title,
    shell: config.shell,
    shellArgs: config.shellArgs,
    cwd,
    startupCommand: config.startupCommand,
    status: 'idle',
    hasSession: false,
    isRunning: false,
    launchCount: 0,
    pid: null,
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    bufferSize: 0,
    logPath,
    lastExitCode: null,
    lastExitSignal: null,
    lastError: null,
    contextLabel: null,
    sessionScopeId: null,
    threadId: null,
    threadTitle: null
  }
}

export class TerminalManager {
  private readonly sessions = new Map<string, ManagedTerminalSession>()
  private readonly logDirectory: string
  private readonly builtInIds = new Set(terminalPanelConfigs.map((config) => config.id))
  private workspaceRoot: string
  private builtInOverrides: Record<string, BuiltInTerminalPanelSettings>
  private globalStartupPreludeCommands: string[]
  private cliRetrievalPreference: CliRetrievalPreference

  constructor(
    private readonly window: BrowserWindow,
    baseDirectory: string,
    defaultCwd: string,
    builtInOverrides: Record<string, BuiltInTerminalPanelSettings> = {},
    customPanels: CustomTerminalPanelSettings[] = [],
    startupPreludeCommands: string[] = [],
    cliRetrievalPreference: CliRetrievalPreference = 'thread-first',
    private readonly persistTerminalTranscript?: (payload: PersistTerminalTranscriptPayload) => string | null,
    private readonly syncRetrievalAuditArtifacts?: (sessionScopeId?: string | null) => void,
    private readonly resolveSessionThread?: (
      panelId: string,
      title: string,
      contextLabel: string
    ) => { threadId: string; title: string } | null
  ) {
    this.workspaceRoot = defaultCwd
    this.builtInOverrides = builtInOverrides
    this.globalStartupPreludeCommands = startupPreludeCommands
    this.cliRetrievalPreference = cliRetrievalPreference
    this.logDirectory = join(baseDirectory, 'logs', 'terminal')
    mkdirSync(this.logDirectory, { recursive: true })

    for (const config of terminalPanelConfigs) {
      this.upsertSession(this.resolveBuiltInConfig(config))
    }

    this.syncCustomPanels(customPanels)
  }

  getSnapshot(panelId: string): TerminalPanelSnapshot | null {
    return this.sessions.get(panelId)?.snapshot ?? null
  }

  attach(panelId: string): TerminalPanelAttachPayload | null {
    const session = this.sessions.get(panelId)
    if (!session) {
      return null
    }

    return {
      snapshot: session.snapshot,
      buffer: session.buffer
    }
  }

  start(panelId: string): TerminalPanelSnapshot | null {
    const session = this.sessions.get(panelId)
    if (!session) {
      return null
    }

    if (session.ptyProcess && session.snapshot.isRunning) {
      return session.snapshot
    }

    if (session.ptyProcess) {
      this.disposeSession(session)
    }

    try {
      const cwd = session.config.cwd ?? this.workspaceRoot
      const sessionToken = session.sessionToken + 1
      const nextLaunchCount = session.snapshot.launchCount + 1
      const contextLabel = `session-${String(nextLaunchCount).padStart(4, '0')}`
      const threadIdentity = this.resolveSessionThread?.(session.config.id, session.config.title, contextLabel) ?? null
      const sessionIdentity = createManagedSessionIdentity(
        this.workspaceRoot,
        session.config.id,
        session.config.title,
        nextLaunchCount,
        contextLabel,
        threadIdentity
      )
      const env = {
        ...process.env,
        AI_WORKBENCH_WORKSPACE_ROOT: this.workspaceRoot,
        AI_WORKBENCH_MANAGED_SESSION: '1',
        AI_WORKBENCH_SESSION_PANEL_ID: sessionIdentity.panelId,
        AI_WORKBENCH_SESSION_TITLE: sessionIdentity.title,
        AI_WORKBENCH_SESSION_LAUNCH_COUNT: String(sessionIdentity.launchCount),
        AI_WORKBENCH_SESSION_CONTEXT_LABEL: sessionIdentity.contextLabel,
        AI_WORKBENCH_SESSION_SCOPE_ID: sessionIdentity.sessionScopeId,
        AI_WORKBENCH_THREAD_ID: sessionIdentity.threadId ?? '',
        AI_WORKBENCH_THREAD_TITLE: sessionIdentity.threadTitle ?? '',
        AI_WORKBENCH_RETRIEVAL_AUDIT_PATH: sessionIdentity.retrievalAuditPath,
        AI_WORKBENCH_RETRIEVAL_STATE_PATH: sessionIdentity.retrievalStatePath,
        AI_WORKBENCH_CLI_RETRIEVAL_PREFERENCE: this.cliRetrievalPreference,
        ...session.config.env
      }

      session.contextLabel = contextLabel
      session.sessionScopeId = sessionIdentity.sessionScopeId
      session.threadId = sessionIdentity.threadId
      session.threadTitle = sessionIdentity.threadTitle
      session.retrievalAuditPath = sessionIdentity.retrievalAuditPath
      session.retrievalStatePath = sessionIdentity.retrievalStatePath
      session.ptyProcess = pty.spawn(session.config.shell, session.config.shellArgs, {
        name: 'xterm-color',
        cols: session.snapshot.cols,
        rows: session.snapshot.rows,
        cwd,
        env,
        useConpty: true
      })
      session.hasReceivedData = false
      session.hasMeaningfulUserInput = false
      session.buffer = ''
      session.captureBuffer = ''
      session.sessionToken = sessionToken
      session.captureArtifactId = null

      session.snapshot = attachSessionContinuity(
        {
          ...session.snapshot,
          title: session.config.title,
          shell: session.config.shell,
          shellArgs: session.config.shellArgs,
          cwd,
          startupCommand: session.config.startupCommand,
          status: 'starting',
          hasSession: true,
          isRunning: false,
          launchCount: nextLaunchCount,
          pid: session.ptyProcess.pid,
          bufferSize: 0,
          lastExitCode: null,
          lastExitSignal: null,
          lastError: null
        },
        session
      )

      appendLog(session.logPath, `\n\n=== SESSION ${new Date().toISOString()} (${session.config.id}) ===\n`)
      this.publishState(session.snapshot)
      this.attachProcessListeners(session, sessionToken)

      session.bootTimer = setTimeout(() => {
        if (!session.ptyProcess) {
          return
        }

        session.ptyProcess.write(
          `${createWorkspaceBootstrap(this.workspaceRoot, cwd, sessionIdentity, this.cliRetrievalPreference)}\r`
        )
        for (const command of this.resolvePreludeCommands(session.config)) {
          if (command.trim().length > 0) {
            session.ptyProcess.write(`${command}\r`)
          }
        }
        if (session.config.startupCommand.trim().length > 0) {
          session.ptyProcess.write(`${session.config.startupCommand}\r`)
        }
      }, STARTUP_COMMAND_DELAY_MS)

      return session.snapshot
    } catch (error) {
      session.snapshot = attachSessionContinuity(
        {
          ...session.snapshot,
          status: 'error',
          hasSession: false,
          isRunning: false,
          pid: null,
          lastError: error instanceof Error ? error.message : String(error)
        },
        session
      )
      this.publishState(session.snapshot)
      return session.snapshot
    }
  }

  restart(panelId: string): TerminalPanelSnapshot | null {
    const session = this.sessions.get(panelId)
    if (!session) {
      return null
    }

    this.disposeSession(session)
    return this.start(panelId)
  }

  write(panelId: string, data: string): void {
    const session = this.sessions.get(panelId)
    if (!session?.ptyProcess) {
      return
    }

    if (hasMeaningfulTerminalInput(data)) {
      if (!session.hasMeaningfulUserInput) {
        session.captureBuffer = ''
        session.captureArtifactId = null
      }

      session.hasMeaningfulUserInput = true
    }

    session.ptyProcess.write(data)
  }

  resize(panelId: string, size: TerminalResizePayload): void {
    const session = this.sessions.get(panelId)
    if (!session) {
      return
    }

    session.snapshot = {
      ...session.snapshot,
      cols: size.cols,
      rows: size.rows
    }

    if (session.ptyProcess && size.cols > 0 && size.rows > 0) {
      session.ptyProcess.resize(size.cols, size.rows)
    }
  }

  clearBuffer(panelId: string): TerminalPanelAttachPayload | null {
    const session = this.sessions.get(panelId)
    if (!session) {
      return null
    }

    session.buffer = ''
    session.snapshot = {
      ...session.snapshot,
      bufferSize: 0
    }

    if (session.ptyProcess) {
      session.ptyProcess.clear()
    }

    this.publishState(session.snapshot)
    return {
      snapshot: session.snapshot,
      buffer: session.buffer
    }
  }

  syncCustomPanels(customPanels: CustomTerminalPanelSettings[]): void {
    const nextConfigs = new Map(customPanels.map((panel) => [panel.id, createCustomTerminalPanelConfig(panel)]))

    for (const [panelId, session] of this.sessions) {
      if (this.builtInIds.has(panelId)) {
        continue
      }

      const nextConfig = nextConfigs.get(panelId)
      if (!nextConfig) {
        this.disposeSession(session)
        this.sessions.delete(panelId)
        continue
      }

      this.upsertSession(nextConfig)
      nextConfigs.delete(panelId)
    }

    for (const config of nextConfigs.values()) {
      this.upsertSession(config)
    }
  }

  syncBuiltInOverrides(overrides: Record<string, BuiltInTerminalPanelSettings>): void {
    this.builtInOverrides = overrides

    for (const config of terminalPanelConfigs) {
      this.upsertSession(this.resolveBuiltInConfig(config))
    }
  }

  syncStartupPreludeCommands(commands: string[]): void {
    this.globalStartupPreludeCommands = commands

    for (const config of terminalPanelConfigs) {
      this.upsertSession(this.resolveBuiltInConfig(config))
    }
  }

  syncWorkspaceRoot(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot

    for (const session of this.sessions.values()) {
      if (session.config.cwd) {
        continue
      }

      session.snapshot = {
        ...session.snapshot,
        cwd: workspaceRoot
      }

      if (session.ptyProcess) {
        const sessionCwd = session.config.cwd ?? workspaceRoot
        const sessionIdentity = session.contextLabel
          ? createManagedSessionIdentity(
              workspaceRoot,
              session.config.id,
              session.config.title,
              session.snapshot.launchCount,
              session.contextLabel,
              session.threadId && session.threadTitle
                ? {
                    threadId: session.threadId,
                    title: session.threadTitle
                  }
                : null
            )
          : null
        session.sessionScopeId = sessionIdentity?.sessionScopeId ?? null
        session.threadId = sessionIdentity?.threadId ?? session.threadId
        session.threadTitle = sessionIdentity?.threadTitle ?? session.threadTitle
        session.retrievalAuditPath = sessionIdentity?.retrievalAuditPath ?? null
        session.retrievalStatePath = sessionIdentity?.retrievalStatePath ?? null
        session.ptyProcess.write(
          `${createWorkspaceBootstrap(workspaceRoot, sessionCwd, sessionIdentity, this.cliRetrievalPreference)}\r`
        )
      }

      session.snapshot = attachSessionContinuity(session.snapshot, session)
      this.publishState(session.snapshot)
    }
  }

  dispose(): void {
    for (const session of this.sessions.values()) {
      this.disposeSession(session)
    }
  }

  syncCliRetrievalPreference(preference: CliRetrievalPreference): void {
    this.cliRetrievalPreference = preference

    for (const session of this.sessions.values()) {
      if (!session.ptyProcess) {
        continue
      }

      const sessionCwd = session.config.cwd ?? this.workspaceRoot
      const sessionIdentity = session.contextLabel
        ? createManagedSessionIdentity(
            this.workspaceRoot,
            session.config.id,
            session.config.title,
            session.snapshot.launchCount,
            session.contextLabel,
            session.threadId && session.threadTitle
              ? {
                  threadId: session.threadId,
                  title: session.threadTitle
                }
              : null
          )
        : null
      session.ptyProcess.write(
        `${createWorkspaceBootstrap(this.workspaceRoot, sessionCwd, sessionIdentity, this.cliRetrievalPreference)}\r`
      )
    }
  }

  private attachProcessListeners(session: ManagedTerminalSession, sessionToken: number): void {
    if (!session.ptyProcess) {
      return
    }

    session.ptyProcess.onData((data) => {
      if (sessionToken !== session.sessionToken) {
        return
      }

      session.buffer = trimBuffer(session.buffer + data)
      session.captureBuffer += data
      appendLog(session.logPath, data)

      if (!session.hasReceivedData) {
        session.hasReceivedData = true
        session.snapshot = {
          ...session.snapshot,
          status: 'running',
          isRunning: true,
          lastError: null
        }
      }

      session.snapshot = {
        ...session.snapshot,
        bufferSize: session.buffer.length,
        pid: session.ptyProcess?.pid ?? null
      }

      this.publishState(session.snapshot)
      this.publishOutput({
        panelId: session.config.id,
        data
      })
      this.scheduleTranscriptPersist(session)
      this.scheduleRetrievalAuditSync(session)
    })

    session.ptyProcess.onExit(({ exitCode, signal }) => {
      if (sessionToken !== session.sessionToken) {
        return
      }

      if (session.bootTimer) {
        clearTimeout(session.bootTimer)
        session.bootTimer = null
      }

      this.flushTranscript(session)
      this.flushRetrievalAudit(session)
      this.clearPendingRetrievalState(session)

      session.ptyProcess = null
      session.snapshot = {
        ...session.snapshot,
        status: exitCode === 0 ? 'exited' : 'error',
        hasSession: false,
        isRunning: false,
        pid: null,
        lastExitCode: exitCode,
        lastExitSignal: signal ?? null,
        lastError: exitCode === 0 ? null : `Terminal exited with code ${exitCode}`
      }

      appendLog(
        session.logPath,
        `\n=== EXIT ${new Date().toISOString()} code=${exitCode} signal=${signal ?? 'none'} ===\n`
      )
      this.publishState(session.snapshot)
    })
  }

  private disposeSession(session: ManagedTerminalSession): void {
    session.sessionToken += 1

    if (session.bootTimer) {
      clearTimeout(session.bootTimer)
      session.bootTimer = null
    }

    if (session.captureTimer) {
      clearTimeout(session.captureTimer)
      session.captureTimer = null
    }

    if (session.auditSyncTimer) {
      clearTimeout(session.auditSyncTimer)
      session.auditSyncTimer = null
    }

    this.flushTranscript(session)
    this.flushRetrievalAudit(session)
    this.clearPendingRetrievalState(session)

    if (session.ptyProcess) {
      const ptyProcess = session.ptyProcess
      session.ptyProcess = null

      try {
        ptyProcess.write('\u0003')
        ptyProcess.write('exit\r')
      } catch {
        // Ignore shutdown races during app close/restart.
      }

      setTimeout(() => {
        try {
          ptyProcess.kill()
        } catch {
          // Ignore late kill failures if the shell already exited.
        }
      }, 500)
    } else {
      session.ptyProcess = null
    }

    session.snapshot = {
      ...session.snapshot,
      hasSession: false,
      isRunning: false,
      pid: null
    }
  }

  private publishState(snapshot: TerminalPanelSnapshot): void {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('terminal:state-changed', snapshot)
    }
  }

  private publishOutput(event: TerminalOutputEvent): void {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('terminal:output', event)
    }
  }

  private upsertSession(config: TerminalPanelConfig): void {
    const existingSession = this.sessions.get(config.id)
    const cwd = config.cwd ?? this.workspaceRoot
    const logPath = existingSession?.logPath ?? join(this.logDirectory, `${config.id}.log`)

    if (!existingSession) {
      this.sessions.set(config.id, {
        config,
        ptyProcess: null,
        snapshot: createInitialSnapshot(config, cwd, logPath),
        buffer: '',
        captureBuffer: '',
        bootTimer: null,
        captureTimer: null,
        auditSyncTimer: null,
        logPath,
        hasReceivedData: false,
        hasMeaningfulUserInput: false,
        sessionToken: 0,
        captureArtifactId: null,
        contextLabel: null,
        sessionScopeId: null,
        threadId: null,
        threadTitle: null,
        retrievalAuditPath: null,
        retrievalStatePath: null
      })
      return
    }

    existingSession.config = config
    existingSession.snapshot = {
      ...existingSession.snapshot,
      title: config.title,
      shell: config.shell,
      shellArgs: config.shellArgs,
      cwd,
      startupCommand: config.startupCommand
    }

    existingSession.snapshot = attachSessionContinuity(existingSession.snapshot, existingSession)
    this.publishState(existingSession.snapshot)
  }

  private scheduleTranscriptPersist(session: ManagedTerminalSession): void {
    if (!this.persistTerminalTranscript) {
      return
    }

    if (session.captureTimer) {
      clearTimeout(session.captureTimer)
    }

    session.captureTimer = setTimeout(() => {
      this.flushTranscript(session)
    }, TRANSCRIPT_FLUSH_DELAY_MS)
  }

  private scheduleRetrievalAuditSync(session: ManagedTerminalSession): void {
    if (!this.syncRetrievalAuditArtifacts) {
      return
    }

    if (session.auditSyncTimer) {
      clearTimeout(session.auditSyncTimer)
    }

    session.auditSyncTimer = setTimeout(() => {
      this.flushRetrievalAudit(session)
    }, TRANSCRIPT_FLUSH_DELAY_MS)
  }

  private flushTranscript(session: ManagedTerminalSession): void {
    if (
      !this.persistTerminalTranscript ||
      !session.contextLabel ||
      !session.hasMeaningfulUserInput ||
      session.captureBuffer.length === 0
    ) {
      return
    }

    if (session.captureTimer) {
      clearTimeout(session.captureTimer)
      session.captureTimer = null
    }

    session.captureArtifactId =
      this.persistTerminalTranscript({
        artifactId: session.captureArtifactId,
        panelId: session.config.id,
        title: session.config.title,
        launchCount: session.snapshot.launchCount,
        contextLabel: session.contextLabel,
        threadId: session.threadId,
        content: session.captureBuffer
      }) ?? session.captureArtifactId
  }

  private flushRetrievalAudit(session: ManagedTerminalSession): void {
    if (!this.syncRetrievalAuditArtifacts) {
      return
    }

    if (session.auditSyncTimer) {
      clearTimeout(session.auditSyncTimer)
      session.auditSyncTimer = null
    }

    this.syncRetrievalAuditArtifacts(session.sessionScopeId)
  }

  private clearPendingRetrievalState(session: ManagedTerminalSession): void {
    if (!session.retrievalStatePath || !existsSync(session.retrievalStatePath)) {
      return
    }

    rmSync(session.retrievalStatePath, { force: true })
  }

  private resolveBuiltInConfig(config: TerminalPanelConfig): TerminalPanelConfig {
    return applyBuiltInTerminalPanelSettings(
      config,
      this.builtInOverrides[config.id],
      this.globalStartupPreludeCommands
    )
  }

  private resolvePreludeCommands(config: TerminalPanelConfig): string[] {
    return config.startupPreludeCommands ?? this.globalStartupPreludeCommands
  }
}

export function isTerminalPanel(panelId: string): boolean {
  return Boolean(getTerminalPanelConfig(panelId))
}
