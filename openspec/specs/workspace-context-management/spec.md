# workspace-context-management Specification

## Purpose
Define how the shared workspace persists artifacts, maintains retrieval-safe indexes, and supports secondary human inspection without turning workspace navigation into a routine prerequisite for web or CLI conversations.
## Requirements
### Requirement: User-selected workspace initialization and structure
The system SHALL initialize a writable workspace root containing stable bucket directories, manifest files, rules files, and origin index files only after a workspace root is explicitly configured, selected, or restored from a saved default workspace profile.

#### Scenario: Start without a selected workspace
- **WHEN** the workspace manager is constructed without an explicit workspace root and no valid default workspace profile resolves to a root
- **THEN** it does not create a default workspace under the user's documents path
- **THEN** it exposes an uninitialized workspace snapshot with no active workspace root
- **THEN** artifact persistence, managed web capture, terminal transcript persistence, and retrieval-audit persistence do not write workspace records until a workspace root is selected

#### Scenario: Initialize a selected workspace
- **WHEN** a workspace root is configured at startup, selected by the user, or restored from a saved default workspace profile
- **THEN** the workspace manager creates bucket directories for inbox, artifacts, outputs, manifests, rules, and logs under that selected root
- **THEN** it writes baseline manifest and rules files if they do not already exist

#### Scenario: Switch workspace root
- **WHEN** a user selects a different workspace root directly or opens a saved workspace profile
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
- **THEN** the helper-command surface remains available for explicit inspection or debugging rather than mandatory daily context setup

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

### Requirement: Conversation-surface continuity metadata
The workspace snapshot SHALL expose indexed thread, scope, and artifact summaries that active web and CLI surfaces can reuse as continuity metadata and retrieval input without reading raw artifact content or requiring dedicated primary-surface chrome.

#### Scenario: Publish continuity metadata for a managed panel
- **WHEN** the renderer receives workspace and managed-panel state for an active web or CLI surface
- **THEN** the available continuity metadata includes the linked thread identity, session-scope identity, and summary-level hints derived from indexed workspace metadata
- **THEN** the renderer and retrieval flows can reuse that metadata without loading a full workspace preview or opening raw artifact files

#### Scenario: Represent a fresh session without forcing workspace inspection
- **WHEN** a managed web or CLI surface has not yet linked to a saved scope or thread
- **THEN** the workspace snapshot still provides an explicit fresh-session or no-linked-context state
- **THEN** the user does not need to open the workspace panel just to understand that no prior context is attached yet

### Requirement: Workspace query-driven discovery
The workspace panel SHALL allow users to inspect saved sessions and artifacts through free-text search over indexed workspace metadata when they intentionally need audit, debugging, or recovery help.

#### Scenario: Search artifacts by indexed metadata
- **WHEN** the user enters a search query in the workspace panel
- **THEN** the renderer filters artifact results using indexed metadata such as artifact ID, summary, origin, path, tags, and context label
- **THEN** the system does not require recursive file reads across the workspace to produce those results

#### Scenario: Combine query with existing filters
- **WHEN** the user has selected a bucket and or origin filter and then enters a search query
- **THEN** the workspace panel applies the query together with the active bucket and origin constraints
- **THEN** result counts and empty states reflect the combined filter state

### Requirement: Workspace inspection remains secondary
The workspace panel SHALL present artifact, scope, and thread browsing as optional inspection and debugging surfaces instead of making workspace navigation a required step for routine continuation in web or CLI conversations.

#### Scenario: Continue work without opening Workspace
- **WHEN** a managed web or CLI surface already carries enough thread or scope context for the current task
- **THEN** the user can continue that line of work from the active conversation surface
- **THEN** no workspace artifact or scope selection is required before the model can use bounded retrieval

#### Scenario: Browse filtered artifact results only when deeper inspection is needed
- **WHEN** the workspace contains artifact records that match the active filter state
- **THEN** the artifact list updates to reflect the filtered workspace state
- **THEN** artifact review remains available from that filtered list without becoming the primary context-steering workflow

