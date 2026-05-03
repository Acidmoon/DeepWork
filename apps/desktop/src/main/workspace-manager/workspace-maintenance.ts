import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildContextEntries,
  buildThreadEntries,
  normalizeArtifactRecords,
  type ArtifactManifest,
  type ArtifactRecord,
  type ContextIndexEntry,
  type ContextThreadSummary,
  type WorkspaceMaintenanceAction,
  type WorkspaceMaintenanceFinding,
  type WorkspaceMaintenanceFindingKind,
  type WorkspaceMaintenanceMode,
  type WorkspaceMaintenanceReport
} from '@ai-workbench/core/desktop/workspace'
import {
  isSubstantiveArtifact,
  repairWorkspaceArtifactPath,
  resolveWorkspaceRelativePath,
  safeReadContextIndex,
  safeReadManifest,
  safeReadThreadIndex
} from './workspace-artifact-helpers'
import { type WorkspaceManifestContext } from './workspace-context'
import { writeContextIndexFiles } from './workspace-index'

interface WorkspaceMaintenanceContext extends WorkspaceManifestContext {
  projectId: string
}

interface MaintenanceAnalysis {
  initialized: boolean
  manifest: ArtifactManifest
  repairArtifacts: ArtifactRecord[]
  safeAvailableArtifacts: ArtifactRecord[]
  findings: WorkspaceMaintenanceFinding[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function isWorkspaceInitialized(context: WorkspaceMaintenanceContext): boolean {
  return Boolean(context.workspaceRoot && existsSync(context.workspaceRoot) && existsSync(context.manifestPath))
}

function makeFinding(
  kind: WorkspaceMaintenanceFindingKind,
  message: string,
  options: {
    artifactId?: string | null
    path?: string | null
    source?: string
    repairable?: boolean
    severity?: 'info' | 'warning' | 'error'
  } = {}
): WorkspaceMaintenanceFinding {
  const artifactId = options.artifactId ?? null
  const path = options.path ?? null
  return {
    id: `${kind}:${artifactId ?? path ?? options.source ?? message}`,
    kind,
    severity: options.severity ?? 'warning',
    message,
    artifactId,
    path,
    source: options.source ?? 'workspace',
    repairable: options.repairable ?? false
  }
}

function makeAction(
  kind: WorkspaceMaintenanceAction['kind'],
  status: WorkspaceMaintenanceAction['status'],
  message: string,
  options: {
    artifactId?: string | null
    path?: string | null
  } = {}
): WorkspaceMaintenanceAction {
  const artifactId = options.artifactId ?? null
  const path = options.path ?? null
  return {
    id: `${kind}:${artifactId ?? path ?? message}`,
    kind,
    status,
    message,
    artifactId,
    path
  }
}

function createReport(
  mode: WorkspaceMaintenanceMode,
  context: WorkspaceMaintenanceContext,
  initialized: boolean,
  findings: WorkspaceMaintenanceFinding[],
  actions: WorkspaceMaintenanceAction[] = [],
  changedFiles: string[] = []
): WorkspaceMaintenanceReport {
  const uniqueChangedFiles = [...new Set(changedFiles)]
  return {
    mode,
    workspaceRoot: context.workspaceRoot,
    generatedAt: nowIso(),
    initialized,
    findings,
    actions,
    changedFiles: uniqueChangedFiles,
    summary: {
      findingCount: findings.length,
      repairableCount: findings.filter((finding) => finding.repairable).length,
      destructiveFollowUpCount: findings.filter((finding) => !finding.repairable && finding.severity !== 'info').length,
      changedFileCount: uniqueChangedFiles.length
    }
  }
}

function readRawManifest(context: WorkspaceMaintenanceContext): ArtifactManifest {
  if (!existsSync(context.manifestPath)) {
    return {
      version: '1.0',
      projectId: context.projectId,
      workspaceRoot: context.workspaceRoot,
      artifacts: []
    }
  }

  try {
    const parsed = JSON.parse(readFileSync(context.manifestPath, 'utf8')) as Partial<ArtifactManifest>
    return {
      version: parsed.version ?? '1.0',
      projectId: parsed.projectId ?? context.projectId,
      workspaceRoot: context.workspaceRoot,
      artifacts: normalizeArtifactRecords(Array.isArray(parsed.artifacts) ? (parsed.artifacts as ArtifactRecord[]) : [])
    }
  } catch {
    return {
      version: '1.0',
      projectId: context.projectId,
      workspaceRoot: context.workspaceRoot,
      artifacts: []
    }
  }
}

function collectJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return []
  }

  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => join(directory, fileName))
}

