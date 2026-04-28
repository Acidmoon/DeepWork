## MODIFIED Requirements

### Requirement: Persisted application settings
The system SHALL persist application-level settings for language, theme, workspace root, terminal prelude commands, built-in web panel overrides, custom panel definitions, default thread continuation, and managed CLI retrieval preference.

#### Scenario: Load settings on startup
- **WHEN** the application starts
- **THEN** the settings manager reads persisted settings from the user-data settings file
- **THEN** it falls back to default settings and rewrites the file if persisted settings are missing or invalid

#### Scenario: Update settings from the renderer
- **WHEN** the renderer sends a settings update through IPC
- **THEN** the settings manager merges the update into the current snapshot
- **THEN** it persists the new snapshot to disk
- **THEN** dependent managers receive synchronized configuration updates

### Requirement: Settings surface for implemented and deferred preferences
The settings panel SHALL expose the preferences that are currently implemented and SHALL keep deferred preference areas visible as placeholders rather than silently omitting them.

#### Scenario: Edit implemented settings
- **WHEN** the user changes language, theme, terminal prelude commands, default thread continuation, or managed CLI retrieval preference in the settings panel
- **THEN** the updated values are persisted through the settings IPC flow
- **THEN** language and theme changes take effect in the renderer without requiring a code change
- **THEN** later managed captures and managed CLI retrievals use the updated continuity settings without requiring manual file edits

#### Scenario: View deferred preferences
- **WHEN** the user opens the settings panel
- **THEN** placeholder entries remain visible for default workspace behavior and terminal behavior extensions
- **THEN** those entries are presented as future-facing placeholders rather than active runtime configuration
