# desktop-workbench-panels Specification

## Purpose
TBD - created by archiving change establish-mvp-baseline-specs. Update Purpose after archive.
## Requirements
### Requirement: DeepWork desktop shell
The system SHALL launch a single DeepWork desktop window that hosts the renderer shell through the preload bridge and prevents arbitrary secondary window creation from both the main window and managed web panels.

#### Scenario: Main window boot
- **WHEN** the Electron app becomes ready
- **THEN** it creates a DeepWork browser window with the preload bridge attached
- **THEN** it loads the renderer entry point from the dev server or packaged renderer file
- **THEN** `window.open` style requests are denied from the main window

### Requirement: Navigation and panel visibility model
The renderer SHALL organize the workbench into stable navigation sections and panel definitions, keep a pinned home panel available, and manage active/open state without deleting panel definitions when a non-pinned panel is hidden.

#### Scenario: Open a registered panel
- **WHEN** a user selects a registered panel from the sidebar
- **THEN** that panel becomes the active panel
- **THEN** the panel is marked visible and opened in renderer state

#### Scenario: Hide a non-pinned panel
- **WHEN** a user closes a non-pinned panel
- **THEN** the panel remains registered in navigation state
- **THEN** the panel is marked not visible
- **THEN** the renderer selects another visible panel, preferring `home` when needed

### Requirement: Managed web panel lifecycle
Enabled web panels SHALL run as main-process-managed `WebContentsView` instances with navigation state synchronization, safe URL restrictions, and explicit reserved behavior for disabled panels.

#### Scenario: Show an enabled web panel
- **WHEN** the renderer opens an enabled web panel
- **THEN** the main process loads the panel home URL if it has not loaded yet
- **THEN** it applies the renderer bounds to the `WebContentsView`
- **THEN** it publishes navigation and loading state back to the renderer

#### Scenario: Access a disabled web panel
- **WHEN** the renderer requests state for a disabled web panel
- **THEN** the system returns a reserved snapshot instead of creating a live browser instance
- **THEN** the snapshot reports the panel as disabled with a reserved-state error message

#### Scenario: Attempt unsafe navigation
- **WHEN** a panel tries to navigate to a non-HTTP or non-HTTPS target
- **THEN** the navigation is blocked
- **THEN** the panel snapshot records the blocked-navigation error

### Requirement: Managed terminal panel lifecycle
Built-in CLI panels SHALL run as PTY-backed terminal sessions owned by the main process, expose attach/start/restart/write/resize/clear operations through preload IPC, and preserve session continuity across renderer panel switches.

#### Scenario: Attach to an existing terminal session
- **WHEN** the renderer attaches to a terminal panel that already has buffered output
- **THEN** the preload bridge returns both the terminal snapshot and current buffer
- **THEN** the renderer rehydrates the visible terminal without creating a duplicate PTY

#### Scenario: Start or restart a terminal session
- **WHEN** the renderer starts or restarts a terminal panel
- **THEN** the main process creates or recreates the PTY session with the configured shell, arguments, and startup command
- **THEN** session state and terminal output are streamed back through IPC

