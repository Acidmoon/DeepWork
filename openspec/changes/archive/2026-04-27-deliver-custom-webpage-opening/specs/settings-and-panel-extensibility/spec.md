## MODIFIED Requirements

### Requirement: Custom panel lifecycle
The renderer SHALL allow users to create, rename, configure, enable or disable, and delete custom web and CLI panels, and the application SHALL synchronize those definitions into runtime managers, persisted settings, and navigation state.

#### Scenario: Add a custom web panel
- **WHEN** the user adds a custom web panel from a section action and provides a target URL
- **THEN** the renderer persists a new custom web-panel definition into settings
- **THEN** the web panel manager registers a corresponding managed panel when the panel is enabled
- **THEN** navigation state includes the user-defined panel and allows it to be opened immediately

#### Scenario: Update custom web panel configuration
- **WHEN** the user saves configuration changes for a custom web panel
- **THEN** the settings snapshot stores the updated title, home URL, partition, and enabled state for that panel
- **THEN** the web panel manager recreates or suppresses the managed panel instance as required to match the saved enabled state

#### Scenario: Reopen a custom web panel after restart
- **WHEN** the application starts with persisted custom web-panel definitions in settings
- **THEN** the renderer restores those panel definitions into navigation state
- **THEN** the main process can reopen enabled custom web panels using the persisted configuration

#### Scenario: Rename or delete a custom panel
- **WHEN** the user renames or deletes a user-defined panel from the context menu
- **THEN** the renderer updates persisted settings
- **THEN** the store and runtime managers synchronize the new title or remove the panel definition
