# desktop-workbench-panels Specification

## Purpose
Define the desktop workbench shell, navigation model, and managed web or terminal panel lifecycle that let the Electron app host stable work surfaces while keeping web and CLI conversations as the primary continuity entry points.
## Requirements
### Requirement: DeepWork desktop shell
The system SHALL launch a single DeepWork desktop window that hosts the renderer shell through the preload bridge and prevents arbitrary secondary window creation from both the main window and managed web panels.

#### Scenario: Main window boot
- **WHEN** the Electron app becomes ready
- **THEN** it creates a DeepWork browser window with the preload bridge attached
- **THEN** it loads the renderer entry point from the dev server or packaged renderer file
- **THEN** `window.open` style requests are denied from the main window

### Requirement: Navigation and panel visibility model
The renderer SHALL organize the workbench into stable navigation sections and panel definitions, keep a pinned home panel available, hydrate persisted user-defined panels into navigation state, and manage active and open state without deleting panel definitions when a non-pinned panel is hidden.

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
Built-in and user-defined CLI panels SHALL run as PTY-backed terminal sessions owned by the main process, expose attach, start, restart, write, resize, and clear operations through preload IPC, launch using the persisted configuration resolved for that panel, and preserve session continuity across renderer panel switches.

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

### Requirement: Conversation-first continuity surfaces
The renderer SHALL keep managed web and CLI conversation surfaces as the primary place where users understand and steer continuity, while keeping Workspace as a secondary inspection surface rather than a required step before normal conversation.

#### Scenario: Continue an existing thread from an active managed surface
- **WHEN** the user keeps working from a managed web or CLI panel that is already linked to a saved thread
- **THEN** the workbench continues to treat that thread as the active continuity target for the session
- **THEN** the user does not need to switch into Workspace just to preserve continuity

#### Scenario: Start a fresh thread from an active managed surface
- **WHEN** the user intentionally starts a new line of work from a managed web or CLI panel
- **THEN** the workbench can create and activate a new thread from that surface
- **THEN** later captures and retrieval decisions reflect the new thread without requiring persistent control bars across the broader workbench

### Requirement: Managed-panel continuity metadata without dedicated chrome
The workbench SHALL preserve session-linked continuity metadata for managed web and CLI panels so ordinary conversation flow can continue without adding a dedicated current-thread or current-session bar to the primary surface.

#### Scenario: Preserve continuity metadata for an active managed panel
- **WHEN** a managed web or CLI panel is active
- **THEN** the renderer state for that panel includes session-linked continuity information such as thread identity, session scope identity, or fresh-session state
- **THEN** the metadata is derived from indexed or session-linked state rather than requiring workspace preview reads

#### Scenario: Keep primary panel chrome focused on the conversation
- **WHEN** continuity metadata exists for a managed panel
- **THEN** the primary web or CLI surface does not require a persistent continuity toolbar, inspection button row, or thread-management strip
- **THEN** deeper inspection and repair remain available through Workspace and other secondary flows

### Requirement: Managed panels preserve session-linked continuity context
The workbench SHALL keep session-linked continuity context attached to managed web and CLI panel state so operators and retrieval flows can distinguish the panel's current session identity from the workspace's broader active thread.

#### Scenario: Preserve continuity context for a managed terminal panel
- **WHEN** a managed CLI session is running or has buffered state linked to a workspace scope
- **THEN** the renderer receives that session's scope identity, context label, and linked thread identity in the panel state snapshot
- **THEN** later retrieval, capture, or inspection flows can reuse that context without treating the workspace's active thread as the session's source of truth

#### Scenario: Preserve continuity context for a managed web panel
- **WHEN** a managed web panel is linked to a thread or saved capture scope
- **THEN** the renderer receives the linked thread identity and latest saved session-scope identity in the panel state snapshot
- **THEN** later capture and retrieval decisions can distinguish continuing an existing thread from starting fresh

### Requirement: Secondary workspace inspection access
The workbench SHALL keep Workspace available as an intentional secondary inspection surface for debugging, audit, or recovery when the user wants to inspect saved artifacts behind the current or prior conversation context.

#### Scenario: Open Workspace for secondary inspection
- **WHEN** the operator intentionally switches from a managed web or CLI panel into Workspace
- **THEN** the user can inspect saved scopes, threads, and artifacts through Workspace's own browsing controls
- **THEN** ordinary continuation on the managed panel did not require a dedicated in-panel jump or thread bar

### Requirement: Minimal workspace thread management
The workspace surface SHALL keep thread creation, activation, title editing, and scope reassignment available for explicit organization or repair work without turning routine continuation into a control-heavy workflow.

