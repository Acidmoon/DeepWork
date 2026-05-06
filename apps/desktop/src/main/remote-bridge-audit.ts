import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { RemoteBridgeSettings } from '@ai-workbench/core/desktop/settings'
import type { RemoteSessionStatus } from './remote-session-adapter'

export type RemoteBridgeAuditAction = 'input' | 'command' | 'rejected'
export type RemoteBridgeAuditResult = 'accepted' | 'rejected' | 'issued' | 'succeeded' | 'failed' | 'ignored'

export interface RemoteBridgeAuditRecord {
  timestamp: string
  action: RemoteBridgeAuditAction
  result: RemoteBridgeAuditResult
  actorUserId: string | null
  chatId: string | null
  targetPanelId: string | null
  command: string | null
  reason: string | null
  inputLength: number | null
}

export interface RemoteBridgeAuditSink {
  record(entry: RemoteBridgeAuditRecord): void
}

export interface RemoteBridgeAuditSummary {
  recordCount: number
  acceptedInputCount: number
  rejectedCount: number
  commandCount: number
  latestRecord: RemoteBridgeAuditRecord | null
}

export interface RemoteBridgeDiagnostics {
  enabled: boolean
  ready: boolean
  intakeMode: string
  targetMode: string
  defaultPanelId: string
  enabledPanelIds: string[]
  allowedChatCount: number
  allowedUserCount: number
  status: RemoteSessionStatus | null
  audit: RemoteBridgeAuditSummary
}

export function createRemoteBridgeAuditRecord(
  entry: Omit<RemoteBridgeAuditRecord, 'timestamp'> & { timestamp?: string | null }
): RemoteBridgeAuditRecord {
  return {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    action: entry.action,
    result: entry.result,
    actorUserId: entry.actorUserId,
    chatId: entry.chatId,
    targetPanelId: entry.targetPanelId,
    command: entry.command,
    reason: entry.reason,
    inputLength: entry.inputLength
  }
}

export class JsonlRemoteBridgeAuditSink implements RemoteBridgeAuditSink {
  constructor(private readonly path: string) {}

  record(entry: RemoteBridgeAuditRecord): void {
    mkdirSync(dirname(this.path), { recursive: true })
    appendFileSync(this.path, `${JSON.stringify(entry)}\n`, 'utf8')
  }

  readSummary(): RemoteBridgeAuditSummary {
    let records: RemoteBridgeAuditRecord[] = []
    try {
      records = readFileSync(this.path, 'utf8')
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as RemoteBridgeAuditRecord)
    } catch {
      records = []
    }

    return summarizeRemoteBridgeAudit(records)
  }
}

export class MemoryRemoteBridgeAuditSink implements RemoteBridgeAuditSink {
  readonly records: RemoteBridgeAuditRecord[] = []

  record(entry: RemoteBridgeAuditRecord): void {
    this.records.push(entry)
  }

  readSummary(): RemoteBridgeAuditSummary {
    return summarizeRemoteBridgeAudit(this.records)
  }
}

export function summarizeRemoteBridgeAudit(records: readonly RemoteBridgeAuditRecord[]): RemoteBridgeAuditSummary {
  return {
    recordCount: records.length,
    acceptedInputCount: records.filter((record) => record.action === 'input' && record.result === 'accepted').length,
    rejectedCount: records.filter((record) => record.result === 'rejected').length,
    commandCount: records.filter((record) => record.action === 'command').length,
    latestRecord: records.at(-1) ?? null
  }
}

export function createRemoteBridgeDiagnostics(input: {
  settings: RemoteBridgeSettings
  ready: boolean
  status: RemoteSessionStatus | null
  auditSummary: RemoteBridgeAuditSummary
}): RemoteBridgeDiagnostics {
  return {
    enabled: input.settings.enabled,
    ready: input.ready,
    intakeMode: input.settings.intakeMode,
    targetMode: input.settings.targetMode,
    defaultPanelId: input.settings.defaultPanelId,
    enabledPanelIds: input.settings.enabledPanelIds,
    allowedChatCount: input.settings.allowedChatIds.length,
    allowedUserCount: input.settings.allowedUserIds.length,
    status: input.status,
    audit: input.auditSummary
  }
}
