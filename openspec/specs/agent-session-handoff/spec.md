# agent-session-handoff Specification

## Purpose
Define how managed CLI sessions bootstrap into the workspace, let users talk to the model in ordinary language, and persist transcripts so later workspace retrieval stays possible without manual handoff packaging.
## Requirements
### Requirement: Workspace-aware terminal bootstrap
Managed CLI sessions SHALL bootstrap into the current workspace context before running their configured startup commands.

#### Scenario: Start a built-in CLI panel
- **WHEN** the main process starts a built-in terminal panel
- **THEN** it sets the workspace-root environment variable for the session
- **THEN** it changes the shell working directory to the configured session directory or current workspace root
- **THEN** it loads the workspace helper PowerShell commands before executing prelude commands and the startup command

### Requirement: Natural-language-first CLI interaction
Managed CLI sessions SHALL treat ordinary user messages as the primary interaction mode and SHALL rely on workspace retrieval instead of manual context handoff prompts when earlier context matters.

#### Scenario: Handle a self-contained request directly
- **WHEN** the user sends a request that does not depend on prior workspace history
- **THEN** the managed CLI session answers directly
- **THEN** the interaction does not require a separately generated workspace handoff prompt

#### Scenario: Mention a prior session in natural language
- **WHEN** the user refers to an earlier session, source, or saved workspace context in ordinary language
- **THEN** the managed CLI session consults workspace retrieval helpers on demand
- **THEN** the session narrows to the relevant scope before reading raw artifact content

#### Scenario: Avoid renderer-generated prompt packaging
- **WHEN** the user needs prior workspace context while talking to a managed CLI session
- **THEN** the supported path is to describe the need in natural language rather than generate a renderer-side handoff prompt
- **THEN** the managed session remains responsible for deciding whether to retrieve workspace context

### Requirement: Optional manual workspace inspection
The system MAY still expose manual artifact or scope inspection surfaces for operator review, but managed CLI retrieval SHALL NOT depend on renderer-side prompt packaging.

#### Scenario: Inspect workspace context manually
- **WHEN** an operator explicitly opens a workspace scope, artifact preview, or helper command output
- **THEN** that inspection serves as optional review or debugging support
- **THEN** normal CLI use still remains direct natural-language interaction without mandatory manual handoff steps

#### Scenario: Inspect without send-to-CLI controls
- **WHEN** the operator is reviewing saved workspace context from the renderer
- **THEN** the inspection surface does not need prompt preview, target-panel selection, or send-to-CLI controls to remain useful
- **THEN** any manual review stays separate from the managed CLI retrieval path

### Requirement: Terminal transcript capture for later retrieval
Managed terminal sessions SHALL flush buffered transcript content back into the workspace as scope-grouped artifacts.

#### Scenario: Receive terminal output
- **WHEN** a managed terminal session emits output data
- **THEN** the main process appends the data to the in-memory terminal buffer and log file
- **THEN** it schedules transcript persistence into the workspace using the session-specific context label

#### Scenario: Terminal session exits or is disposed
- **WHEN** a managed terminal session exits or is disposed
- **THEN** any buffered transcript content is flushed into the workspace before the session is fully torn down

### Requirement: Thread-aware managed session bootstrap
Managed CLI sessions SHALL bootstrap with workspace thread context when the user starts or continues work on a specific context thread.

#### Scenario: Start a managed CLI session on a selected thread
- **WHEN** the user starts or restarts a managed CLI panel while a thread is explicitly selected for continuation
- **THEN** the session bootstrap receives the current workspace root together with stable thread identity metadata
- **THEN** the launched session still keeps its own per-launch scope identity for transcript and retrieval audit records

#### Scenario: Start a fresh managed CLI session without a selected thread
- **WHEN** the user starts a managed CLI panel without continuing an existing thread
- **THEN** the bootstrap flow creates or selects a new thread according to the supported thread-start workflow
- **THEN** the resulting session is ready to capture later transcript content into that new thread

### Requirement: Thread-linked transcript persistence
Managed terminal sessions SHALL persist transcript artifacts with both session-scope identity and stable thread identity so later launches can continue the same line of work without transcript stitching.

#### Scenario: Flush transcript content during an active thread
- **WHEN** a managed terminal session emits transcript content while linked to a thread
- **THEN** the persisted workspace artifact preserves the session scope identity and associated thread identity
- **THEN** later workspace browsing and retrieval can discover that transcript through either layer

#### Scenario: Flush transcript content on exit or disposal
- **WHEN** a managed terminal session exits or is disposed after working within a thread
- **THEN** any pending transcript content is flushed before teardown completes
- **THEN** the saved transcript remains attached to the same thread for later continuation

