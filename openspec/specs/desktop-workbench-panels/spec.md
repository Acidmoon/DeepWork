# desktop-workbench-panels Specification

## Purpose
Define the desktop workbench shell, navigation model, and managed web or terminal panel lifecycle that let the Electron app host stable built-in and user-defined work surfaces.
## Requirements
### Requirement: DeepWork desktop shell
The system SHALL launch a single DeepWork desktop window that hosts the renderer shell through the preload bridge and prevents arbitrary secondary window creation from both the main window and managed web panels.

#### Scenario: Main window boot
- **WHEN** the Electron app becomes ready
- **THEN** it creates a DeepWork browser window with the preload bridge attached
- **THEN** it loads the renderer entry point from the dev server or packaged renderer file
- **THEN** `window.open` style requests are denied from the main window

### Requirement: Navigation and panel visibility model
The renderer SHALL organize the workbench into stable navigation sections and panel definitions, keep a pinned home panel available, hydrate persisted user-defined panels into navigation state, and manage active/open state without deleting panel definitions when a non-pinned panel is hidden.

#### Scenario: Open a registered panel
- **WHEN** a user selects a registered panel from the sidebar
- **THEN** that panel becomes the active panel
- **THEN** the panel is marked visible and opened in renderer state

#### Scenario: Restore a persisted user-defined panel
- **WHEN** the renderer hydrates settings that include custom web or CLI panel definitions
- **THEN** navigation state includes those user-defined panels in their configured sections
- **THEN** those panels remain selectable without requiring hardcoded panel registry entries

#### Scenario: Hide a non-pinned panel
- **WHEN** a user closes a non-pinned panel
- **THEN** the panel remains registered in navigation state
- **THEN** the panel is marked not visible
- **THEN** the renderer selects another visible panel, preferring `home` when needed

### Requirement: Managed web panel lifecycle
Enabled built-in and user-defined web panels SHALL run as main-process-managed `WebContentsView` instances with navigation state synchronization, safe URL restrictions, persisted configuration handoff, browser-like current-address loading for safe targets, and explicit reserved behavior for disabled panels.

#### Scenario: Show an enabled web panel
- **WHEN** the renderer opens an enabled web panel
- **THEN** the main process loads the panel home URL if it has not loaded yet
- **THEN** it applies the renderer bounds to the `WebContentsView`
- **THEN** it publishes navigation and loading state back to the renderer

#### Scenario: Open a persisted custom web panel
- **WHEN** a user-defined web panel is restored from persisted settings and selected in navigation
- **THEN** the main process resolves the stored home URL and partition for that panel
- **THEN** it mounts a live `WebContentsView` without requiring a built-in provider slot
- **THEN** the initial current address matches the stored home URL until the user browses elsewhere

#### Scenario: Load a safe arbitrary address in a custom web panel
- **WHEN** the user enters an HTTP or HTTPS target for a custom web panel and requests navigation
- **THEN** the main process loads that target without recreating the panel definition
- **THEN** the panel snapshot updates `currentUrl`, loading state, and back-forward navigation state to reflect the new page

#### Scenario: Access a disabled web panel
- **WHEN** the renderer requests state for a disabled web panel
- **THEN** the system returns a reserved snapshot instead of creating a live browser instance
- **THEN** the snapshot reports the panel as disabled with a reserved-state error message

#### Scenario: Attempt unsafe navigation
- **WHEN** a panel tries to navigate to a non-HTTP or non-HTTPS target
- **THEN** the navigation is blocked
- **THEN** the panel snapshot records the blocked-navigation error

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

### Requirement: Thread-aware workbench continuation surfaces
The renderer SHALL expose the currently active context thread and let the user start new work or continue existing work across workspace, managed web, and managed CLI surfaces without leaving the desktop workbench.

#### Scenario: Continue an existing thread from the renderer
- **WHEN** the user selects a saved thread for continuation
- **THEN** the workbench shows that thread as the active continuity target
- **THEN** subsequent managed web, CLI, or manual-save flows use that thread unless the user explicitly changes it

#### Scenario: Start a fresh thread from the renderer
- **WHEN** the user chooses to begin a new line of work
- **THEN** the workbench can create and activate a new thread without deleting or overwriting previous threads
- **THEN** the new thread becomes visible through the same continuity surfaces used for later inspection

### Requirement: Thread state remains visible across relevant panels
The workbench SHALL keep thread context visible enough that users can tell whether a web or CLI session is continuing prior work or operating on a fresh thread.

#### Scenario: Show active thread context for a managed panel
- **WHEN** a managed web or CLI panel is active and linked to a thread
- **THEN** the renderer shows the current thread identity or label in that work surface
- **THEN** the user can understand that later captures will land in the same thread

#### Scenario: Reflect thread changes in workspace browsing
- **WHEN** the active thread changes or a scope is reassigned between threads
- **THEN** the workspace browsing surface updates to reflect the new thread membership
- **THEN** the renderer keeps thread inspection and thread continuation state synchronized with emitted workspace snapshots

### Requirement: Managed panels surface session-linked continuity context
The workbench SHALL surface session-linked continuity context for managed web and CLI panels so operators can distinguish the panel's current session identity from the workspace's currently selected thread.

#### Scenario: Show continuity context for a managed terminal panel
- **WHEN** a managed CLI session is running or has buffered state linked to a workspace scope
- **THEN** the renderer receives that session's scope identity, context label, and linked thread identity in the panel state snapshot
- **THEN** the active terminal surface displays that continuity context without requiring the operator to inspect logs or workspace manifests

#### Scenario: Show continuity context for a managed web panel
- **WHEN** a managed web panel is linked to a thread or saved capture scope
- **THEN** the renderer receives the linked thread identity and latest saved session-scope identity in the panel state snapshot
- **THEN** the active web surface displays whether later captures continue an existing thread or start from a fresh one

### Requirement: Managed panels can jump into workspace inspection
The workbench SHALL let operators open the workspace inspection surface for the session scope that backs the current managed panel.

#### Scenario: Open a managed panel session in Workspace
- **WHEN** the operator invokes the workspace jump action from a managed web or CLI panel that has a saved or linked session scope
- **THEN** the workbench activates the Workspace panel
- **THEN** the workspace surface focuses the corresponding scope so the operator can inspect related artifacts and thread membership
