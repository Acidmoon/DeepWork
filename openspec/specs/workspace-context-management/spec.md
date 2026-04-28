# workspace-context-management Specification

## Purpose
Define how the shared workspace persists artifacts, maintains retrieval-safe indexes, and supports optional human inspection without making manual context packaging a prerequisite for CLI use.
## Requirements
### Requirement: Workspace initialization and structure
The system SHALL initialize a writable workspace root containing stable bucket directories, manifest files, rules files, and origin index files for artifact retrieval.

#### Scenario: Initialize the default workspace
- **WHEN** the workspace manager is constructed without an explicit workspace root
- **THEN** it creates the default workspace under the user's documents path
- **THEN** it creates bucket directories for inbox, artifacts, outputs, manifests, rules, and logs
- **THEN** it writes baseline manifest and rules files if they do not already exist

#### Scenario: Switch workspace root
- **WHEN** a user selects a different workspace root
- **THEN** the workspace manager reinitializes manifests and rules under the chosen root
- **THEN** it emits an updated workspace snapshot to the renderer

### Requirement: Artifact persistence and index maintenance
The system SHALL persist manual, web, and terminal captures as typed artifacts and maintain `artifacts.json`, `context-index.json`, and per-scope origin manifests from the saved records.

#### Scenario: Save clipboard content as an artifact
- **WHEN** the user invokes Save Clipboard with supported clipboard content
- **THEN** the workspace manager stores the content as an artifact file in the matching artifact bucket
- **THEN** it appends or updates the artifact record in `artifacts.json`
- **THEN** it rebuilds the context index and per-origin manifest files

#### Scenario: Persist auto-captured web or terminal context
- **WHEN** a managed web panel or terminal session flushes captured context into the workspace
- **THEN** the workspace manager upserts the corresponding artifact by artifact ID when present
- **THEN** the artifact metadata preserves origin, context label, capture mode, and capture-specific fields
- **THEN** scope indexes reflect the newest artifact ordering

### Requirement: Retrieval-safe workspace rules
The system SHALL write retrieval protocol files and helper PowerShell commands into the workspace so CLI agents can decide whether retrieval is needed, rank candidate scopes, and open only the specific artifacts required for the current request.

#### Scenario: Inspect workspace helper rules
- **WHEN** the workspace is initialized
- **THEN** it contains managed rule files that distinguish self-contained requests from context-dependent requests
- **THEN** it contains a PowerShell helper script defining `aw-workspace`, `aw-origins`, `aw-origin`, `aw-artifact`, `aw-cat-artifact`, and `aw-suggest`
- **THEN** `aw-suggest` returns scope-first retrieval candidates from indexed metadata before any raw artifact file is read

#### Scenario: Request structured scope suggestions
- **WHEN** a CLI agent requests structured retrieval suggestions for a query
- **THEN** the workspace helper returns ranked scope data in a machine-readable format
- **THEN** the structured result excludes raw artifact content from unrelated scopes

#### Scenario: Rebuild managed rule content
- **WHEN** the workspace manager reinitializes an existing workspace
- **THEN** it rewrites the managed protocol and helper-command files with the latest scope-first retrieval behavior
- **THEN** it preserves the marker-managed instruction blocks inside `AGENTS.md` and `CLAUDE.md`

### Requirement: Scope-level workspace operations
The system SHALL allow the renderer to read artifact content by ID, delete an indexed scope and its files, and observe live workspace snapshot updates.

#### Scenario: Read a specific artifact
- **WHEN** the renderer requests artifact content for an existing artifact ID
- **THEN** the workspace manager returns the artifact metadata and file content

#### Scenario: Delete a saved scope
- **WHEN** the renderer deletes a specific scope ID
- **THEN** the workspace manager removes every artifact file belonging to that scope
- **THEN** it rewrites manifest and context-index state without the removed records
- **THEN** it emits an updated workspace snapshot

### Requirement: Workspace query-driven discovery
The workspace panel SHALL allow users to narrow sessions and artifacts with a free-text query matched against indexed workspace metadata that is already available in renderer state.

#### Scenario: Search artifacts by indexed metadata
- **WHEN** the user enters a search query in the workspace panel
- **THEN** the renderer filters artifact results using indexed metadata such as artifact ID, summary, origin, path, tags, and context label
- **THEN** the system does not require recursive file reads across the workspace to produce those results

#### Scenario: Combine query with existing filters
- **WHEN** the user has selected a bucket and/or origin filter and then enters a search query
- **THEN** the workspace panel applies the query together with the active bucket and origin constraints
- **THEN** result counts and empty states reflect the combined filter state

