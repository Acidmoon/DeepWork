# Desktop Validation Flows

The desktop app keeps focused validation flows under this directory instead of one broad end-to-end suite.

## Available Flows

- `workspace-regression/`: renderer-side secondary Workspace inspection, Logs inspection, search, filtering, selection, preview, and maintenance-control coverage
- `workspace-web-capture/`: managed web capture plus Workspace Sync coverage using deterministic workspace snapshots
- `workspace-retrieval/`: PowerShell validation for retrieval helpers, scope ranking, and retrieval-audit persistence
- `custom-web-panels/`: renderer and settings synchronization for built-in DeepSeek/MiniMax panels and custom web panels
- `terminal-panel-configuration/`: terminal panel configuration persistence, settings sync, and restart-to-apply semantics
- `terminal-behavior/`: global terminal behavior settings, scrollback synchronization, copy-on-selection, multi-line paste confirmation, and implemented Settings controls
- `workspace-profiles/`: workspace profile persistence, default startup selection, profile switching, and non-destructive profile removal
- `visual-smoke/`: modern minimal UI smoke coverage for Web, Terminal, inline retrieval context, Workspace, Logs, Settings, light/dark theme, and constrained viewport screenshots
- `security-boundaries/`: main-process and workspace boundary checks for unsafe paths, workspace confinement, settings normalization, and maintenance fixtures
- `package-win/`: Windows alpha package smoke coverage for the generated unpacked app artifact and first-launch workspace behavior

## Recommended Order

For the internal alpha gate, run the scripted sequence from the repository root:

```powershell
npm run validate:internal-alpha
```

The sequence runs typecheck, retrieval-helper validation, a deterministic desktop build, an entrypoint precheck, security-boundary checks, the visual smoke flow, and then the browser-driven validation flows for workspace browsing, Logs inspection, managed web capture, custom web panels, terminal panel configuration, terminal behavior, and workspace profiles.

For narrower changes, run the matching focused flow after refreshing the deterministic renderer build:

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
npm run validate:visual-smoke -w @ai-workbench/desktop
npm run validate:workspace-regression -w @ai-workbench/desktop
npm run validate:security-boundaries -w @ai-workbench/desktop
npm run validate:custom-web-panels -w @ai-workbench/desktop
npm run validate:terminal-behavior -w @ai-workbench/desktop
npm run validate:workspace-profiles -w @ai-workbench/desktop
```

For UI redesign work, review the screenshots in `apps/desktop/validation/visual-smoke/artifacts/` after the flow passes. The acceptance target is no blank primary Web or Terminal surface, no toolbar/sidebar/form/list/inspector overlap, readable English and Simplified Chinese labels, and coherent light/dark hierarchy without decorative gradients.

Use `workspace-regression/` when changing Workspace artifact browsing, Logs inspection, preview behavior, or maintenance controls. Its deterministic fixtures include normal artifacts, log records, retrieval audit records, stale indexes, missing files, orphaned records, duplicate IDs, and unsafe paths.

Use `custom-web-panels/` when changing built-in panel defaults or web-panel settings. It verifies that MiniMax starts as an enabled managed panel by default, runtime navigation stays separate from saved home URL configuration, disabling MiniMax returns it to reserved state, and re-enabling restores the managed lifecycle.

Use `visual-smoke/` and `terminal-behavior/` when changing terminal details or Settings. The current coverage includes the compact CLI retrieval summary in the terminal inspector and the absence of the old empty placeholder-only Settings scaffold.

Browser-driven validation defaults to `apps/desktop/out/renderer/index.html` and fails fast if that entrypoint is missing, references missing assets, or is older than renderer prerequisites. For targeted debugging only, override the renderer URL explicitly:

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
npm run validate:workspace-regression
```

## Windows Alpha Distribution

For release preparation on Windows, use the root preflight:

```powershell
npm run release:win-alpha
```

That command runs `validate:internal-alpha`, generates the unpacked Windows package with `npm run package:win`, and then runs `npm run validate:package-win`. The package smoke expects `release/windows-alpha/win-unpacked/DeepWork.exe`, launches it with isolated userData/documents directories, and verifies that the renderer shell loads without implicitly selecting or creating a Workspace.

The package command keeps native modules unpacked from asar but does not force a rebuild on every package run. Run `npm run rebuild:native` before packaging when `node-pty` ABI errors appear after changing Node, Electron, or Visual Studio build tools. The generated `release/` directory is local build output and remains ignored by git.
