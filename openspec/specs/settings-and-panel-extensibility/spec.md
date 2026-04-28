# settings-and-panel-extensibility Specification

## Purpose
Define how application settings and panel definitions are persisted, including the future-facing preferences that shape how managed CLI sessions discover workspace context by default.
## Requirements
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
The renderer SHALL allow users to create, rename, configure, enable or disable, and delete custom web and CLI panels, and the application SHALL synchronize those definitions into runtime managers, persisted settings, and navigation state. Custom web panels SHALL accept arbitrary safe URLs as saved home targets while keeping live address browsing separate from persisted configuration until the user saves changes.

#### Scenario: Add a custom web panel
- **WHEN** the user adds a custom web panel from a section action and provides an HTTP or HTTPS target URL
- **THEN** the renderer persists a new custom web-panel definition into settings
- **THEN** the saved definition uses that normalized target as the panel home URL
- **THEN** the web panel manager registers a corresponding managed panel when the panel is enabled
- **THEN** navigation state includes the user-defined panel and allows it to be opened immediately

#### Scenario: Update custom web panel configuration
- **WHEN** the user saves configuration changes for a custom web panel
- **THEN** the settings snapshot stores the updated title, home URL, partition, and enabled state for that panel
- **THEN** transient address-bar browsing does not overwrite the saved home URL unless the user explicitly saves the new home URL as configuration
- **THEN** the web panel manager recreates or suppresses the managed panel instance as required to match the saved enabled state

#### Scenario: Reopen a custom web panel after restart
- **WHEN** the application starts with persisted custom web-panel definitions in settings
- **THEN** the renderer restores those panel definitions into navigation state
- **THEN** the main process can reopen enabled custom web panels using the persisted configuration
- **THEN** the restored panel starts from its saved home URL rather than the last transient browsing address

#### Scenario: Reject an unsafe custom web target
- **WHEN** the user attempts to create or save a custom web panel with a non-HTTP or non-HTTPS target
- **THEN** the application does not treat that target as a valid saved home URL
- **THEN** the existing custom web panel definition remains unchanged if one already exists

#### Scenario: Rename or delete a custom panel
- **WHEN** the user renames or deletes a user-defined panel from the context menu
- **THEN** the renderer updates persisted settings
- **THEN** the store and runtime managers synchronize the new title or remove the panel definition

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
