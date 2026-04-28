## ADDED Requirements

### Requirement: Thread manifests and summary indexes
The system SHALL persist thread-level manifests and summary indexes alongside the existing artifact manifest, context index, and per-scope manifests so cross-session context can be rebuilt from workspace-managed records.

#### Scenario: Rebuild thread manifests after workspace changes
- **WHEN** artifacts are added, updated, deleted, or reassigned between threads
- **THEN** the workspace manager rebuilds the thread index and any per-thread manifest files from current workspace metadata
- **THEN** the resulting thread records remain consistent with the existing artifact and scope indexes

#### Scenario: Keep thread rebuild additive for existing workspaces
- **WHEN** the workspace contains artifacts created before thread support existed
- **THEN** thread records are backfilled in a backward-compatible way during rebuild or migration
- **THEN** the workspace remains readable even before any manual rethreading occurs

### Requirement: Thread-aware workspace inspection
The workspace panel SHALL let operators inspect threads as a first-class continuity surface while keeping artifact and scope inspection available underneath that thread layer.

#### Scenario: Browse thread membership
- **WHEN** the workspace contains saved thread records
- **THEN** the renderer can show each thread with its member scopes, latest activity, and summary-level metadata
- **THEN** selecting a thread narrows manual inspection to the scopes and artifacts linked to that thread

#### Scenario: Rethread a saved scope from the workspace
- **WHEN** the operator reassigns a saved scope to another thread from workspace inspection surfaces
- **THEN** the workspace manager persists the new assignment
- **THEN** the updated thread and scope state becomes visible through the next emitted workspace snapshot

### Requirement: Thread-aware helper-command support
The system SHALL expose thread inspection data through managed workspace helper commands without requiring recursive raw-file scanning across unrelated scopes.

#### Scenario: List saved threads from helper commands
- **WHEN** a workspace-aware CLI session inspects available threads
- **THEN** the helper-command surface returns thread-level summaries and identifiers derived from workspace-managed indexes
- **THEN** the result excludes raw artifact content from unrelated threads by default

#### Scenario: Inspect one thread before opening artifacts
- **WHEN** a workspace-aware CLI session requests details for one thread
- **THEN** the helper-command surface returns that thread's member scopes and summary metadata
- **THEN** the caller can decide which specific scope or artifact to open next without broad workspace scanning
