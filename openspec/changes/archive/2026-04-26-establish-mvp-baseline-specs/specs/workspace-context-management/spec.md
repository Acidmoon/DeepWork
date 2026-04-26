## ADDED Requirements

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
The system SHALL write retrieval protocol files and helper PowerShell commands into the workspace so CLI agents can inspect indexes before opening raw artifact files.

#### Scenario: Inspect workspace helper rules
- **WHEN** the workspace is initialized
- **THEN** it contains managed rule files for workspace protocol and agent-specific instructions
- **THEN** it contains a PowerShell helper script defining `aw-workspace`, `aw-origins`, `aw-origin`, `aw-artifact`, `aw-cat-artifact`, and `aw-suggest`

#### Scenario: Rebuild managed rule content
- **WHEN** the workspace manager reinitializes an existing workspace
- **THEN** it rewrites the managed protocol and helper-command files
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

