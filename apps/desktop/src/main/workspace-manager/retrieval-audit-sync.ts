import { join } from 'node:path'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { parseRetrievalAuditEntries, sanitizeOrigin, type ArtifactManifest, type ArtifactRecord } from '@ai-workbench/core/desktop/workspace'
import {
  buildRetrievalAuditArtifactId,
  buildRetrievalAuditSummary,
  hashContent,
  safeReadManifest,
  toRetrievalAuditMetadata
} from './workspace-artifact-helpers'
import { type WorkspaceManifestContext } from './workspace-context'
import { writeContextIndexFiles } from './workspace-index'

export function syncRetrievalAuditArtifactsFromLogs(
  context: WorkspaceManifestContext,
  sessionScopeId: string | null,
  lastSavedArtifactId: string | null
): { manifest: ArtifactManifest; lastSavedArtifactId: string | null } {
  const manifest = safeReadManifest(context.manifestPath, context.workspaceRoot, context.projectId)
  const retrievalDirectory = join(context.workspaceRoot, 'logs', 'retrieval')
  if (!existsSync(retrievalDirectory)) {
    return {
      manifest,
      lastSavedArtifactId
    }
  }

  const candidateFiles = readdirSync(retrievalDirectory)
    .filter((fileName) => fileName.endsWith('.jsonl'))
    .filter((fileName) => !sessionScopeId || fileName === `${sessionScopeId}.jsonl`)

  let nextArtifacts = manifest.artifacts
  let changed = false
  let nextLastSavedArtifactId = lastSavedArtifactId

  for (const fileName of candidateFiles) {
    const relativePath = join('logs', 'retrieval', fileName).replaceAll('\\', '/')
    const absolutePath = join(context.workspaceRoot, relativePath)
    if (!existsSync(absolutePath)) {
      continue
    }

    const content = readFileSync(absolutePath, 'utf8')
    const entries = parseRetrievalAuditEntries(content)
    if (entries.length === 0) {
      continue
    }

    const latestEntry = entries[entries.length - 1]
    const resolvedSessionScopeId =
      String(latestEntry.session?.sessionScopeId ?? '').trim() || fileName.replace(/\.jsonl$/i, '')
    const artifactId = buildRetrievalAuditArtifactId(resolvedSessionScopeId)
    const origin = sanitizeOrigin(String(latestEntry.session?.panelId ?? 'manual'))
    const summary = buildRetrievalAuditSummary(latestEntry)
    const metadata = toRetrievalAuditMetadata(latestEntry, entries.length, resolvedSessionScopeId)
    const stat = statSync(absolutePath)
    const hash = hashContent(content)
    const tags = [...new Set(['log', 'retrieval', 'audit', origin])]
    const existingArtifact = nextArtifacts.find((artifact) => artifact.id === artifactId) ?? null

    const nextArtifact: ArtifactRecord = {
      id: artifactId,
      name: existingArtifact?.name ?? fileName,
      type: 'log',
      path: relativePath,
      absolutePath,
      origin,
      summary,
      tags,
      parents: existingArtifact?.parents ?? [],
      createdAt: existingArtifact?.createdAt ?? latestEntry.timestamp,
      updatedAt: latestEntry.timestamp,
      size: stat.size,
      hash,
      metadata
    }

    const hasChanged =
      !existingArtifact ||
      existingArtifact.hash !== nextArtifact.hash ||
      existingArtifact.summary !== nextArtifact.summary ||
      JSON.stringify(existingArtifact.metadata ?? {}) !== JSON.stringify(nextArtifact.metadata ?? {})

    if (!hasChanged) {
      continue
    }

    changed = true
    nextArtifacts = existingArtifact
      ? nextArtifacts.map((artifact) => (artifact.id === artifactId ? nextArtifact : artifact))
      : [...nextArtifacts, nextArtifact]
    nextLastSavedArtifactId = artifactId
  }

  if (!changed) {
    return {
      manifest,
      lastSavedArtifactId: nextLastSavedArtifactId
    }
  }

  const nextManifest: ArtifactManifest = {
    ...manifest,
    workspaceRoot: context.workspaceRoot,
    projectId: context.projectId,
    artifacts: nextArtifacts
  }

  writeFileSync(context.manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
  writeContextIndexFiles(context, nextManifest.artifacts)

  return {
    manifest: nextManifest,
    lastSavedArtifactId: nextLastSavedArtifactId
  }
}
