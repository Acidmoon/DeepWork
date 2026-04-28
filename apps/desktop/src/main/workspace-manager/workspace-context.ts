export interface WorkspaceManifestContext {
  projectId: string
  workspaceRoot: string
  manifestPath: string
  contextIndexPath: string
  originManifestsPath: string
}

export interface WorkspaceSnapshotContext extends WorkspaceManifestContext {
  rulesPath: string
}
