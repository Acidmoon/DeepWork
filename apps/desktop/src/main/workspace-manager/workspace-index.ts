import { join } from 'node:path'
import { readdirSync, rmSync, writeFileSync } from 'node:fs'
import {
  buildContextEntries,
  buildThreadEntries,
  getArtifactThreadId,
  normalizeArtifactRecords,
  sanitizeContextLabel,
  sanitizeOrigin,
  type ArtifactRecord,
  type ContextIndexManifest,
  type ThreadArtifactManifest,
  type ThreadIndexManifest,
  type OriginArtifactManifest
} from '@ai-workbench/core/desktop/workspace'
import { isSubstantiveArtifact, safeReadThreadIndex } from './workspace-artifact-helpers'

interface WriteWorkspaceIndexOptions {
  activeThreadId?: string | null
}

export function writeContextIndexFiles(
  context: {
    workspaceRoot: string
    contextIndexPath: string
    originManifestsPath: string
    threadIndexPath: string
    threadManifestsPath: string
  },
  artifacts: ArtifactRecord[],
  options: WriteWorkspaceIndexOptions = {}
): void {
  const normalizedArtifacts = normalizeArtifactRecords(artifacts)
  const nextIndex: ContextIndexManifest = {
    version: '1.0',
    workspaceRoot: context.workspaceRoot,
    origins: buildContextEntries(normalizedArtifacts, {
      isArtifactSubstantive: isSubstantiveArtifact
    })
  }

  writeFileSync(context.contextIndexPath, JSON.stringify(nextIndex, null, 2), 'utf8')

  for (const fileName of readdirSync(context.originManifestsPath)) {
    if (fileName.endsWith('.json')) {
      rmSync(join(context.originManifestsPath, fileName), { force: true })
    }
  }

  for (const entry of nextIndex.origins) {
    const originArtifacts = normalizedArtifacts.filter((artifact) => sanitizeOrigin(artifact.origin) === entry.origin)
      .filter((artifact) => sanitizeContextLabel(String(artifact.metadata?.contextLabel ?? '')) === entry.contextLabel)
    const originManifest: OriginArtifactManifest = {
      version: '1.0',
      workspaceRoot: context.workspaceRoot,
      origin: entry.origin,
      contextLabel: entry.contextLabel,
      scopeId: entry.scopeId,
      artifacts: originArtifacts
    }

    writeFileSync(join(context.originManifestsPath, `${entry.scopeId}.json`), JSON.stringify(originManifest, null, 2), 'utf8')
  }

  const previousThreadIndex = safeReadThreadIndex(context.threadIndexPath, context.workspaceRoot)
  const nextThreads = buildThreadEntries(normalizedArtifacts, {
    explicitThreads: previousThreadIndex.threads.map((thread) => ({
      threadId: thread.threadId,
      title: thread.title,
      derived: thread.derived
    })),
    isArtifactSubstantive: isSubstantiveArtifact
  })
  const requestedActiveThreadId = Object.prototype.hasOwnProperty.call(options, 'activeThreadId')
    ? options.activeThreadId ?? null
    : previousThreadIndex.activeThreadId
  const resolvedActiveThreadId =
    requestedActiveThreadId && nextThreads.some((thread) => thread.threadId === requestedActiveThreadId)
      ? requestedActiveThreadId
      : nextThreads[0]?.threadId ?? null
  const nextThreadIndex: ThreadIndexManifest = {
    version: '1.0',
    workspaceRoot: context.workspaceRoot,
    activeThreadId: resolvedActiveThreadId,
    threads: nextThreads
  }

  writeFileSync(context.threadIndexPath, JSON.stringify(nextThreadIndex, null, 2), 'utf8')

  for (const fileName of readdirSync(context.threadManifestsPath)) {
    if (fileName.endsWith('.json')) {
      rmSync(join(context.threadManifestsPath, fileName), { force: true })
    }
  }

  for (const thread of nextThreads) {
    const threadArtifacts = normalizedArtifacts.filter((artifact) => getArtifactThreadId(artifact) === thread.threadId)
    const threadManifest: ThreadArtifactManifest = {
      version: '1.0',
      workspaceRoot: context.workspaceRoot,
      threadId: thread.threadId,
      title: thread.title,
      derived: thread.derived,
      scopeIds: thread.scopeIds,
      artifacts: threadArtifacts
    }

    writeFileSync(join(context.threadManifestsPath, `${thread.threadId}.json`), JSON.stringify(threadManifest, null, 2), 'utf8')
  }
}
