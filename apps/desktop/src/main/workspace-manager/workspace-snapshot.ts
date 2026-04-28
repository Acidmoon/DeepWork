import { existsSync } from 'node:fs'
import { bucketCounts, type ArtifactManifest, type WorkspaceSnapshot } from '@ai-workbench/core/desktop/workspace'
import { safeReadContextIndex, safeReadThreadIndex } from './workspace-artifact-helpers'
import { type WorkspaceSnapshotContext } from './workspace-context'

export function buildWorkspaceSnapshot(
  context: WorkspaceSnapshotContext,
  manifest: ArtifactManifest,
  lastSavedArtifactId: string | null,
  lastError: string | null
): WorkspaceSnapshot {
  const contextIndex = safeReadContextIndex(context.contextIndexPath, context.workspaceRoot)
  const threadIndex = safeReadThreadIndex(context.threadIndexPath, context.workspaceRoot)
  const activeThread = threadIndex.threads.find((thread) => thread.threadId === threadIndex.activeThreadId) ?? null

  return {
    projectId: context.projectId,
    workspaceRoot: context.workspaceRoot,
    manifestPath: context.manifestPath,
    contextIndexPath: context.contextIndexPath,
    originManifestsPath: context.originManifestsPath,
    threadIndexPath: context.threadIndexPath,
    threadManifestsPath: context.threadManifestsPath,
    rulesPath: context.rulesPath,
    initialized: existsSync(context.workspaceRoot) && existsSync(context.manifestPath) && existsSync(context.contextIndexPath),
    artifactCount: manifest.artifacts.length,
    bucketCounts: bucketCounts(manifest.artifacts),
    contextEntries: contextIndex.origins,
    threads: threadIndex.threads,
    activeThreadId: threadIndex.activeThreadId,
    activeThreadTitle: activeThread?.title ?? null,
    artifacts: [...manifest.artifacts].reverse(),
    recentArtifacts: [...manifest.artifacts].slice(-10).reverse(),
    lastSavedArtifactId,
    lastError
  }
}
