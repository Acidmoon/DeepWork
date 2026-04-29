## ADDED Requirements

### Requirement: Built-in terminal panel configuration
The system SHALL allow built-in CLI panels to persist supported runtime overrides such as working directory and startup command while keeping managed shell ownership and workspace bootstrap behavior under application control.

#### Scenario: Update a built-in CLI panel
- **WHEN** the user saves configuration for a built-in CLI panel
- **THEN** the settings snapshot stores the supported override fields for that panel
- **THEN** the terminal manager synchronizes the updated definition without requiring manual settings-file edits

#### Scenario: Preserve managed shell ownership for a built-in CLI panel
- **WHEN** the user edits a built-in CLI panel configuration
- **THEN** the application keeps the managed shell executable, bootstrap flow, and panel identity under app control
- **THEN** the built-in panel does not become an arbitrary unmanaged custom shell entry

## MODIFIED Requirements

### Requirement: Persisted application settings
The system SHALL persist application-level settings for language, theme, workspace root, terminal prelude commands, built-in web panel overrides, built-in terminal panel overrides, custom panel definitions, default thread continuation, and managed CLI retrieval preference.

#### Scenario: Load settings on startup
- **WHEN** the application starts
- **THEN** the settings manager reads persisted settings from the user-data settings file
- **THEN** it falls back to default settings and rewrites the file if persisted settings are missing or invalid

#### Scenario: Update settings from the renderer
- **WHEN** the renderer sends a settings update through IPC
- **THEN** the settings manager merges the update into the current snapshot
- **THEN** it persists the new snapshot to disk
- **THEN** dependent managers receive synchronized configuration updates

### Requirement: Custom panel lifecycle
The renderer SHALL allow users to create, rename, configure, enable or disable, and delete custom web and CLI panels, and the application SHALL synchronize those definitions into runtime managers, persisted settings, and navigation state. Custom web panels SHALL accept arbitrary safe URLs as saved home targets while keeping live address browsing separate from persisted configuration until the user saves changes. Custom CLI panels SHALL persist shell-level configuration separately from active terminal session state so later launches can use the saved behavior without manual file edits.

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

#### Scenario: Add a custom CLI panel
- **WHEN** the user adds a custom CLI panel from a section action
- **THEN** the renderer persists a new custom terminal-panel definition into settings with editable shell-level fields
- **THEN** navigation state includes the user-defined CLI panel and allows it to be opened immediately

#### Scenario: Update custom CLI panel configuration
- **WHEN** the user saves shell, shell-argument, working-directory, or startup-command changes for a custom CLI panel
- **THEN** the settings snapshot stores the updated configuration for that panel
- **THEN** the terminal manager synchronizes the saved definition for later launches and explicit restarts

#### Scenario: Reopen a custom CLI panel after restart
- **WHEN** the application starts with persisted custom terminal-panel definitions in settings
- **THEN** the renderer restores those panel definitions into navigation state
- **THEN** the main process can reopen managed CLI sessions using the persisted configuration for each restored panel

#### Scenario: Rename or delete a custom panel
- **WHEN** the user renames or deletes a user-defined panel from the context menu
- **THEN** the renderer updates persisted settings
- **THEN** the store and runtime managers synchronize the new title or remove the panel definition
