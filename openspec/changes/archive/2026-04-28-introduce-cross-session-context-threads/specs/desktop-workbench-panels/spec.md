## ADDED Requirements

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
