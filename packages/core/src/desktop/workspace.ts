export type ArtifactType = 'html' | 'markdown' | 'text' | 'pdf' | 'image' | 'code' | 'json' | 'review' | 'log'
export type ArtifactCaptureMode =
  | 'manual-save'
  | 'auto-web-context'
  | 'auto-web-messages'
  | 'auto-terminal-transcript'
  | 'auto-cli-retrieval-audit'
export type ArtifactInspectionKind =
  | 'manual-save'
  | 'web-context'
  | 'message-index'
  | 'terminal-transcript'
  | 'retrieval-audit'
  | 'generic'

export interface ArtifactRecord {
  id: string
  name: string
  type: ArtifactType
  path: string
  absolutePath: string
  origin: string
  summary: string
  tags: string[]
  parents: string[]
  createdAt: string
  updatedAt: string
  size: number
  hash?: string
  metadata?: Record<string, unknown>
}

export interface ArtifactManifest {
  version: string
  projectId: string
  workspaceRoot: string
  artifacts: ArtifactRecord[]
}

export interface ContextIndexEntry {
  origin: string
  contextLabel: string
  scopeId: string
  threadId: string
  artifactCount: number
  artifactIds: string[]
  latestArtifactId: string | null
  latestUpdatedAt: string | null
  retrieval: ContextRetrievalMetadata
}

export interface ContextRetrievalMetadata {
  normalizedOrigin: string
  normalizedContextLabel: string
  latestArtifactSummary: string | null
  latestArtifactType: ArtifactType | null
  artifactTypes: ArtifactType[]
  tags: string[]
  searchTerms: string[]
  scopeSummary: string
}

export interface ContextIndexManifest {
  version: string
  workspaceRoot: string
  origins: ContextIndexEntry[]
}

export interface ContextThreadSummary {
  threadId: string
  title: string
  derived: boolean
  scopeIds: string[]
  artifactIds: string[]
  scopeCount: number
  artifactCount: number
  latestArtifactId: string | null
  latestUpdatedAt: string | null
  originHints: string[]
  searchTerms: string[]
  summary: string
}

export interface ThreadIndexManifest {
  version: string
  workspaceRoot: string
  activeThreadId: string | null
  threads: ContextThreadSummary[]
}

export interface ThreadArtifactManifest {
  version: string
  workspaceRoot: string
  threadId: string
  title: string
  derived: boolean
  scopeIds: string[]
  artifacts: ArtifactRecord[]
}

export interface OriginArtifactManifest {
  version: string
  workspaceRoot: string
  origin: string
  contextLabel: string
  scopeId: string
  artifacts: ArtifactRecord[]
}

export interface WorkspaceSnapshot {
  projectId: string
  workspaceRoot: string
  manifestPath: string
  contextIndexPath: string
  originManifestsPath: string
  threadIndexPath: string
  threadManifestsPath: string
  rulesPath: string
  initialized: boolean
  artifactCount: number
  bucketCounts: Record<string, number>
  contextEntries: ContextIndexEntry[]
  threads: ContextThreadSummary[]
  activeThreadId: string | null
  activeThreadTitle: string | null
  artifacts: ArtifactRecord[]
  recentArtifacts: ArtifactRecord[]
  lastSavedArtifactId: string | null
  lastError: string | null
}

export interface SaveClipboardOptions {
  origin: string
  contextLabel?: string
  threadId?: string
}

export interface SaveClipboardResult {
  snapshot: WorkspaceSnapshot
  artifact: ArtifactRecord | null
}

export interface ArtifactContentPayload {
  artifact: ArtifactRecord
  content: string
}

export interface BuildContextEntriesOptions<TArtifact extends ArtifactRecord = ArtifactRecord> {
  isArtifactSubstantive?: (artifact: TArtifact) => boolean
}

export interface RetrievalAuditEntry {
  timestamp: string
  session?: {
    panelId?: string | null
    title?: string | null
    launchCount?: number | null
    contextLabel?: string | null
    sessionScopeId?: string | null
    threadId?: string | null
    threadTitle?: string | null
  } | null
  query: string
  candidateScopeIds?: string[]
  candidates?: Array<{
    scopeId?: string | null
    score?: number | null
    origin?: string | null
    contextLabel?: string | null
  }>
  selectedScopeId?: string | null
  outcome: string
  reason?: string | null
  retrievalMode?: string | null
}

