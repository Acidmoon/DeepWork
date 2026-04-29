# Desktop Validation Flows

The desktop app keeps focused validation flows under this directory instead of one broad end-to-end suite.

## Available Flows

- `workspace-regression/`: renderer-side workspace search, filtering, selection, and preview coverage
- `workspace-web-capture/`: managed web capture plus Workspace Sync coverage using deterministic workspace snapshots
- `workspace-retrieval/`: PowerShell validation for retrieval helpers, scope ranking, and retrieval-audit persistence
- `custom-web-panels/`: renderer and settings synchronization for built-in and custom web panels
- `terminal-panel-configuration/`: terminal panel configuration persistence, settings sync, and restart-to-apply semantics

## Recommended Order

1. Run typecheck:

```powershell
npm run typecheck -w @ai-workbench/desktop
```

2. Run the focused validation flow that matches the area you changed.

3. If your change crosses multiple areas, run each relevant validation flow instead of assuming one script covers all of them.
