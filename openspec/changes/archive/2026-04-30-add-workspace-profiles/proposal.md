## Why

DeepWork already treats Workspace as the persistence and retrieval substrate, but users can only select one current workspace root and the Settings surface still exposes workspace profiles as a placeholder. Named workspace profiles should become a real first-class workflow so users can reliably switch projects, reopen the intended workspace on startup, and understand when no workspace has been selected yet.

## What Changes

- Add named workspace profiles that store a display name, root path, last-used metadata, and default-startup selection.
- Replace the Settings `Workspace Profiles` placeholder with live profile management controls for adding the current workspace, renaming profiles, choosing the startup default, opening a profile, and removing profile records.
- Keep Home as the lightweight current-workspace entry point while Settings owns profile management.
- Preserve the current explicit-selection model: a fresh install does not silently create or write to a default Documents workspace.
- Align README/product copy with the explicit workspace selection and profile behavior.
- Add validation coverage for profile persistence, startup restore, switching, and the unselected-workspace state.

## Capabilities

### New Capabilities
- `workspace-profile-management`: Defines named workspace profiles, default startup workspace behavior, and profile switching/removal semantics.

### Modified Capabilities
- `settings-and-panel-extensibility`: Settings persistence and Settings UI behavior change because workspace profiles become implemented preferences instead of deferred placeholders.
- `workspace-context-management`: Workspace initialization behavior is clarified around explicit selection, startup restoration from a saved default profile, and no writes before a workspace is selected.
- `desktop-workbench-panels`: Home and Settings surfaces gain explicit current-workspace/profile responsibilities while preserving Workspace as a secondary inspection surface.
- `desktop-regression-validation`: Focused validation must cover workspace profile persistence and startup/switching behavior.

## Impact

- Core settings models in `packages/core/src/desktop/settings.ts` and panel view-state defaults in `packages/core/src/desktop/panels.ts`.
- Desktop settings persistence in `apps/desktop/src/main/settings-manager.ts`.
- Workspace root synchronization in `apps/desktop/src/main/index.ts`, `WorkspaceManager`, and `TerminalManager` handoff paths.
- Renderer Home and Settings surfaces, i18n copy, and store synchronization.
- Validation fixtures/scripts under `apps/desktop/validation/`.
- README and any product-facing setup copy that currently implies automatic default workspace creation.