export interface ThreadSeed {
  threadId: string
  title?: string | null
  derived?: boolean
}

export interface BuildThreadEntriesOptions<TArtifact extends ArtifactRecord = ArtifactRecord> {
  explicitThreads?: ThreadSeed[]
  isArtifactSubstantive?: (artifact: TArtifact) => boolean
}

const MAX_SCOPE_SUMMARY_PARTS = 3
const MAX_SEARCH_TERMS = 64
const KNOWN_CAPTURE_MODES = new Set<ArtifactCaptureMode>([
  'manual-save',
  'auto-web-context',
  'auto-web-messages',
  'auto-terminal-transcript',
  'auto-cli-retrieval-audit'
])

export const artifactExtensions: Record<ArtifactType, string> = {
  html: 'html',
  markdown: 'md',
  text: 'txt',
  pdf: 'pdf',
  image: 'png',
  code: 'txt',
  json: 'json',
  review: 'md',
  log: 'log'
}

export const artifactDirectories: Record<ArtifactType, string> = {
  html: 'artifacts/html',
  markdown: 'artifacts/markdown',
  text: 'artifacts/text',
  pdf: 'artifacts/pdf',
  image: 'artifacts/image',
  code: 'artifacts/code',
  json: 'artifacts/json',
  review: 'artifacts/review',
  log: 'logs'
}

export function bucketCounts(artifacts: ArtifactRecord[]): Record<string, number> {
  const outputsCount = artifacts.filter((artifact) => artifact.path.startsWith('outputs/')).length
  const logsCount = artifacts.filter((artifact) => artifact.path.startsWith('logs/')).length

  return {
    'artifacts/': artifacts.length - outputsCount - logsCount,
    'outputs/': outputsCount,
    'logs/': logsCount
  }
}

export function sanitizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
}

export function sanitizeContextLabel(contextLabel: string | undefined): string {
  const normalized = (contextLabel ?? '').trim()
  if (!normalized) {
    return 'default-context'
  }

  return normalized.toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
}

export function getArtifactScopeId(artifact: Pick<ArtifactRecord, 'origin' | 'metadata'>): string {
  const origin = sanitizeOrigin(artifact.origin || 'manual')
  const contextLabel = sanitizeContextLabel(String(artifact.metadata?.contextLabel ?? ''))
  return `${origin}__${contextLabel}`
}

export function buildDerivedThreadId(scopeId: string): string {
  return `thread-${sanitizeOrigin(scopeId)}`
}

export function sanitizeThreadId(threadId: string | undefined | null, fallbackScopeId?: string): string {
  const normalized = sanitizeOrigin(String(threadId ?? ''))
  if (normalized) {
    return normalized
  }

  return buildDerivedThreadId(fallbackScopeId ?? 'default-context')
}

export function getArtifactThreadId(artifact: Pick<ArtifactRecord, 'origin' | 'metadata'>): string {
  const scopeId = getArtifactScopeId(artifact)
  return sanitizeThreadId(String(artifact.metadata?.threadId ?? ''), scopeId)
}

function normalizeRecordText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeRecordInteger(value: unknown): number | null {
  const resolved = Number(value)
  if (!Number.isFinite(resolved) || resolved < 0) {
    return null
  }

  return Math.trunc(resolved)
}

function normalizeRecordStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.map((item) => normalizeRecordText(item)).filter((item) => item.length > 0))]
}

function normalizeArtifactTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function uniqueArtifactTags(values: Array<string | null | undefined>): string[] {
  const tags = values
    .map((value) => normalizeArtifactTag(String(value ?? '')))
    .filter((value) => value.length > 0)

  return [...new Set(tags)]
}

