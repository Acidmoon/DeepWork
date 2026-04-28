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
  rulesPath: string
  initialized: boolean
  artifactCount: number
  bucketCounts: Record<string, number>
  contextEntries: ContextIndexEntry[]
  artifacts: ArtifactRecord[]
  recentArtifacts: ArtifactRecord[]
  lastSavedArtifactId: string | null
  lastError: string | null
}

export interface SaveClipboardOptions {
  origin: string
  contextLabel?: string
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
