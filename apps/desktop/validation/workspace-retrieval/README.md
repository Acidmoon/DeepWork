# Workspace Retrieval Validation

This validation exercises the managed CLI retrieval helper flow without starting the desktop renderer:

- verifies `WORKSPACE_PROTOCOL` and managed instruction blocks encode self-contained vs context-dependent behavior
- verifies the workspace manager source exposes retrieval-audit synchronization and workspace-managed audit capture markers
- runs the generated `WORKBENCH_TOOLS.ps1` against a fixture workspace
- checks that `aw-suggest` ranks scope candidates from `context-index.json`
- checks that no-match lookups stay structured and content-free
- checks that superseded pending lookups are finalized explicitly before the next selection flow continues
- checks that retrieval audit entries capture query, ranked candidates, selected scope, and no-match outcomes

## Run

From the repo root:

```powershell
npm run validate:workspace-retrieval
```

Or from the desktop workspace:

```powershell
npm run validate:workspace-retrieval -w @ai-workbench/desktop
```