function appendPreviewText(summary: string, previewText: string | null): string {
  if (!previewText) {
    return summary
  }

  return `${summary} Preview: ${previewText}`.trim()
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

function humanizeArtifactTypeLabel(type: ArtifactType): string {
  switch (type) {
    case 'markdown':
      return 'markdown'
    case 'json':
      return 'JSON'
    case 'log':
      return 'log'
    case 'html':
      return 'HTML'
    case 'text':
      return 'text'
    case 'code':
      return 'code'
    case 'pdf':
      return 'PDF'
    case 'image':
      return 'image'
    case 'review':
      return 'review'
  }
}

function inferArtifactCaptureMode(artifact: Pick<ArtifactRecord, 'origin' | 'type' | 'metadata'>): ArtifactCaptureMode | null {
  const rawCaptureMode = normalizeRecordText(artifact.metadata?.captureMode)
  if (rawCaptureMode && KNOWN_CAPTURE_MODES.has(rawCaptureMode as ArtifactCaptureMode)) {
    return rawCaptureMode as ArtifactCaptureMode
  }

  if (normalizeRecordText(artifact.metadata?.retrievalOutcome)) {
    return 'auto-cli-retrieval-audit'
  }

  if (normalizeRecordText(artifact.metadata?.sourceUrl)) {
    return artifact.type === 'json' ? 'auto-web-messages' : 'auto-web-context'
  }

  if (
    artifact.type === 'log' &&
    (normalizeRecordInteger(artifact.metadata?.launchCount) !== null || normalizeRecordText(artifact.metadata?.sessionTitle))
  ) {
    return 'auto-terminal-transcript'
  }

  if (artifact.origin === 'manual' || normalizeRecordStringArray(artifact.metadata?.clipboardFormats).length > 0) {
    return 'manual-save'
  }

  return null
}

export function getArtifactCaptureMode(artifact: Pick<ArtifactRecord, 'origin' | 'type' | 'metadata'>): ArtifactCaptureMode | null {
  return inferArtifactCaptureMode(artifact)
}

export function getArtifactInspectionKind(artifact: Pick<ArtifactRecord, 'origin' | 'type' | 'metadata'>): ArtifactInspectionKind {
  const captureMode = inferArtifactCaptureMode(artifact)

  switch (captureMode) {
    case 'manual-save':
      return 'manual-save'
    case 'auto-web-context':
      return 'web-context'
    case 'auto-web-messages':
      return 'message-index'
    case 'auto-terminal-transcript':
      return 'terminal-transcript'
    case 'auto-cli-retrieval-audit':
      return 'retrieval-audit'
    default:
      return 'generic'
  }
}

function deriveLegacyPreviewText(summary: string): string | null {
  const previewMatch = normalizeRecordText(summary).match(/Preview:\s*(.+)$/i)
  return previewMatch?.[1]?.trim() || null
}

function buildNormalizedArtifactMetadata(artifact: ArtifactRecord): Record<string, unknown> {
  const existingMetadata = artifact.metadata ?? {}
  const origin = sanitizeOrigin(artifact.origin || 'manual')
  const contextLabel = sanitizeContextLabel(String(existingMetadata.contextLabel ?? ''))
  const sessionScopeId = `${origin}__${contextLabel}`
  const threadId = sanitizeThreadId(String(existingMetadata.threadId ?? ''), sessionScopeId)
  const captureMode = inferArtifactCaptureMode(artifact)
  const inspectionKind = getArtifactInspectionKind(artifact)
  const panelId = sanitizeOrigin(String(existingMetadata.panelId ?? origin))
  const previewText = normalizeRecordText(existingMetadata.previewText) || deriveLegacyPreviewText(artifact.summary)
  const pageTitle = normalizeRecordText(existingMetadata.pageTitle)
  const sourceUrl = normalizeRecordText(existingMetadata.sourceUrl)
  const sessionTitle = normalizeRecordText(existingMetadata.sessionTitle || existingMetadata.panelTitle)
  const launchCount = normalizeRecordInteger(existingMetadata.launchCount)
  const messageCount = normalizeRecordInteger(existingMetadata.messageCount)
  const retrievalQuery = normalizeRecordText(existingMetadata.retrievalQuery)
  const retrievalOutcome = sanitizeOrigin(String(existingMetadata.retrievalOutcome ?? ''))
  const retrievalReason = normalizeRecordText(existingMetadata.retrievalReason)
  const retrievalMode = sanitizeOrigin(String(existingMetadata.retrievalMode ?? ''))
  const selectedScopeId = normalizeRecordText(existingMetadata.selectedScopeId)
  const candidateScopeIds = normalizeRecordStringArray(existingMetadata.candidateScopeIds)
  const clipboardFormats = normalizeRecordStringArray(existingMetadata.clipboardFormats).map((item) => item.toLowerCase())
  const nextMetadata: Record<string, unknown> = {
    ...existingMetadata,
    artifactKind: inspectionKind,
    panelId,
    contextLabel,
    sessionScopeId,
    threadId
  }

  if (captureMode) {
    nextMetadata.captureMode = captureMode
  }

  if (previewText) {
    nextMetadata.previewText = previewText
  }

  if (inspectionKind === 'manual-save') {
    nextMetadata.captureSource = clipboardFormats.length > 0 ? 'clipboard' : 'workspace'
    if (clipboardFormats.length > 0) {
      nextMetadata.clipboardFormats = clipboardFormats
    }
  }

  if (inspectionKind === 'web-context' || inspectionKind === 'message-index') {
    if (pageTitle) {
      nextMetadata.pageTitle = pageTitle
    }
    if (sourceUrl) {
      nextMetadata.sourceUrl = sourceUrl
    }
    if (messageCount !== null) {
      nextMetadata.messageCount = messageCount
    }
  }

  if (inspectionKind === 'terminal-transcript') {
    if (sessionTitle) {
      nextMetadata.sessionTitle = sessionTitle
    }
    if (launchCount !== null) {
      nextMetadata.launchCount = launchCount
    }
  }

  if (inspectionKind === 'retrieval-audit') {
    if (launchCount !== null) {
      nextMetadata.launchCount = launchCount
    }
    if (normalizeRecordText(existingMetadata.threadTitle)) {
      nextMetadata.threadTitle = normalizeRecordText(existingMetadata.threadTitle)
    }
    if (normalizeRecordText(existingMetadata.latestAuditTimestamp)) {
      nextMetadata.latestAuditTimestamp = normalizeRecordText(existingMetadata.latestAuditTimestamp)
    }
    if (normalizeRecordInteger(existingMetadata.auditEntryCount) !== null) {
      nextMetadata.auditEntryCount = normalizeRecordInteger(existingMetadata.auditEntryCount)
    }
    if (retrievalQuery) {
      nextMetadata.retrievalQuery = retrievalQuery
    }
    if (retrievalOutcome) {
      nextMetadata.retrievalOutcome = retrievalOutcome
    }
    if (retrievalReason) {
      nextMetadata.retrievalReason = retrievalReason
    }
    if (retrievalMode) {
      nextMetadata.retrievalMode = retrievalMode
    }
    if (selectedScopeId) {
      nextMetadata.selectedScopeId = selectedScopeId
    }
    nextMetadata.candidateScopeIds = candidateScopeIds
  }

  return nextMetadata
}

function getArtifactSourceLabel(artifact: ArtifactRecord, metadata: Record<string, unknown>): string {
  const pageTitle = normalizeRecordText(metadata.pageTitle)
  if (pageTitle) {
    return pageTitle
  }

  const sessionTitle = normalizeRecordText(metadata.sessionTitle || metadata.panelTitle)
  if (sessionTitle) {
    return sessionTitle
  }

  const sourceUrl = normalizeRecordText(metadata.sourceUrl)
  if (sourceUrl) {
    return sourceUrl
  }

  const panelId = normalizeRecordText(metadata.panelId)
  if (panelId) {
    return panelId
  }

  return sanitizeOrigin(artifact.origin || 'manual') || artifact.id
}

function buildNormalizedArtifactSummary(artifact: ArtifactRecord, metadata: Record<string, unknown>): string {
  const inspectionKind = getArtifactInspectionKind(artifact)
  const previewText = normalizeRecordText(metadata.previewText) || null
  const sourceLabel = getArtifactSourceLabel(artifact, metadata)
  const messageCount = normalizeRecordInteger(metadata.messageCount)
  const launchCount = normalizeRecordInteger(metadata.launchCount)
  const existingSummary = normalizeRecordText(artifact.summary)

  switch (inspectionKind) {
    case 'manual-save': {
      const captureSource = normalizeRecordText(metadata.captureSource) || 'workspace'
      return `Manual ${humanizeArtifactTypeLabel(artifact.type)} saved from ${captureSource}.`
    }
    case 'web-context': {
      const messageSuffix =
        messageCount && messageCount > 0
          ? ` with ${messageCount} structured ${pluralize(messageCount, 'message')}.`
          : '.'
      return appendPreviewText(`Web context captured from ${sourceLabel}${messageSuffix}`, previewText)
    }
    case 'message-index': {
      const messageSuffix = messageCount && messageCount > 0 ? ` with ${messageCount} ${pluralize(messageCount, 'message')}.` : '.'
      return appendPreviewText(`Structured message index for ${sourceLabel}${messageSuffix}`, previewText)
    }
    case 'terminal-transcript': {
      const launchSuffix = launchCount !== null ? ` session ${launchCount}` : ''
      return `Terminal transcript for ${sourceLabel}${launchSuffix}.`
    }
    case 'retrieval-audit': {
      const query = normalizeRecordText(metadata.retrievalQuery)
      const outcome = normalizeRecordText(String(metadata.retrievalOutcome ?? '')).replace(/[_-]+/g, ' ')
      const reason = normalizeRecordText(metadata.retrievalReason)
      const selectedScopeId = normalizeRecordText(metadata.selectedScopeId)
      const base = query
        ? `Retrieval audit ${outcome || 'recorded'} for "${query}".`
        : `Retrieval audit ${outcome || 'recorded'}.`
      const selectedScope = selectedScopeId ? ` Selected scope: ${selectedScopeId}.` : ''
      const reasonSummary = reason ? ` Reason: ${reason}.` : ''
      return `${base}${selectedScope}${reasonSummary}`.trim()
    }
    default:
      return existingSummary || `${humanizeArtifactTypeLabel(artifact.type)} artifact from ${sanitizeOrigin(artifact.origin || 'manual')}.`
  }
}

function buildNormalizedArtifactTags(artifact: ArtifactRecord, metadata: Record<string, unknown>): string[] {
  const captureMode = inferArtifactCaptureMode(artifact)
  const inspectionKind = getArtifactInspectionKind(artifact)
  const messageCount = normalizeRecordInteger(metadata.messageCount)
  const retrievalOutcome = sanitizeOrigin(String(metadata.retrievalOutcome ?? ''))
  const retrievalMode = sanitizeOrigin(String(metadata.retrievalMode ?? ''))
  const semanticTags =
    inspectionKind === 'manual-save'
      ? ['manual', normalizeRecordText(metadata.captureSource) === 'clipboard' ? 'clipboard' : 'workspace']
      : inspectionKind === 'web-context'
        ? ['web', 'context', 'auto-capture']
        : inspectionKind === 'message-index'
          ? ['web', 'messages', 'session-index']
          : inspectionKind === 'terminal-transcript'
            ? ['terminal', 'session', 'transcript']
            : inspectionKind === 'retrieval-audit'
              ? ['retrieval', 'audit', 'session', retrievalMode || null, retrievalOutcome || null]
              : []

  return uniqueArtifactTags([
    artifact.type,
    artifact.origin,
    captureMode,
    ...semanticTags,
    ...(messageCount && messageCount > 0 ? ['structured-messages'] : []),
    ...(artifact.tags ?? [])
  ])
}

function buildArtifactInspectionSearchPhrases(artifact: ArtifactRecord): string[] {
  const metadata = artifact.metadata ?? {}

  return uniqueStrings([
    normalizeRecordText(metadata.contextLabel),
    normalizeRecordText(metadata.sessionScopeId),
    normalizeRecordText(metadata.pageTitle),
    normalizeRecordText(metadata.sessionTitle || metadata.panelTitle),
    normalizeRecordText(metadata.previewText),
    normalizeRecordText(metadata.retrievalQuery),
    normalizeRecordText(metadata.retrievalOutcome),
    normalizeRecordText(metadata.retrievalReason),
    normalizeRecordText(metadata.retrievalMode),
    normalizeRecordText(metadata.selectedScopeId),
    normalizeRecordText(metadata.threadTitle),
    ...normalizeRecordStringArray(metadata.candidateScopeIds)
  ])
}

export function normalizeArtifactRecord<TArtifact extends ArtifactRecord>(artifact: TArtifact): TArtifact {
  const normalizedOrigin = sanitizeOrigin(artifact.origin || 'manual')
  const withOrigin = normalizedOrigin === artifact.origin ? artifact : { ...artifact, origin: normalizedOrigin }
  const metadata = buildNormalizedArtifactMetadata(withOrigin)
  const normalizedArtifact = {
    ...withOrigin,
    summary: buildNormalizedArtifactSummary(withOrigin, metadata),
    tags: buildNormalizedArtifactTags(withOrigin, metadata),
    metadata
  }

  return normalizedArtifact as TArtifact
}

export function normalizeArtifactRecords<TArtifact extends ArtifactRecord>(artifacts: TArtifact[]): TArtifact[] {
  return artifacts.map((artifact) => normalizeArtifactRecord(artifact))
}

export function parseRetrievalAuditEntries(content: string): RetrievalAuditEntry[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as RetrievalAuditEntry]
      } catch {
        return []
      }
    })
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
}

function normalizeSearchPhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toSearchTokens(value: string): string[] {
  return normalizeSearchPhrase(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 || /^\d+$/u.test(token))
}

function buildContextRetrievalMetadata<TArtifact extends ArtifactRecord>(
  artifacts: TArtifact[],
  origin: string,
  contextLabel: string
): ContextRetrievalMetadata {
  const indexingArtifacts = artifacts.filter((artifact) => getArtifactInspectionKind(artifact) !== 'retrieval-audit')
  const relevantArtifacts = indexingArtifacts.length > 0 ? indexingArtifacts : artifacts
  const artifactTypes = [...new Set(relevantArtifacts.map((artifact) => artifact.type))].sort()
  const tags = uniqueStrings(relevantArtifacts.flatMap((artifact) => artifact.tags)).sort()
  const summaryPhrases = uniqueStrings(
    relevantArtifacts
      .map((artifact) => artifact.summary.replace(/\s+/g, ' ').trim())
      .filter((summary) => summary.length > 0)
  )
  const scopeSummary = summaryPhrases.slice(0, MAX_SCOPE_SUMMARY_PARTS).join(' | ')
  const searchPhrases = uniqueStrings([
    origin,
    contextLabel,
    ...artifactTypes,
    ...tags,
    ...summaryPhrases,
    ...relevantArtifacts.flatMap((artifact) => buildArtifactInspectionSearchPhrases(artifact))
  ])
  const searchTerms = uniqueStrings([...searchPhrases, ...searchPhrases.flatMap((phrase) => toSearchTokens(phrase))]).slice(
    0,
    MAX_SEARCH_TERMS
  )

  return {
    normalizedOrigin: origin,
    normalizedContextLabel: contextLabel,
    latestArtifactSummary: relevantArtifacts[0]?.summary.replace(/\s+/g, ' ').trim() || null,
    latestArtifactType: relevantArtifacts[0]?.type ?? null,
    artifactTypes,
    tags,
    searchTerms,
    scopeSummary
  }
}