#### Scenario: Keep artifact browsing separate from CLI handoff
- **WHEN** the operator selects artifacts or sessions in the workspace panel
- **THEN** the panel treats those selections as local inspection state only
- **THEN** the panel does not expose prompt-draft generation or send-to-CLI actions as part of the browsing flow

### Requirement: On-demand artifact preview
The workspace panel SHALL let users preview a selected artifact by loading its content on demand through the existing artifact read operation when secondary inspection is intentionally requested.

#### Scenario: Preview a text-compatible artifact
- **WHEN** the user selects an artifact to preview
- **THEN** the renderer requests artifact content by artifact ID through the workspace read API
- **THEN** the panel displays the artifact metadata and returned content in a dedicated preview surface

#### Scenario: Preview state while loading or unavailable
- **WHEN** the preview target is loading, missing, or unsupported for text preview
- **THEN** the workspace panel shows an explicit loading, unavailable, or fallback preview state instead of silently failing

### Requirement: Conversation-first selected-scope detail
The workspace panel SHALL present selected-scope detail in an order that emphasizes structured conversation context before raw logs or file inventories.

#### Scenario: Prefer structured conversation detail when it exists
- **WHEN** the selected scope includes structured message artifacts together with transcript or log artifacts
- **THEN** the workspace detail surface shows the structured message view first
- **THEN** transcript or log excerpts remain available as lower-priority fallback inspection content

#### Scenario: Keep file inventory secondary within selected-scope detail
- **WHEN** the selected scope also includes many saved artifacts
- **THEN** the workspace detail surface preserves access to the artifact inventory
- **THEN** that inventory remains subordinate to the selected scope's conversation-shaped detail and summary context

### Requirement: Validation-backed workspace search, preview, and continuity flow
The workspace search, secondary inspection preview, managed web-context resync flow, and continuity-metadata propagation path SHALL be backed by repeatable regression-validation coverage for their critical interactions.

#### Scenario: Revalidate workspace inspection interactions after renderer changes
- **WHEN** the workspace renderer implementation changes in ways that could affect search, filtering, selection, selected-scope detail ordering, or preview behavior
- **THEN** developers can rerun a repeatable validation flow covering those interactions
- **THEN** regressions in the critical workspace retrieval and inspection path can be detected without reconstructing manual validation steps from scratch

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
The workspace panel SHALL let operators inspect threads as a secondary continuity-audit surface while keeping artifact and scope inspection available underneath that thread layer.

#### Scenario: Browse thread membership when deeper inspection is needed
- **WHEN** the workspace contains saved thread records
- **THEN** the renderer can show each thread with its member scopes, latest activity, and summary-level metadata
- **THEN** selecting a thread narrows manual inspection to the scopes and artifacts linked to that thread

#### Scenario: Rethread a saved scope as an explicit repair action
- **WHEN** the operator reassigns a saved scope to another thread from workspace inspection surfaces
- **THEN** the workspace manager persists the new assignment
- **THEN** the updated thread and scope state becomes visible through the next emitted workspace snapshot

### Requirement: Thread-aware helper-command support
The system SHALL expose thread inspection data through managed workspace helper commands for explicit debugging or ambiguity resolution without requiring recursive raw-file scanning across unrelated scopes.

#### Scenario: List saved threads from helper commands
- **WHEN** a workspace-aware CLI session inspects available threads
- **THEN** the helper-command surface returns thread-level summaries and identifiers derived from workspace-managed indexes
- **THEN** the result excludes raw artifact content from unrelated threads by default

#### Scenario: Inspect one thread before opening artifacts
- **WHEN** a workspace-aware CLI session requests details for one thread
- **THEN** the helper-command surface returns that thread's member scopes and summary metadata
- **THEN** the caller can decide which specific scope or artifact to open next without broad workspace scanning

### Requirement: Consistent thread-linked artifact metadata
The workspace SHALL persist thread-linked artifacts using a consistent metadata and summary envelope across manual saves, managed web captures, managed CLI transcripts, message indexes, and retrieval audit records.

