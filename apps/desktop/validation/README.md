# Desktop Validation Flows

The desktop app keeps focused validation flows under this directory instead of one broad end-to-end suite.

## Available Flows

- `workspace-regression/`: renderer-side secondary Workspace inspection, search, filtering, selection, and preview coverage
- `workspace-web-capture/`: managed web capture plus Workspace Sync coverage using deterministic workspace snapshots
- `workspace-retrieval/`: PowerShell validation for retrieval helpers, scope ranking, and retrieval-audit persistence
- `custom-web-panels/`: renderer and settings synchronization for built-in and custom web panels
- `terminal-panel-configuration/`: terminal panel configuration persistence, settings sync, and restart-to-apply semantics
- `workspace-profiles/`: workspace profile persistence, default startup selection, profile switching, and non-destructive profile removal
- `visual-smoke/`: modern minimal UI smoke coverage for Web, Terminal, Workspace, Settings, light/dark theme, and constrained viewport screenshots

## Recommended Order

For the internal alpha gate, run the scripted sequence from the repository root:

```powershell
npm run validate:internal-alpha
```

The sequence runs typecheck, retrieval-helper validation, a deterministic desktop build, an entrypoint precheck, the visual smoke flow, and then the browser-driven validation flows for workspace browsing, managed web capture, custom web panels, terminal panel configuration, and workspace profiles.

For narrower changes, run the matching focused flow after refreshing the deterministic renderer build:

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
npm run validate:visual-smoke -w @ai-workbench/desktop
npm run validate:workspace-regression -w @ai-workbench/desktop
npm run validate:workspace-profiles -w @ai-workbench/desktop
```

For UI redesign work, review the screenshots in `apps/desktop/validation/visual-smoke/artifacts/` after the flow passes. The acceptance target is no blank primary Web or Terminal surface, no toolbar/sidebar/form/list/inspector overlap, readable English and Simplified Chinese labels, and coherent light/dark hierarchy without decorative gradients.

Browser-driven validation defaults to `apps/desktop/out/renderer/index.html` and fails fast if that entrypoint is missing, references missing assets, or is older than renderer prerequisites. For targeted debugging only, override the renderer URL explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:workspace-regression
```