function readFileOrNull(path: string): string | null {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null
  } catch {
    return null
  }
}

function collectDerivedFileContents(context: WorkspaceMaintenanceContext): Map<string, string | null> {
  const paths = [
    context.contextIndexPath,
    context.threadIndexPath,
    ...collectJsonFiles(context.originManifestsPath),
    ...collectJsonFiles(context.threadManifestsPath)
  ]
  return new Map(paths.map((path) => [path, readFileOrNull(path)] as const))
}

function diffChangedFiles(before: Map<string, string | null>, after: Map<string, string | null>): string[] {
  const paths = new Set([...before.keys(), ...after.keys()])
  return [...paths].filter((path) => before.get(path) !== after.get(path))
}

function stableContextEntries(entries: ContextIndexEntry[]): string {
  return JSON.stringify(
    entries.map((entry) => ({
      scopeId: entry.scopeId,
      threadId: entry.threadId,
      artifactIds: entry.artifactIds,
      artifactCount: entry.artifactCount,
      latestArtifactId: entry.latestArtifactId,
      latestUpdatedAt: entry.latestUpdatedAt
    }))
  )
}

function stableThreads(threads: ContextThreadSummary[], activeThreadId: string | null): string {
  return JSON.stringify({
    activeThreadId,
    threads: threads.map((thread) => ({
      threadId: thread.threadId,
      title: thread.title,
      derived: thread.derived,
      scopeIds: thread.scopeIds,
      artifactIds: thread.artifactIds,
      scopeCount: thread.scopeCount,
      artifactCount: thread.artifactCount,
      latestArtifactId: thread.latestArtifactId
    }))
  })
}

function collectDerivedArtifactIds(context: WorkspaceMaintenanceContext): Set<string> {
  const ids = new Set<string>()
  for (const entry of safeReadContextIndex(context.contextIndexPath, context.workspaceRoot).origins) {
    for (const artifactId of entry.artifactIds) {
      ids.add(artifactId)
    }
  }
  for (const thread of safeReadThreadIndex(context.threadIndexPath, context.workspaceRoot).threads) {
    for (const artifactId of thread.artifactIds) {
      ids.add(artifactId)
    }
  }
  return ids
}

