export type ArtifactType = 'html' | 'markdown' | 'text' | 'pdf' | 'image' | 'code' | 'json' | 'review' | 'log'

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
  const artifactTypes = [...new Set(artifacts.map((artifact) => artifact.type))].sort()
  const tags = uniqueStrings(artifacts.flatMap((artifact) => artifact.tags)).sort()
  const summaryPhrases = uniqueStrings(
    artifacts
      .map((artifact) => artifact.summary.replace(/\s+/g, ' ').trim())
      .filter((summary) => summary.length > 0)
  )
  const scopeSummary = summaryPhrases.slice(0, MAX_SCOPE_SUMMARY_PARTS).join(' | ')
  const searchPhrases = uniqueStrings([
    origin,
    contextLabel,
    ...artifactTypes,
    ...tags,
    ...summaryPhrases
  ])
  const searchTerms = uniqueStrings([...searchPhrases, ...searchPhrases.flatMap((phrase) => toSearchTokens(phrase))]).slice(
    0,
    MAX_SEARCH_TERMS
  )

  return {
    normalizedOrigin: origin,
    normalizedContextLabel: contextLabel,
    latestArtifactSummary: artifacts[0]?.summary.replace(/\s+/g, ' ').trim() || null,
    latestArtifactType: artifacts[0]?.type ?? null,
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
  const groups = new Map<string, TArtifact[]>()
  const isArtifactSubstantive = options.isArtifactSubstantive ?? (() => true)

  for (const artifact of artifacts) {
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
  const threadGroups = new Map<string, TArtifact[]>()
  const isArtifactSubstantive = options.isArtifactSubstantive ?? (() => true)

  for (const artifact of artifacts) {
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
        const artifact = artifacts.find((item) => item.id === artifactId)
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