export function buildContextEntries<TArtifact extends ArtifactRecord>(
  artifacts: TArtifact[],
  options: BuildContextEntriesOptions<TArtifact> = {}
): ContextIndexEntry[] {
  const normalizedArtifacts = normalizeArtifactRecords(artifacts)
  const groups = new Map<string, TArtifact[]>()
  const isArtifactSubstantive = options.isArtifactSubstantive ?? (() => true)

  for (const artifact of normalizedArtifacts) {
    const scopeId = getArtifactScopeId(artifact)
    const scopedArtifacts = groups.get(scopeId) ?? []
    scopedArtifacts.push(artifact)
    groups.set(scopeId, scopedArtifacts)
  }

  return [...groups.entries()]
    .filter(([, items]) => items.some((artifact) => isArtifactSubstantive(artifact)))
    .map(([scopeId, items]) => {
      const sorted = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      const first = sorted[0]

      return {
        origin: sanitizeOrigin(first?.origin || 'manual'),
        contextLabel: sanitizeContextLabel(String(first?.metadata?.contextLabel ?? '')),
        scopeId,
        threadId: getArtifactThreadId(first ?? { origin: 'manual', metadata: {} }),
        artifactCount: items.length,
        artifactIds: sorted.map((artifact) => artifact.id),
        latestArtifactId: sorted[0]?.id ?? null,
        latestUpdatedAt: sorted[0]?.updatedAt ?? null,
        retrieval: buildContextRetrievalMetadata(
          sorted,
          sanitizeOrigin(first?.origin || 'manual'),
          sanitizeContextLabel(String(first?.metadata?.contextLabel ?? ''))
        )
      } satisfies ContextIndexEntry
    })
    .sort((left, right) => (right.latestUpdatedAt ?? '').localeCompare(left.latestUpdatedAt ?? ''))
}

