## ADDED Requirements

### Requirement: Workspace-aware terminal bootstrap
Managed CLI sessions SHALL bootstrap into the current workspace context before running their configured startup commands.

#### Scenario: Start a built-in CLI panel
- **WHEN** the main process starts a built-in terminal panel
- **THEN** it sets the workspace-root environment variable for the session
- **THEN** it changes the shell working directory to the configured session directory or current workspace root
- **THEN** it loads the workspace helper PowerShell commands before executing prelude commands and the startup command

### Requirement: Context-limited prompt generation
The workspace panel SHALL generate prompt text that references only the selected artifacts, current workspace paths, and target-agent instruction file for the chosen terminal target.

#### Scenario: Generate a prompt draft from selected artifacts
- **WHEN** the user has selected one or more artifacts and requests prompt generation
- **THEN** the generated prompt names the target assistant profile
- **THEN** it includes the workspace rules path, context-index path, selected origin, suggested output directory, and selected artifact list
- **THEN** it instructs the target agent not to scan unrelated workspace files

#### Scenario: Generate a prompt draft without selection
- **WHEN** the user requests prompt generation without selecting any artifacts
- **THEN** the workspace panel shows a selection-required message instead of an empty prompt

### Requirement: Prompt delivery into managed CLI sessions
The workspace panel SHALL deliver the generated prompt into the selected managed terminal panel and SHALL auto-start the session first when it is not already running.

#### Scenario: Send a prompt to an idle managed terminal
- **WHEN** the user sends a prompt to a target terminal that is idle or stopped
- **THEN** the renderer starts the terminal session first
- **THEN** it writes the prompt into the terminal after startup bootstrap delay
- **THEN** it focuses the target terminal panel in the workbench

#### Scenario: Send a prompt to a running managed terminal
- **WHEN** the user sends a prompt to a target terminal that is already running
- **THEN** the renderer writes the prompt into that terminal immediately
- **THEN** it focuses the target terminal panel in the workbench

### Requirement: Terminal transcript capture for later retrieval
Managed terminal sessions SHALL flush buffered transcript content back into the workspace as scope-grouped artifacts.

#### Scenario: Receive terminal output
- **WHEN** a managed terminal session emits output data
- **THEN** the main process appends the data to the in-memory terminal buffer and log file
- **THEN** it schedules transcript persistence into the workspace using the session-specific context label

#### Scenario: Terminal session exits or is disposed
- **WHEN** a managed terminal session exits or is disposed
- **THEN** any buffered transcript content is flushed into the workspace before the session is fully torn down