function analyzeMaintenance(context: WorkspaceMaintenanceContext): MaintenanceAnalysis {
  const initialized = isWorkspaceInitialized(context)
  const manifest = readRawManifest(context)
  const findings: WorkspaceMaintenanceFinding[] = []
  const safeAvailableArtifacts: ArtifactRecord[] = []
  const repairArtifacts: ArtifactRecord[] = []

  if (!context.workspaceRoot.trim() || !initialized) {
    findings.push(
      makeFinding('uninitialized_workspace', 'Workspace is not initialized.', {
        source: 'workspace',
        severity: 'info',
        repairable: false
      })
    )
    return {
      initialized,
      manifest,
      repairArtifacts,
      safeAvailableArtifacts,
      findings
    }
  }

  const seenArtifactIds = new Set<string>()
  const validManifestIds = new Set<string>()

  for (const artifact of manifest.artifacts) {
    const duplicate = seenArtifactIds.has(artifact.id)
    seenArtifactIds.add(artifact.id)

    if (duplicate) {
      findings.push(
        makeFinding('duplicate_artifact_id', `Duplicate artifact id ${artifact.id} appears in the manifest.`, {
          artifactId: artifact.id,
          path: artifact.path,
          source: 'artifacts.json',
          repairable: true
        })
      )
      continue
    }

    const repairedArtifact = repairWorkspaceArtifactPath(context.workspaceRoot, artifact)
    const absolutePath = repairedArtifact ? resolveWorkspaceRelativePath(context.workspaceRoot, repairedArtifact.path) : null
    if (!repairedArtifact || !absolutePath) {
      findings.push(
        makeFinding('unsafe_artifact_path', `Artifact ${artifact.id} points outside the workspace root.`, {
          artifactId: artifact.id,
          path: artifact.path,
          source: 'artifacts.json',
          repairable: true,
          severity: 'error'
        })
      )
      continue
    }

    validManifestIds.add(repairedArtifact.id)

    if (!existsSync(absolutePath)) {
      findings.push(
        makeFinding('missing_artifact_file', `Artifact file is missing for ${artifact.id}.`, {
          artifactId: artifact.id,
          path: repairedArtifact.path,
          source: 'artifacts.json',
          repairable: true
        })
      )
      findings.push(
        makeFinding('orphaned_manifest_record', `Manifest record ${artifact.id} no longer has a readable artifact file.`, {
          artifactId: artifact.id,
          path: repairedArtifact.path,
          source: 'artifacts.json',
          repairable: true
        })
      )
      continue
    }

    safeAvailableArtifacts.push(repairedArtifact)
    repairArtifacts.push(repairedArtifact)
  }

  const derivedArtifactIds = collectDerivedArtifactIds(context)
  for (const artifactId of derivedArtifactIds) {
    if (!validManifestIds.has(artifactId)) {
      findings.push(
        makeFinding('orphaned_manifest_record', `Derived index references missing artifact ${artifactId}.`, {
          artifactId,
          source: 'derived-index',
          repairable: true
        })
      )
    }
  }

  const currentContextIndex = safeReadContextIndex(context.contextIndexPath, context.workspaceRoot)
  const currentThreadIndex = safeReadThreadIndex(context.threadIndexPath, context.workspaceRoot)
  const expectedContextEntries = buildContextEntries(safeAvailableArtifacts, {
    isArtifactSubstantive: (artifact) => isSubstantiveArtifact(artifact, context.workspaceRoot)
  })
  const expectedThreads = buildThreadEntries(safeAvailableArtifacts, {
    explicitThreads: currentThreadIndex.threads.map((thread) => ({
      threadId: thread.threadId,
      title: thread.title,
      derived: thread.derived
    })),
    isArtifactSubstantive: (artifact) => isSubstantiveArtifact(artifact, context.workspaceRoot)
  })
  const expectedActiveThreadId =
    currentThreadIndex.activeThreadId && expectedThreads.some((thread) => thread.threadId === currentThreadIndex.activeThreadId)
      ? currentThreadIndex.activeThreadId
      : expectedThreads[0]?.threadId ?? null

  if (stableContextEntries(currentContextIndex.origins) !== stableContextEntries(expectedContextEntries)) {
    findings.push(
      makeFinding('stale_derived_index', 'Context index is stale relative to current safe artifact metadata.', {
        path: context.contextIndexPath,
        source: 'context-index.json',
        repairable: true
      })
    )
  }

  if (stableThreads(currentThreadIndex.threads, currentThreadIndex.activeThreadId) !== stableThreads(expectedThreads, expectedActiveThreadId)) {
    findings.push(
      makeFinding('stale_derived_index', 'Thread index is stale relative to current safe artifact metadata.', {
        path: context.threadIndexPath,
        source: 'thread-index.json',
        repairable: true
      })
    )
  }

  return {
    initialized,
    manifest,
    repairArtifacts,
    safeAvailableArtifacts,
    findings
  }
}

