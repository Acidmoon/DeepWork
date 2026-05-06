## MODIFIED Requirements

### Requirement: Managed terminal panel lifecycle
Built-in and user-defined CLI panels SHALL run as PTY-backed terminal sessions owned by the main process, expose attach, start, restart, write, resize, clear, and authorized remote bridge access through controlled APIs, launch using the persisted configuration resolved for that panel, and preserve session continuity across renderer panel switches and remote message interactions.

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

#### Scenario: Remote bridge attaches to existing terminal session
- **WHEN** an authorized remote bridge requests access to a remote-capable terminal panel that already has a running PTY session
- **THEN** the main process exposes controlled status, write, control, tail, and output subscription operations for that same session
- **THEN** no duplicate PTY or duplicate CLI process is created for the remote bridge

#### Scenario: Renderer behavior remains unchanged during remote access
- **WHEN** a remote bridge writes to or subscribes to a managed terminal session
- **THEN** the renderer can still attach, receive output, resize, clear, start, and restart the panel through the existing desktop flow
- **THEN** session continuity metadata remains associated with the managed terminal panel
