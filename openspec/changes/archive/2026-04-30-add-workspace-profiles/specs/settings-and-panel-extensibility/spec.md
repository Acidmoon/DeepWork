## MODIFIED Requirements

### Requirement: Persisted application settings
The system SHALL persist application-level settings for language, theme, active workspace root, named workspace profiles, default startup workspace profile, terminal prelude commands, built-in web panel overrides, built-in terminal panel overrides, custom panel definitions, default thread continuation, and managed CLI retrieval preference.

#### Scenario: Load settings on startup
- **WHEN** the application starts
- **THEN** the settings manager reads persisted settings from the user-data settings file
- **THEN** it falls back to default settings and rewrites the file if persisted settings are missing or invalid
- **THEN** it normalizes workspace profile records and clears any default workspace profile ID that no longer points to a saved profile

#### Scenario: Update settings from the renderer
- **WHEN** the renderer sends a settings update through IPC
- **THEN** the settings manager merges the update into the current snapshot
- **THEN** it persists the new snapshot to disk
- **THEN** dependent managers receive synchronized configuration updates

#### Scenario: Resolve startup workspace from default profile
- **WHEN** settings contain a valid `defaultWorkspaceProfileId`
- **THEN** application startup uses that profile's root as the active workspace root before creating workspace-dependent managers
- **THEN** the persisted active workspace root remains backward-compatible for settings that do not yet use profiles

### Requirement: Settings surface for implemented and deferred preferences
The settings panel SHALL expose the preferences that are currently implemented, including workspace profiles, and SHALL keep only still-deferred preference areas visible as placeholders rather than silently omitting them.

#### Scenario: Edit implemented settings
- **WHEN** the user changes language, theme, terminal prelude commands, default thread continuation, managed CLI retrieval preference, or workspace profile settings in the settings panel
- **THEN** the updated values are persisted through the settings IPC flow
- **THEN** language and theme changes take effect in the renderer without requiring a code change
- **THEN** later managed captures and managed CLI retrievals use the updated continuity settings without requiring manual file edits
- **THEN** workspace profile changes are reflected in the active workspace and startup-default behavior when applicable

#### Scenario: View deferred preferences
- **WHEN** the user opens the settings panel
- **THEN** placeholder entries remain visible for future terminal behavior extensions
- **THEN** workspace profiles are presented as implemented settings rather than a future-facing placeholder
- **THEN** remaining placeholder entries are presented as future-facing placeholders rather than active runtime configuration
