## ADDED Requirements

### Requirement: Persisted application settings
The system SHALL persist application-level settings for language, theme, workspace root, terminal prelude commands, built-in web panel overrides, and custom panel definitions.

#### Scenario: Load settings on startup
- **WHEN** the application starts
- **THEN** the settings manager reads persisted settings from the user-data settings file
- **THEN** it falls back to default settings and rewrites the file if persisted settings are missing or invalid

#### Scenario: Update settings from the renderer
- **WHEN** the renderer sends a settings update through IPC
- **THEN** the settings manager merges the update into the current snapshot
- **THEN** it persists the new snapshot to disk
- **THEN** dependent managers receive synchronized configuration updates

### Requirement: Built-in panel configuration
The system SHALL allow built-in web panels to persist updated home URL, partition, and enabled state while keeping disabled panels in an explicit reserved configuration.

#### Scenario: Update a built-in web panel
- **WHEN** the user saves configuration for a built-in web panel
- **THEN** the settings snapshot stores the updated home URL, partition, and enabled flag for that panel
- **THEN** the web panel manager recreates the managed panel instance when required to apply the new configuration

#### Scenario: Keep a built-in panel reserved
- **WHEN** a built-in panel is stored with `enabled: false`
- **THEN** the renderer shows the panel as reserved rather than live
- **THEN** the main process does not mount a live `WebContentsView` for that panel

### Requirement: Custom panel lifecycle
The renderer SHALL allow users to create, rename, and delete custom web and CLI panels, and the application SHALL synchronize those definitions into runtime managers and navigation state.

#### Scenario: Add a custom web panel
- **WHEN** the user adds a custom web panel from a section action
- **THEN** the renderer persists a new custom web-panel definition into settings
- **THEN** the web panel manager registers a corresponding managed panel if the panel is enabled
- **THEN** navigation state includes the user-defined panel

#### Scenario: Add a custom CLI panel
- **WHEN** the user adds a custom CLI panel from a section action
- **THEN** the renderer persists a new custom terminal-panel definition into settings
- **THEN** the terminal manager registers a corresponding managed session definition
- **THEN** navigation state includes the user-defined panel

#### Scenario: Rename or delete a custom panel
- **WHEN** the user renames or deletes a user-defined panel from the context menu
- **THEN** the renderer updates persisted settings
- **THEN** the store and runtime managers synchronize the new title or remove the panel definition

### Requirement: Settings surface for implemented and deferred preferences
The settings panel SHALL expose the preferences that are currently implemented and SHALL keep deferred preference areas visible as placeholders rather than silently omitting them.

#### Scenario: Edit implemented settings
- **WHEN** the user changes language, theme, or terminal prelude commands in the settings panel
- **THEN** the updated values are persisted through the settings IPC flow
- **THEN** language and theme changes take effect in the renderer without requiring a code change

#### Scenario: View deferred preferences
- **WHEN** the user opens the settings panel
- **THEN** placeholder entries remain visible for CLI prompt templates, default workspace behavior, and terminal behavior extensions
- **THEN** those entries are presented as future-facing placeholders rather than active runtime configuration
