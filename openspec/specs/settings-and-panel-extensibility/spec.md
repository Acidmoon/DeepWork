# settings-and-panel-extensibility Specification

## Purpose
Define how application settings and panel definitions are persisted, including the future-facing preferences that shape how managed CLI sessions discover workspace context by default.
## Requirements
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

### Requirement: Custom web panel lifecycle
The renderer SHALL allow users to create, configure, enable, disable, and reopen custom web panels while synchronizing saved definitions into settings, navigation state, and the web panel manager.

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

### Requirement: Custom CLI panel lifecycle
The renderer SHALL allow users to create, configure, and reopen custom CLI panels while persisting shell-level launch configuration separately from active terminal session state.

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

### Requirement: Custom panel rename and deletion
The renderer SHALL allow users to rename or delete user-defined web and CLI panels while synchronizing persisted settings, navigation state, and runtime managers.

#### Scenario: Rename or delete a custom panel
- **WHEN** the user renames or deletes a user-defined panel from the context menu
- **THEN** the renderer updates persisted settings
- **THEN** the store and runtime managers synchronize the new title or remove the panel definition

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