#### Scenario: Create or activate a thread from focused workspace controls
- **WHEN** the operator intentionally uses workspace continuity controls to create a new thread or continue an existing one
- **THEN** the workbench updates the active thread through the existing workspace mutation flow
- **THEN** the controls stay subordinate to the workspace's inspection purpose rather than occupying every artifact row or primary panel surface

#### Scenario: Reassign a scope from focused workspace controls
- **WHEN** the operator selects a saved scope and applies a different target thread from the workspace surface
- **THEN** the workbench persists the reassignment through the workspace mutation flow
- **THEN** the workspace surface reflects the updated thread membership in place

### Requirement: Modern minimal workbench shell
The workbench shell SHALL present the desktop app as a modern minimal operational workspace with a compact sidebar, stable top toolbar, unframed primary canvas, and quiet status line.

#### Scenario: Navigate with a compact sidebar
- **WHEN** the renderer displays navigation sections and panel definitions
- **THEN** the sidebar uses list-style rows with clear active, hover, open, and closed states
- **THEN** the sidebar avoids oversized cards, decorative badges, and gradient active blocks

#### Scenario: Preserve a stable top toolbar
- **WHEN** the active panel changes between Web, Terminal, Workspace, Settings, Home, or Tool surfaces
- **THEN** the top toolbar keeps a consistent height and command placement
- **THEN** panel-specific controls appear without shifting unrelated toolbar regions

### Requirement: Minimal primary work surfaces
The Web and Terminal panel surfaces SHALL remain immersive primary work surfaces while configuration and runtime details appear as restrained inspector surfaces rather than decorative floating cards.

#### Scenario: Show Web panel details as an inspector
- **WHEN** the user opens Web panel details
- **THEN** persisted home URL, partition, session persistence, enabled state, loading state, and navigation status appear in a minimal inspector surface
- **THEN** the live web content remains the primary visual focus

#### Scenario: Show Terminal panel details as an inspector
- **WHEN** the user opens Terminal panel details
- **THEN** shell configuration, working directory, startup command, launch count, PID, buffer size, status, and restart-to-apply state appear in a minimal inspector surface
- **THEN** the terminal viewport remains the primary visual focus

### Requirement: Scannable secondary Workspace and Settings surfaces
Workspace and Settings SHALL use scannable inspector-style layouts that support audit, debugging, repair, configuration, and workspace profile management without becoming card-heavy dashboards.

#### Scenario: Inspect workspace records with clear hierarchy
- **WHEN** the user opens Workspace
- **THEN** thread, scope, artifact, preview, and advanced repair regions are separated by clear headings, dividers, and list/detail hierarchy
- **THEN** Workspace remains visually subordinate to Web and CLI conversation surfaces

#### Scenario: Edit settings in a concise form layout
- **WHEN** the user opens Settings
- **THEN** implemented preferences appear in predictable form rows with clear labels and controls
- **THEN** workspace profile controls are presented as active settings for saved workspace roots and startup default behavior
- **THEN** remaining deferred preference placeholders remain visible without reading like active configuration controls

#### Scenario: Keep Home focused on current workspace status
- **WHEN** the user opens Home after workspace profile management is available
- **THEN** Home continues to show the active workspace root, initialization state, saved context counts, and quick choose-workspace action
- **THEN** detailed profile list management remains in Settings rather than turning Home into a profile administration screen

### Requirement: Global terminal behavior preferences
Managed terminal panels SHALL honor global terminal behavior preferences for renderer-side interaction behavior while preserving the existing PTY session lifecycle and panel-level launch configuration contracts.

#### Scenario: Apply scrollback preference
- **WHEN** terminal behavior settings specify a supported scrollback line count
- **THEN** mounted terminal views use that line count for terminal buffer retention
- **THEN** changing the setting updates terminal view configuration without requiring a terminal session restart

#### Scenario: Apply copy-on-selection preference
- **WHEN** terminal behavior settings enable copy-on-selection
- **THEN** selecting text in a terminal view attempts to copy the selected text through the renderer clipboard path
- **THEN** disabling the setting leaves terminal text selection available without automatic copy behavior

#### Scenario: Apply paste confirmation preference
- **WHEN** terminal behavior settings require confirmation for multi-line paste
- **THEN** a multi-line paste requests user confirmation before text is written to the managed terminal session
- **THEN** canceling the confirmation prevents the pasted text from being sent to the PTY

#### Scenario: Preserve terminal launch configuration boundaries
- **WHEN** the user edits global terminal behavior settings
- **THEN** built-in and custom terminal panel shell, working-directory, shell-argument, startup-command, and restart-to-apply behavior remain governed by the terminal panel configuration surface
- **THEN** running PTY processes are not recreated solely because global terminal behavior settings changed