function deriveThreadTitle<TArtifact extends ArtifactRecord>(threadId: string, artifacts: TArtifact[]): string {
  const representative = [...artifacts]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .find((artifact) => artifact.summary.trim().length > 0) ?? artifacts[0]

  const metadataTitle = typeof representative?.metadata?.pageTitle === 'string' ? representative.metadata.pageTitle.trim() : ''
  if (metadataTitle) {
    return metadataTitle
  }

  const sessionTitle = typeof representative?.metadata?.sessionTitle === 'string' ? representative.metadata.sessionTitle.trim() : ''
  if (sessionTitle) {
    return sessionTitle
  }

  const explicitContext = typeof representative?.metadata?.contextLabel === 'string' ? representative.metadata.contextLabel.trim() : ''
  if (explicitContext) {
    return explicitContext
  }

  const explicitTitle = representative?.summary.replace(/\s+/g, ' ').trim()
  if (explicitTitle) {
    return explicitTitle.slice(0, 96)
  }

  return threadId
}

function buildThreadSearchTerms(thread: {
  threadId: string
  title: string
  originHints: string[]
  summary: string
  scopeIds: string[]
}): string[] {
  const searchPhrases = uniqueStrings([
    thread.threadId,
    thread.title,
    thread.summary,
    ...thread.originHints,
    ...thread.scopeIds
  ])

  return uniqueStrings([...searchPhrases, ...searchPhrases.flatMap((phrase) => toSearchTokens(phrase))]).slice(0, MAX_SEARCH_TERMS)
}

