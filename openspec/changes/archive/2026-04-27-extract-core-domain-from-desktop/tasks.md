## 1. Core Package Scaffolding

- [x] 1.1 Create `packages/core` package metadata and desktop-domain entrypoints that can be resolved from `apps/desktop`.
- [x] 1.2 Establish the initial core module layout for settings, panels, web panels, terminal panels, workspace models, and capture utilities.

## 2. Shared Model Extraction

- [x] 2.1 Move serializable shared types and config catalogs out of `apps/desktop/src/shared/*` into `@ai-workbench/core` without changing their public shapes.
- [x] 2.2 Move panel-domain type definitions and catalog metadata out of `apps/desktop/src/renderer/src/{types.ts,navigation.ts}` into the new core package.
- [x] 2.3 Update desktop imports so main-process managers and renderer code consume the extracted core modules instead of local duplicate definitions.

## 3. Pure Rule Extraction

- [x] 3.1 Extract workspace normalization and context-index construction helpers from `workspace-manager.ts` into core utilities and adapt the manager to call them.
- [x] 3.2 Extract web capture message normalization and context-label derivation helpers from `web-panel-manager.ts` into core utilities and adapt the manager to call them.
- [x] 3.3 Extract renderer-side default panel/view-state derivation helpers that do not depend on localization or Zustand, while leaving presentation-specific status text in the desktop app.

## 4. Verification

- [x] 4.1 Run desktop typechecking after the import migration to confirm the workspace package resolves correctly.
- [x] 4.2 Run the existing workspace regression validation flow to confirm workspace search and preview behavior still works after the extraction.
- [x] 4.3 Smoke-check web, terminal, workspace, and settings flows to confirm the refactor preserved current snapshot and settings contracts.
