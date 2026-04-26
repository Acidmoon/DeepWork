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