export function scanWorkspaceMaintenance(context: WorkspaceMaintenanceContext): WorkspaceMaintenanceReport {
  const analysis = analyzeMaintenance(context)
  return createReport('scan', context, analysis.initialized, analysis.findings)
}

export function rebuildWorkspaceDerivedIndexes(context: WorkspaceMaintenanceContext): WorkspaceMaintenanceReport {
  const analysis = analyzeMaintenance(context)
  if (!context.workspaceRoot.trim() || !analysis.initialized) {
    return createReport('rebuild', context, analysis.initialized, analysis.findings)
  }

  const manifest = safeReadManifest(context.manifestPath, context.workspaceRoot, context.projectId)
  const before = collectDerivedFileContents(context)
  writeContextIndexFiles(context, manifest.artifacts)
  const after = collectDerivedFileContents(context)
  const changedFiles = diffChangedFiles(before, after)
  const actionStatus = changedFiles.length > 0 ? 'applied' : 'unchanged'
  const actions = [
    makeAction(
      'rebuild_derived_indexes',
      actionStatus,
      changedFiles.length > 0 ? 'Rebuilt derived workspace indexes.' : 'Derived workspace indexes were already current.'
    )
  ]
  const nextAnalysis = analyzeMaintenance(context)
  return createReport('rebuild', context, nextAnalysis.initialized, nextAnalysis.findings, actions, changedFiles)
}

export function repairWorkspaceMaintenance(context: WorkspaceMaintenanceContext): WorkspaceMaintenanceReport {
  const analysis = analyzeMaintenance(context)
  if (!context.workspaceRoot.trim() || !analysis.initialized) {
    return createReport('repair', context, analysis.initialized, analysis.findings)
  }

  const before = new Map([[context.manifestPath, readFileOrNull(context.manifestPath)], ...collectDerivedFileContents(context)])
  const manifestChanged = stableArtifactIds(analysis.manifest.artifacts) !== stableArtifactIds(analysis.repairArtifacts)
  const actions: WorkspaceMaintenanceAction[] = []

  if (manifestChanged) {
    writeFileSync(
      context.manifestPath,
      JSON.stringify(
        {
          ...analysis.manifest,
          workspaceRoot: context.workspaceRoot,
          projectId: context.projectId,
          artifacts: analysis.repairArtifacts
        },
        null,
        2
      ),
      'utf8'
    )

    for (const finding of analysis.findings.filter((item) => item.repairable && item.artifactId)) {
      actions.push(
        makeAction('remove_orphaned_manifest_record', 'applied', `Removed unsafe or orphaned manifest reference ${finding.artifactId}.`, {
          artifactId: finding.artifactId,
          path: finding.path
        })
      )
    }
  }

  writeContextIndexFiles(context, manifestChanged ? analysis.repairArtifacts : safeReadManifest(context.manifestPath, context.workspaceRoot, context.projectId).artifacts)
  actions.push(makeAction('rebuild_derived_indexes', 'applied', 'Rebuilt derived workspace indexes after safe repair.'))

  for (const finding of analysis.findings.filter((item) => !item.repairable && item.severity !== 'info')) {
    actions.push(
      makeAction('skip_destructive_follow_up', 'skipped', finding.message, {
        artifactId: finding.artifactId,
        path: finding.path
      })
    )
  }

  const after = new Map([[context.manifestPath, readFileOrNull(context.manifestPath)], ...collectDerivedFileContents(context)])
  const changedFiles = diffChangedFiles(before, after)
  const nextAnalysis = analyzeMaintenance(context)
  return createReport('repair', context, nextAnalysis.initialized, nextAnalysis.findings, actions, changedFiles)
}

function stableArtifactIds(artifacts: ArtifactRecord[]): string {
  return JSON.stringify(artifacts.map((artifact) => `${artifact.id}:${artifact.path}`))
}
