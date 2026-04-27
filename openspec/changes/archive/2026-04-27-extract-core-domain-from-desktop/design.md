## Context

`packages/core` currently exists only as a placeholder, while the actual desktop domain has grown inside `apps/desktop`:

- `src/shared/workspace.ts`, `web-panels.ts`, `terminal-panels.ts`, and `settings.ts` define serializable models and config catalogs.
- `src/renderer/src/types.ts`, `navigation.ts`, and parts of `store.ts` define panel-domain structures and pure view-state derivation rules.
- `src/main/workspace-manager.ts` contains both adapter code and pure normalization/indexing logic such as origin/context-label normalization and context-index construction.
- `src/main/web-panel-manager.ts` contains pure capture helpers such as structured-message normalization and web context-label derivation mixed together with `WebContentsView` lifecycle control.

The coupling problem is no longer theoretical. New workspace and retrieval behavior is already validated, but future changes will keep touching the same mixed files unless the package boundary is clarified now. The design constraint is to extract the pure domain without destabilizing the existing desktop runtime, IPC contracts, or validation commands.

## Goals / Non-Goals

**Goals:**

- Create a runtime-independent `@ai-workbench/core` desktop-domain package.
- Move serializable desktop models and pure domain rules into `packages/core`.
- Keep current snapshot shapes, panel IDs, and user-visible behavior stable during the extraction.
- Leave Electron, filesystem, clipboard, PTY, and settings persistence as app-shell adapters in `apps/desktop`.
- Make the extracted boundary clear enough that later phases can add features without reopening the same ownership question.

**Non-Goals:**

- Rewrite `WorkspaceManager`, `WebPanelManager`, `TerminalManager`, or `SettingsManager` into fully framework-neutral services.
- Redesign manifest schemas, IPC payloads, panel IDs, or settings persistence formats.
- Move localization copy, React rendering concerns, or Electron window lifecycle into `packages/core`.
- Introduce a brand-new general-purpose test stack just for this extraction.

## Decisions

### 1. Extract by domain slice, not by process boundary

The new package should be organized around desktop-domain slices such as settings, panel catalog/state, workspace models/indexing, and capture normalization. That maps cleanly to the current mixed code and avoids creating parallel `main-core` and `renderer-core` buckets that would still hide duplicated business rules.

Expected first-cut slices:

- `desktop/settings`
- `desktop/panels`
- `desktop/web-panels`
- `desktop/terminal-panels`
- `desktop/workspace`
- `desktop/capture`

Alternative considered: split extracted code into `main`-oriented and `renderer`-oriented packages. Rejected because the problem is not process ownership by itself; it is that the same domain rules are currently embedded inside process-specific modules.

### 2. Only serializable models and pure helpers move

The extraction boundary is defined by runtime independence. Types, config catalogs, default-state builders, normalization helpers, and deterministic derivation utilities should move. Electron objects, filesystem access, clipboard reads, PTY handles, time-based session control, and browser-view lifecycle remain in `apps/desktop`.

This also means some borderline helpers stay in the app shell for now:

- localized status-text generation in the renderer, because it depends on presentation copy and `i18n`
- PowerShell/bootstrap command emission in the terminal manager, because it is shell-adapter behavior rather than reusable domain logic

Alternative considered: move entire managers or the Zustand store wholesale. Rejected because it would drag runtime dependencies into the new package and blur the contract immediately.

### 3. Preserve public desktop shapes during migration

The extraction should not be combined with schema redesign. `WorkspaceSnapshot`, panel snapshot types, settings snapshot types, and existing panel IDs should stay stable so that the refactor can be validated against current behavior instead of simultaneously introducing a new contract.

The desktop app should change imports and helper ownership, not the external payload shapes consumed by the renderer and existing validation scripts.

Alternative considered: redesign snapshot/view-state contracts while extracting. Rejected because it expands the blast radius and makes regressions harder to isolate.

### 4. Add package entrypoints before migrating call sites

`packages/core` should first gain package metadata and stable source entrypoints, then the desktop app can migrate call sites in small slices. This keeps the refactor incremental and makes it easier to review import movement separately from logic movement.

The preferred import style is explicit desktop-domain entrypoints such as `@ai-workbench/core/desktop/...` rather than deep relative paths into `packages/core`. A small barrel export is acceptable, but domain-slice entrypoints should remain the source of truth so the package does not become a single undifferentiated dump.

Alternative considered: move code first and worry about exports later. Rejected because it creates temporary fragile pathing and encourages local shortcuts that will survive longer than intended.

### 5. Reuse existing validation flows instead of adding a new dependency stack

This change is primarily about ownership and structure, not new behavior. Verification should therefore lean on existing commands:

- desktop TypeScript typecheck
- existing workspace regression validation for the search/preview path

If small extraction-specific smoke scripts are needed, they should stay lightweight and avoid introducing a full new test framework in the same change.

Alternative considered: add Vitest or another new unit-test stack as part of the extraction. Rejected because it adds a second refactor axis and is not required to make the boundary usable.

## Risks / Trade-offs

- [The extracted package becomes a dumping ground] -> Mitigation: keep domain-slice entrypoints explicit and leave runtime adapters in `apps/desktop`.
- [Import migration touches many files at once] -> Mitigation: scaffold package exports first, then migrate one slice at a time while preserving payload shapes.
- [Some helpers sit on an awkward boundary] -> Mitigation: prefer leaving ambiguous helpers in the desktop shell for this change unless they are clearly reusable and runtime-independent.
- [Package-resolution issues appear during migration] -> Mitigation: validate the workspace package wiring early with desktop typechecking before moving every call site.

## Migration Plan

1. Scaffold `packages/core` with package metadata and desktop-domain entrypoints.
2. Move serializable shared models and config catalogs out of `apps/desktop/src/shared/*` and related renderer type files.
3. Extract pure workspace and capture normalization helpers from the main-process managers.
4. Extract panel-domain builders used by the renderer while keeping localized presentation logic in the app.
5. Run desktop typechecking and the existing workspace regression validation flow.

Rollback is straightforward because this change does not migrate persisted data: revert imports and move the affected pure helpers back into `apps/desktop`.

## Open Questions

- Should terminal bootstrap command generation stay permanently in the desktop shell, or is there enough reusable policy there to merit a later core extraction?
- Should settings snapshot types live under a desktop-specific namespace forever, or move to a more generic root-level core entrypoint if a second app appears?
- Does `packages/core` need build output in this phase, or can source-export workspace entrypoints remain the contract until another consumer requires a packaged distribution artifact?