export function buildThreadEntries<TArtifact extends ArtifactRecord>(
  artifacts: TArtifact[],
  options: BuildThreadEntriesOptions<TArtifact> = {}
): ContextThreadSummary[] {
  const normalizedArtifacts = normalizeArtifactRecords(artifacts)
  const threadGroups = new Map<string, TArtifact[]>()
  const isArtifactSubstantive = options.isArtifactSubstantive ?? (() => true)

  for (const artifact of normalizedArtifacts) {
    const threadId = getArtifactThreadId(artifact)
    const items = threadGroups.get(threadId) ?? []
    items.push(artifact)
    threadGroups.set(threadId, items)
  }

  const explicitThreads = new Map(
    (options.explicitThreads ?? []).map((thread) => [sanitizeThreadId(thread.threadId), thread] satisfies [string, ThreadSeed])
  )
  const allThreadIds = new Set<string>([...threadGroups.keys(), ...explicitThreads.keys()])

  return [...allThreadIds]
    .map((threadId) => {
      const threadArtifacts = [...(threadGroups.get(threadId) ?? [])].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      const scopeIds = [...new Set(threadArtifacts.map((artifact) => getArtifactScopeId(artifact)))].sort()
      const originHints = uniqueStrings(threadArtifacts.map((artifact) => sanitizeOrigin(artifact.origin))).sort()
      const explicit = explicitThreads.get(threadId)
      const derived = explicit?.derived ?? !threadArtifacts.some((artifact) => String(artifact.metadata?.threadId ?? '').trim().length > 0)
      const summaryPhrases = uniqueStrings(threadArtifacts.map((artifact) => artifact.summary.replace(/\s+/g, ' ').trim()))
      const summary = summaryPhrases.slice(0, MAX_SCOPE_SUMMARY_PARTS).join(' | ')
      const title = explicit?.title?.trim() || deriveThreadTitle(threadId, threadArtifacts)

      return {
        threadId,
        title,
        derived,
        scopeIds,
        artifactIds: threadArtifacts.map((artifact) => artifact.id),
        scopeCount: scopeIds.length,
        artifactCount: threadArtifacts.length,
        latestArtifactId: threadArtifacts[0]?.id ?? null,
        latestUpdatedAt: threadArtifacts[0]?.updatedAt ?? null,
        originHints,
        searchTerms: buildThreadSearchTerms({
          threadId,
          title,
          originHints,
          summary,
          scopeIds
        }),
        summary
      } satisfies ContextThreadSummary
    })
    .filter((thread) => {
      if (thread.artifactIds.length === 0) {
        return true
      }

      return thread.artifactIds.some((artifactId) => {
        const artifact = normalizedArtifacts.find((item) => item.id === artifactId)
        return artifact ? isArtifactSubstantive(artifact) : false
      })
    })
    .sort((left, right) => {
      const byTime = (right.latestUpdatedAt ?? '').localeCompare(left.latestUpdatedAt ?? '')
      if (byTime !== 0) {
        return byTime
      }

      return left.title.localeCompare(right.title)
    })
}
