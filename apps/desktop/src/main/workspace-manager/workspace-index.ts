import { join } from 'node:path'
import { readdirSync, rmSync, writeFileSync } from 'node:fs'
import {
  buildContextEntries,
  sanitizeContextLabel,
  sanitizeOrigin,
  type ArtifactRecord,
  type ContextIndexManifest,
  type OriginArtifactManifest
} from '@ai-workbench/core/desktop/workspace'
import { isSubstantiveArtifact } from './workspace-artifact-helpers'

export function writeContextIndexFiles(
  context: {
    workspaceRoot: string
    contextIndexPath: string
    originManifestsPath: string
  },
  artifacts: ArtifactRecord[]
): void {
  const nextIndex: ContextIndexManifest = {
    version: '1.0',
    workspaceRoot: context.workspaceRoot,
    origins: buildContextEntries(artifacts, {
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
    const originArtifacts = artifacts.filter((artifact) => sanitizeOrigin(artifact.origin) === entry.origin)
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
}
