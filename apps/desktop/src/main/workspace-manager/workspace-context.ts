export interface WorkspaceManifestContext {
  projectId: string
  workspaceRoot: string
  manifestPath: string
  contextIndexPath: string
  originManifestsPath: string
  threadIndexPath: string
  threadManifestsPath: string
}

export interface WorkspaceSnapshotContext extends WorkspaceManifestContext {
  rulesPath: string
}