#### Scenario: Persist a managed artifact with normalized inspection metadata
- **WHEN** the workspace manager persists a manual, web, terminal, or retrieval-audit artifact linked to a scope and thread
- **THEN** the saved artifact record includes normalized capture-mode labeling, context-label metadata, and thread-linked identity fields expected for that artifact type
- **THEN** the artifact summary and tags are derived from the same normalization rules used for later workspace browsing

#### Scenario: Rebuild legacy artifact indexes without rewriting files
- **WHEN** existing workspace artifacts do not yet carry every normalized inspection field
- **THEN** workspace-managed manifest or index rebuilds derive the missing inspection metadata during rebuild
- **THEN** the raw artifact files remain unchanged while later browsing and retrieval use consistent derived summaries and tags

### Requirement: Workspace artifact path confinement
The workspace manager SHALL treat persisted artifact paths as untrusted workspace-relative references and SHALL prevent artifact read, write, overwrite, and delete operations from resolving outside the active workspace root.

#### Scenario: Read ignores an artifact path outside the workspace
- **WHEN** the artifact manifest contains an artifact whose persisted path or absolute path resolves outside the active workspace root
- **THEN** the workspace read-artifact operation does not read that outside file
- **THEN** the operation returns an unavailable artifact result or omits the unsafe record from readable artifact content

#### Scenario: Delete scope does not remove files outside the workspace
- **WHEN** a scope contains an artifact record whose stored path points outside the active workspace root
- **THEN** deleting that scope does not delete the outside file
- **THEN** the workspace manifest and indexes are still rewritten without trusting the unsafe file path

#### Scenario: Upsert existing artifact repairs unsafe absolute path
- **WHEN** a managed capture upserts an existing artifact whose persisted absolute path disagrees with the safe workspace-relative path
- **THEN** the workspace writes the updated content only to a path resolved under the active workspace root
- **THEN** the persisted artifact metadata is repaired to expose the safe resolved absolute path

#### Scenario: Safe artifacts continue to work
- **WHEN** the artifact manifest contains a valid artifact path under the active workspace root
- **THEN** reads, upserts, deletes, and index rebuilds continue to operate on that workspace-managed file
- **THEN** existing valid workspace records remain backward-compatible

### Requirement: Reversible local session inspection selection
The workspace panel SHALL allow operators to clear a selected session or log source through the same list interaction that selected it, while keeping the action scoped to local inspection state.

#### Scenario: Toggle a selected session back to all visible sources
- **WHEN** the operator clicks a session row in Workspace or Logs that is already the active local source selection
- **THEN** the panel resets the local source filter to the current thread-filtered all-sources state
- **THEN** the selected-scope summary and conversation detail surfaces return to their unselected inspection hints

#### Scenario: Preserve independent inspection state when deselecting
- **WHEN** the operator clears a local session selection through a repeated row click
- **THEN** the active bucket filter, thread filter, artifact multi-selection, and preview target remain unchanged
- **THEN** no continuity metadata or primary conversation state is rewritten by that deselection

### Requirement: Mode-specific inspection hierarchy
The workspace inspection model SHALL expose the active filter state clearly and SHALL adapt its detail hierarchy to the current inspection mode so conversational context and runtime logs are not presented as the same reading task.

#### Scenario: Clarify active inspection constraints
- **WHEN** the operator changes bucket, source, thread scope, or search query while inspecting workspace-managed records
- **THEN** the panel surfaces the active constraints near the top of the inspection flow
- **THEN** list headings, result counts, and empty states reflect the current mode and active constraints

#### Scenario: Prioritize selected source detail in Workspace mode
- **WHEN** the active inspection mode is conversation or context browsing and a source is selected
- **THEN** the panel emphasizes selected source detail before related artifact inventory
- **THEN** artifact preview remains a dedicated follow-on surface instead of duplicating the selected source summary in another competing pane

#### Scenario: Prioritize record browsing in Logs mode
- **WHEN** the active inspection mode is log browsing
- **THEN** the panel emphasizes log source selection, log record rows, and raw preview content
- **THEN** operators do not need to interpret conversation-oriented labels to inspect runtime records

