## 1. Settings Model And Normalization

- [x] 1.1 Extend core settings types and defaults with workspace profile records, `defaultWorkspaceProfileId`, and profile normalization helpers.
- [x] 1.2 Update `SettingsManager` load/update paths to normalize legacy settings, deduplicate profile roots, clear invalid default profile IDs, and preserve backward-compatible `workspaceRoot`.
- [x] 1.3 Add targeted coverage or deterministic assertions for settings normalization, duplicate roots, default-profile removal, and legacy settings migration.

## 2. Startup And Workspace Synchronization

- [x] 2.1 Add startup root resolution that prefers a valid default workspace profile, then persisted `workspaceRoot`, then an unselected workspace state.
- [x] 2.2 Update main-process settings/workspace IPC flows so opening a profile updates `workspaceRoot`, initializes the selected workspace, persists `lastUsedAt`, and synchronizes `TerminalManager`.
- [x] 2.3 Preserve explicit no-workspace behavior so fresh installs and missing default profiles do not create Documents workspace files implicitly.

## 3. Renderer Profile Management

- [x] 3.1 Extend settings panel view state, store synchronization, and i18n copy for saved profiles, active/default markers, profile names, profile errors, and profile actions.
- [x] 3.2 Replace the `Workspace Profiles` placeholder in Settings with implemented controls to add/update the current workspace profile, rename profiles, open profiles, set the startup default, and remove profile records.
- [x] 3.3 Keep Home focused on current workspace status and quick root selection while ensuring direct root selection stays synchronized with Settings profile state.
- [x] 3.4 Ensure profile actions remain non-destructive and show explicit error or empty states for unavailable roots and no saved profiles.

## 4. Documentation And Product Copy

- [x] 4.1 Update README setup and workspace-location sections to describe explicit workspace selection, saved profiles, and default startup profile behavior.
- [x] 4.2 Remove or revise stale renderer copy that still presents workspace profiles as future-only while keeping terminal behavior extensions as deferred placeholders.

## 5. Validation

- [x] 5.1 Add or extend a focused validation flow for workspace profile creation/update, profile switching, default-profile startup resolution, profile removal, and unselected startup behavior.
- [x] 5.2 Update internal alpha validation documentation or scripts so workspace profile coverage is discoverable with the existing focused desktop validation flows.
- [x] 5.3 Run `npm run typecheck`, the profile-focused validation, relevant renderer validation flows, and `openspec validate --all --strict --json`.