### Requirement: Workspace artifact result browsing
The workspace panel SHALL present artifact and session result lists as search-aware discovery surfaces rather than fixed-size recent-only slices, and those browsing surfaces SHALL remain inspection-oriented instead of acting as manual CLI handoff builders.

#### Scenario: Browse filtered session results
- **WHEN** the workspace contains indexed sessions and the user adjusts filters or search query
- **THEN** the session list updates to reflect the filtered workspace state
- **THEN** selecting a session continues to drive scope-level preview behavior

#### Scenario: Browse filtered artifact results
- **WHEN** the workspace contains artifact records that match the active filter state
- **THEN** the artifact list updates to reflect the filtered workspace state
- **THEN** artifact review and optional manual inspection remain available from that filtered list without gating automatic CLI retrieval

#### Scenario: Keep artifact browsing separate from CLI handoff
- **WHEN** the operator selects artifacts or sessions in the workspace panel
- **THEN** the panel treats those selections as local inspection state only
- **THEN** the panel does not expose prompt-draft generation or send-to-CLI actions as part of the browsing flow

### Requirement: On-demand artifact preview
The workspace panel SHALL let users preview a selected artifact by loading its content on demand through the existing artifact read operation.

#### Scenario: Preview a text-compatible artifact
- **WHEN** the user selects an artifact to preview
- **THEN** the renderer requests artifact content by artifact ID through the workspace read API
- **THEN** the panel displays the artifact metadata and returned content in a dedicated preview surface

#### Scenario: Preview state while loading or unavailable
- **WHEN** the preview target is loading, missing, or unsupported for text preview
- **THEN** the workspace panel shows an explicit loading, unavailable, or fallback preview state instead of silently failing

### Requirement: Validation-backed workspace search and preview flow
The workspace search, artifact preview, and managed web-context resync flow SHALL be backed by a repeatable regression-validation path for their critical interactions.

#### Scenario: Revalidate workspace retrieval interactions after renderer changes
- **WHEN** the workspace renderer implementation changes in ways that could affect search, filtering, selection, or preview behavior
- **THEN** developers can rerun a repeatable validation flow covering those interactions
- **THEN** regressions in the critical workspace retrieval path can be detected without reconstructing manual validation steps from scratch

#### Scenario: Revalidate managed web-context persistence after sync-path changes
- **WHEN** main-process, preload, or renderer changes could affect managed web capture or manual workspace resync
- **THEN** developers can rerun a repeatable validation flow that exercises web-context persistence into the workspace
- **THEN** the validation confirms that manual workspace resync refreshes workspace-managed records instead of only updating local renderer status

### Requirement: Scope-ranked retrieval metadata
The system SHALL persist scope-level retrieval metadata in `context-index.json` using indexed artifact fields so workspace lookups can rank candidate sessions without reading raw artifact content.

#### Scenario: Rebuild scope retrieval metadata
- **WHEN** artifact records are added, updated, or removed
- **THEN** the workspace manager rebuilds each scope entry with normalized scope identity, latest-update metadata, and aggregated searchable metadata
- **THEN** the resulting scope entries can be ranked without opening raw artifact files

#### Scenario: Keep retrieval metadata scoped
- **WHEN** artifacts belong to different origins or context labels
- **THEN** the workspace manager keeps retrieval metadata grouped by scope ID
- **THEN** unrelated sessions are not merged into one retrieval candidate

### Requirement: Retrieval audit persistence and indexing
The system SHALL persist completed managed-CLI retrieval audit evidence as workspace-managed log records so those outcomes participate in manifest indexing, scope metadata, and normal workspace inspection flows.

#### Scenario: Upsert a completed retrieval audit record
- **WHEN** a managed CLI retrieval lookup resolves with a selected, no-match, or superseded outcome
- **THEN** the workspace upserts a retrieval audit record under the logs bucket for that CLI session scope
- **THEN** the saved record includes structured metadata for query, outcome, selected scope identity, and ranked candidate scope IDs
- **THEN** manifest and context-index data are rebuilt so the retrieval audit can be discovered through existing workspace browsing and preview flows

#### Scenario: Keep pending lookup state out of completed workspace records
- **WHEN** a retrieval lookup is still pending selection and only the temporary pending-state file exists
- **THEN** the workspace does not expose that pending-state file as a completed retrieval audit record
- **THEN** only the resolved audit evidence becomes inspectable through normal workspace artifact flows

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

