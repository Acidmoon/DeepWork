## Why

Recent code review identified several trust-boundary gaps in the Electron desktop app: workspace artifact paths are trusted from mutable manifests, web-panel URL safety depends too much on renderer-side validation, custom web-panel settings are not normalized like terminal panels, and terminal transcript capture can grow without bound. These issues should be fixed before the app is treated as a reliable workspace host for local files, persisted browser panels, and long-running CLI sessions.

## What Changes

- Resolve workspace artifact reads, overwrites, and deletions through validated workspace-relative paths instead of trusting persisted absolute paths.
- Enforce HTTP/HTTPS web-panel home URL normalization in the main process for settings load, settings update, built-in web-panel update, and custom web-panel synchronization.
- Normalize custom web-panel definitions structurally, including required fields, safe URL, partition fallback, duplicate handling, and built-in ID collision avoidance.
- Bound or rotate managed terminal transcript persistence so long-running sessions do not retain and rewrite unbounded transcript content in memory.
- Add focused validation coverage for malformed workspace manifests, unsafe web-panel settings, malformed custom panel settings, and long terminal transcript behavior.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workspace-context-management`: Artifact file operations must remain inside the selected workspace root even when persisted manifest records are malformed or hostile.
- `settings-and-panel-extensibility`: Settings persistence and hydration must normalize custom web panels and reject unsafe web targets at the main-process boundary.
- `desktop-workbench-panels`: Managed web panels must only mount and navigate initial/home targets after main-process URL validation.
- `desktop-regression-validation`: Regression coverage must include security-boundary and resource-boundary cases for workspace paths, web-panel settings, and terminal transcript persistence.

## Impact

- Affected code: `apps/desktop/src/main/workspace-manager*`, `apps/desktop/src/main/settings-manager.ts`, `apps/desktop/src/main/web-panel-manager.ts`, `apps/desktop/src/main/terminal-manager.ts`, preload IPC handlers where validation boundaries are enforced, and focused validation scripts/fixtures.
- Affected runtime behavior: malformed settings or workspace manifests are ignored, repaired, or rejected instead of causing unsafe file access, unsafe web loads, startup crashes, or unbounded memory growth.
- No breaking user-facing workflow is intended; valid existing workspace artifacts, web panels, terminal panels, and settings should continue to load.
