# Desktop Validation Flows

The desktop app keeps focused validation flows under this directory instead of one broad end-to-end suite.

## Available Flows

- `workspace-regression/`: renderer-side secondary Workspace inspection, search, filtering, selection, and preview coverage
- `workspace-web-capture/`: managed web capture plus Workspace Sync coverage using deterministic workspace snapshots
- `workspace-retrieval/`: PowerShell validation for retrieval helpers, scope ranking, and retrieval-audit persistence
- `custom-web-panels/`: renderer and settings synchronization for built-in and custom web panels
- `terminal-panel-configuration/`: terminal panel configuration persistence, settings sync, and restart-to-apply semantics

## Recommended Order

For the internal alpha gate, run the scripted sequence from the repository root:

```powershell
npm run validate:internal-alpha
```

The sequence runs typecheck, retrieval-helper validation, a deterministic desktop build, an entrypoint precheck, and then the browser-driven validation flows for workspace browsing, managed web capture, custom web panels, and terminal panel configuration.

For narrower changes, run the matching focused flow after refreshing the deterministic renderer build:

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
npm run validate:workspace-regression -w @ai-workbench/desktop
```

Browser-driven validation defaults to `apps/desktop/out/renderer/index.html` and fails fast if that entrypoint is missing, references missing assets, or is older than renderer prerequisites. For targeted debugging only, override the renderer URL explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:workspace-regression
```
