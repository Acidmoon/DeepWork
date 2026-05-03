export function getWorkspaceFolderName(workspaceRoot: string): string {
  if (!workspaceRoot) {
    return ''
  }

  const normalized = workspaceRoot.replace(/[\\/]+$/, '')
  const parts = normalized.split(/[\\/]/)
  return parts[parts.length - 1] || normalized
}
