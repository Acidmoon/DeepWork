## Why

`apps/desktop` now contains a meaningful amount of pure business logic for panels, workspace indexing, and capture normalization, but that logic is still scattered across renderer store files, shared type files, and main-process managers. `packages/core` already exists as a placeholder, yet the real desktop domain is still trapped inside the app shell, which makes reuse, testing, and future refactors harder than they need to be.

This change is needed now because the desktop workbench is no longer a thin scaffold. Search/preview, auto-capture, settings-driven panel composition, and workspace indexing are all live enough that keeping core rules embedded in Electron-facing modules will compound coupling in every later phase.

## What Changes

- Create `@ai-workbench/core` desktop-domain entrypoints for serializable models, config catalogs, and pure derivation utilities used by the desktop renderer and main process.
- Move pure panel, workspace, and capture normalization rules out of `apps/desktop` managers and store helpers into `packages/core` while preserving current snapshot and IPC contracts.
- Keep Electron lifecycle, filesystem access, clipboard access, PTY control, WebContents management, and settings persistence inside `apps/desktop` as adapter/orchestration code.
- Add extraction-focused verification through the existing desktop typecheck and regression-validation flows so the boundary change does not silently alter current behavior.

## Capabilities

### New Capabilities

- `desktop-core-domain`: Define the shared desktop core-domain package boundary, exports, and rule ownership between `packages/core` and `apps/desktop`.

### Modified Capabilities

None.

## Impact

- Affects `packages/core` package scaffolding, exports, and new source modules.
- Refactors imports and pure helper ownership across `apps/desktop/src/shared/*`, `apps/desktop/src/main/*`, and `apps/desktop/src/renderer/src/{types.ts,navigation.ts,store.ts}`.
- Intentionally preserves current user-visible behavior, IPC channels, manifest formats, and existing validation commands.
