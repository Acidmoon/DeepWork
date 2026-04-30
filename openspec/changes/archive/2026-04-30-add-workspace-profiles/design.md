## Context

DeepWork currently persists a single `workspaceRoot` in application settings. A fresh install defaults that value to `null`, and `WorkspaceManager` stays uninitialized until a root is selected. Home exposes the lightweight selection action, while Settings still shows `Workspace Profiles` as a deferred placeholder.

The profile change crosses core settings models, main-process settings persistence, workspace/terminal synchronization, renderer Home and Settings surfaces, product copy, and validation. It should preserve the existing safety property that the application does not silently create or write to a Documents workspace before the user chooses one.

## Goals / Non-Goals

**Goals:**
- Persist named workspace profiles with stable IDs, root paths, display names, last-used metadata, and optional default startup selection.
- Let users add the current workspace as a profile, rename a profile, make a profile the startup default, open a profile, and remove a profile record from Settings.
- Keep Home focused on current workspace status and quick selection.
- Restore the default profile's root at startup when configured, while preserving the unselected state for new installs or when the default profile is removed.
- Keep workspace root changes synchronized into `WorkspaceManager`, `TerminalManager`, renderer state, and settings.
- Validate persistence, startup restoration, switching, profile removal, and unselected-workspace behavior.

**Non-Goals:**
- Moving or deleting workspace directories when a profile is removed.
- Creating multiple simultaneously active workspaces.
- Adding cloud sync, profile import/export, or workspace templates.
- Changing workspace artifact, thread, retrieval, or manifest file formats beyond the active root selection.
- Reintroducing Workspace as a mandatory pre-conversation context selection flow.

## Decisions

### Store profiles in application settings

Add `workspaceProfiles` and `defaultWorkspaceProfileId` to the existing settings snapshot instead of creating a separate profile store.

Rationale: profiles are app-level preferences, already share the same lifetime as language/theme/panel settings, and need to be available before managers are created. The settings manager already normalizes persisted data and fans out updates to dependent managers.

Alternative considered: store profiles under each workspace root. That would make startup default resolution impossible before a root is selected and would scatter app-level choices across project folders.

### Keep `workspaceRoot` as the active resolved root

Continue persisting `workspaceRoot` as the currently active root while profiles provide named choices and default-startup behavior.

Rationale: existing managers and renderer state already consume one active root. Keeping this field avoids a broad migration and makes profile switching a controlled update to the same active-root contract.

Alternative considered: replace `workspaceRoot` with only `activeWorkspaceProfileId`. That would break direct root selection and create unnecessary coupling between workspace initialization and profile records.

### Profile creation is explicit and non-destructive

Adding a profile should happen from an existing selected workspace or a chosen directory, and removing a profile should only remove the settings record. It MUST NOT delete files from disk or rewrite the workspace.

Rationale: profiles are bookmarks over workspace roots, not ownership records. Non-destructive behavior is critical because workspace roots may be project directories or user-managed folders.

### Startup default resolves through profile first, then active root

On app startup, if `defaultWorkspaceProfileId` points to a valid profile, the workspace manager should initialize that profile's root. If no valid default profile exists, the app should use the persisted active `workspaceRoot` if present. Otherwise it remains unselected.

Rationale: this preserves backward compatibility for existing users with only `workspaceRoot`, while making the new default profile behavior explicit for users who opt in.

### Settings owns profile management; Home owns quick selection

Settings should replace the `Workspace Profiles` placeholder with the profile management surface. Home should continue to show current workspace status and expose quick root selection, optionally adding the selected root to profiles through Settings-driven state.

Rationale: this matches the current product split: Home is an entry/status surface, Settings owns app-level preferences, and Workspace remains secondary inspection.

## Risks / Trade-offs

- Profile and `workspaceRoot` can drift if updates are not normalized together -> normalize settings updates so opening a profile updates `workspaceRoot`, `lastUsedAt`, and settings snapshot atomically.
- A deleted default profile can leave a dangling `defaultWorkspaceProfileId` -> settings normalization MUST clear invalid default IDs.
- Startup restoration could surprise users if it silently writes to a profile root -> only profiles explicitly saved by the user can become startup defaults, and new installs remain unselected.
- Renderer validation may not cover main-process startup behavior directly -> add deterministic unit-style settings normalization coverage and browser-driven renderer coverage for visible profile flows.
- Duplicate paths can create confusing profile lists -> normalize roots for comparison and update the existing profile record when the same root is added again.

## Migration Plan

1. Extend settings defaults with an empty `workspaceProfiles` array and `defaultWorkspaceProfileId: null`.
2. Normalize old settings files by preserving existing `workspaceRoot` and initializing profile fields when absent.
3. Optionally allow users to add the existing active root as a named profile from Settings; do not auto-create a profile record during migration.
4. Update startup root resolution to prefer a valid default profile, then the persisted active root, then unselected.
5. Update README and copy to remove the outdated automatic Documents workspace claim.
