import { dirname, join, relative } from 'node:path'
import { statSync, writeFileSync } from 'node:fs'
import {
  artifactDirectories,
  sanitizeContextLabel,
  sanitizeOrigin,
  type ArtifactRecord,
  type ArtifactType
} from '@ai-workbench/core/desktop/workspace'
import { ensureDirectory, fileNameForArtifact, hashContent, nextArtifactId, safeReadManifest } from './workspace-artifact-helpers'
import { type WorkspaceManifestContext } from './workspace-context'
import { writeContextIndexFiles } from './workspace-index'

export interface SaveTextArtifactOptions {
  type: ArtifactType
  content: string
  origin: string
  summary: string
  tags?: string[]
  contextLabel?: string
  metadata?: Record<string, unknown>
  artifactId?: string | null
  fileName?: string
  relativePath?: string
}

export function saveTextArtifactToWorkspace(
  context: WorkspaceManifestContext,
  options: SaveTextArtifactOptions
): { artifact: ArtifactRecord | null; lastSavedArtifactId: string | null } {
  const manifest = safeReadManifest(context.manifestPath, context.workspaceRoot, context.projectId)
  const existingArtifact = options.artifactId
    ? manifest.artifacts.find((artifact) => artifact.id === options.artifactId) ?? null
    : null
  const artifactType = existingArtifact?.type ?? options.type
  const id = existingArtifact?.id ?? nextArtifactId(artifactType, manifest)
  const fileName = existingArtifact?.name ?? options.fileName ?? fileNameForArtifact(id, artifactType)
  const relativePath =
    existingArtifact?.path ?? options.relativePath ?? join(artifactDirectories[artifactType], fileName).replaceAll('\\', '/')
  const absolutePath = join(context.workspaceRoot, relativePath)
  const createdAt = existingArtifact?.createdAt ?? new Date().toISOString()
  const updatedAt = new Date().toISOString()
  const origin = sanitizeOrigin(options.origin || existingArtifact?.origin || 'manual')
  const contextLabel = sanitizeContextLabel(options.contextLabel ?? String(existingArtifact?.metadata?.contextLabel ?? ''))

  ensureDirectory(dirname(absolutePath))
  ensureDirectory(join(context.workspaceRoot, 'outputs', origin))
  writeFileSync(absolutePath, options.content, 'utf8')

  const stat = statSync(absolutePath)
  const artifact: ArtifactRecord = {
    id,
    name: fileName,
    type: artifactType,
    path: relative(context.workspaceRoot, absolutePath).replaceAll('\\', '/'),
    absolutePath,
    origin,
    summary: options.summary,
    tags: [...new Set([artifactType, origin, ...(existingArtifact?.tags ?? []), ...(options.tags ?? [])])],
    parents: existingArtifact?.parents ?? [],
    createdAt,
    updatedAt,
    size: stat.size,
    hash: hashContent(options.content),
    metadata: {
      ...(existingArtifact?.metadata ?? {}),
      ...(options.metadata ?? {}),
      contextLabel
    }
  }

  const nextManifest = {
    ...manifest,
    workspaceRoot: context.workspaceRoot,
    projectId: context.projectId,
    artifacts: existingArtifact
      ? manifest.artifacts.map((item) => (item.id === artifact.id ? artifact : item))
      : [...manifest.artifacts, artifact]
  }

  writeFileSync(context.manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
  writeContextIndexFiles(context, nextManifest.artifacts)

  return {
    artifact,
    lastSavedArtifactId: artifact.id
  }
}
