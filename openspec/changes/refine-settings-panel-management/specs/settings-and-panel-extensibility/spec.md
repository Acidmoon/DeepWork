## MODIFIED Requirements

### Requirement: Custom panel rename and deletion
The renderer SHALL allow users to rename or delete user-defined web and CLI panels through explicit management flows that synchronize persisted settings, navigation state, and runtime managers without relying solely on transient prompt dialogs.

#### Scenario: Rename or delete a custom panel
- **WHEN** the user renames or deletes a user-defined panel from the supported management surface
- **THEN** the renderer updates persisted settings only after the edit is explicitly committed
- **THEN** the store and runtime managers synchronize the new title or remove the panel definition

### Requirement: Settings surface for implemented and deferred preferences
The settings panel SHALL expose the preferences that are currently implemented, including workspace profiles and terminal behavior, and SHALL use explicit persisted-edit flows for settings that would otherwise save on every keystroke.

#### Scenario: Edit implemented settings
- **WHEN** the user changes language, theme, terminal prelude commands, terminal behavior settings, default thread continuation, managed CLI retrieval preference, or workspace profile settings in the settings panel
- **THEN** the updated values are persisted through the settings IPC flow
- **THEN** language and theme changes take effect in the renderer without requiring a code change
- **THEN** later managed captures and managed CLI retrievals use the updated continuity settings without requiring manual file edits
- **THEN** terminal panels use the updated terminal behavior settings for renderer-side interaction behavior without requiring a PTY restart
- **THEN** workspace profile changes are reflected in the active workspace and startup-default behavior when applicable

#### Scenario: Commit workspace profile edits explicitly
- **WHEN** the user edits a workspace profile name or comparable free-form persisted settings field
- **THEN** the renderer keeps the draft local until the user explicitly commits the change
- **THEN** the settings manager does not receive a persisted update for every intermediate keystroke

#### Scenario: View deferred preferences
- **WHEN** the user opens the settings panel
- **THEN** terminal behavior settings are presented as implemented controls rather than a future-facing placeholder
- **THEN** workspace profiles are presented as implemented settings rather than a future-facing placeholder
- **THEN** any remaining placeholder entries are presented as future-facing placeholders rather than active runtime configuration
