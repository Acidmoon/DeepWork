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
        latestUpdatedAt: sorted[0]?.updatedAt ?? null
      } satisfies ContextIndexEntry
    })
    .sort((left, right) => (right.latestUpdatedAt ?? '').localeCompare(left.latestUpdatedAt ?? ''))
}
