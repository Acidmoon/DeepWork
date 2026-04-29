## ADDED Requirements

### Requirement: Terminal panel configuration surface
The workbench SHALL expose an explicit configuration surface for managed terminal panels so users can inspect and edit persisted panel behavior without leaving the terminal workflow.

#### Scenario: Edit a built-in CLI panel configuration
- **WHEN** the user opens configuration controls for a built-in CLI panel
- **THEN** the workbench shows the supported override fields for that panel
- **THEN** saving the configuration keeps the built-in panel identity while updating its persisted launch behavior

#### Scenario: Edit a custom CLI panel configuration
- **WHEN** the user opens configuration controls for a custom CLI panel
- **THEN** the workbench shows the persisted shell, shell arguments, working directory, and startup command for that panel
- **THEN** saving the configuration updates renderer state and the managed terminal definition for that panel

#### Scenario: Apply configuration changes to a running terminal session
- **WHEN** the user saves terminal configuration while that panel already has a running PTY session
- **THEN** the existing session remains stable until the user explicitly restarts or reapplies the terminal flow
- **THEN** later launches use the updated persisted configuration

## MODIFIED Requirements

### Requirement: Managed terminal panel lifecycle
Built-in and user-defined CLI panels SHALL run as PTY-backed terminal sessions owned by the main process, expose attach/start/restart/write/resize/clear operations through preload IPC, launch using the persisted configuration resolved for that panel, and preserve session continuity across renderer panel switches.

#### Scenario: Attach to an existing terminal session
- **WHEN** the renderer attaches to a terminal panel that already has buffered output
- **THEN** the preload bridge returns both the terminal snapshot and current buffer
- **THEN** the renderer rehydrates the visible terminal without creating a duplicate PTY

#### Scenario: Start or restart a terminal session
- **WHEN** the renderer starts or restarts a terminal panel
- **THEN** the main process creates or recreates the PTY session with the configured shell, arguments, working directory, and startup command
- **THEN** session state and terminal output are streamed back through IPC

#### Scenario: Restore a persisted custom CLI panel
- **WHEN** the renderer hydrates settings that include custom CLI panel definitions with saved runtime fields
- **THEN** the workbench restores those definitions into navigation state and terminal view state
- **THEN** the main process can start the managed terminal session using that persisted configuration without requiring code changes
