## Why

`apps/desktop/src/renderer/src/panel-content.tsx` and `apps/desktop/src/main/workspace-manager.ts` have both grown into multi-responsibility files that now combine unrelated rendering, orchestration, formatting, persistence, and indexing concerns. That coupling makes routine changes harder to review, raises regression risk, and keeps validation-sensitive logic trapped inside oversized modules.

This change is needed now because the desktop workbench already has stable panel, workspace, retrieval, and validation behavior worth preserving, but the current file layout makes the next round of feature work likely to reopen the same files for unrelated reasons. Splitting the modules now creates clearer ownership boundaries before more behavior accumulates on top of them.

## What Changes

- Split `panel-content.tsx` into focused renderer modules so panel-specific UI, workspace browsing state, and workspace preview/formatting helpers no longer live in one file.
- Split `workspace-manager.ts` into focused main-process modules so workspace bootstrap content, clipboard capture detection, artifact persistence, context-index writing, retrieval-audit synchronization, and snapshot assembly have explicit ownership boundaries.
- Preserve the current renderer behavior, preload contracts, workspace manifest formats, and validation command surface while moving code into smaller modules.
- Re-run the existing desktop typecheck and targeted validation flows so the structural refactor does not silently alter workspace browsing, web capture persistence, or custom panel behavior.

## Capabilities

### New Capabilities

- `desktop-module-boundaries`: Define the required module boundaries for large desktop renderer and workspace-management code so structural refactors can preserve current behavior while reducing ownership overlap.

### Modified Capabilities

None.

## Impact

- Affects `apps/desktop/src/renderer/src/panel-content.tsx` and new sibling renderer modules/hooks/helpers extracted from it.
- Affects `apps/desktop/src/main/workspace-manager.ts` and new sibling main-process modules/helpers extracted from it.
- Intentionally preserves existing IPC contracts, workspace snapshot shapes, persisted artifact/index formats, and current validation entrypoints.
