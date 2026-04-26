## ADDED Requirements

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
The workspace panel SHALL present artifact and session result lists as search-aware discovery surfaces rather than fixed-size recent-only slices.

#### Scenario: Browse filtered session results
- **WHEN** the workspace contains indexed sessions and the user adjusts filters or search query
- **THEN** the session list updates to reflect the filtered workspace state
- **THEN** selecting a session continues to drive scope-level preview behavior

#### Scenario: Browse filtered artifact results
- **WHEN** the workspace contains artifact records that match the active filter state
- **THEN** the artifact list updates to reflect the filtered workspace state
- **THEN** artifact selection for prompt building remains available from that filtered list

### Requirement: On-demand artifact preview
The workspace panel SHALL let users preview a selected artifact by loading its content on demand through the existing artifact read operation.

#### Scenario: Preview a text-compatible artifact
- **WHEN** the user selects an artifact to preview
- **THEN** the renderer requests artifact content by artifact ID through the workspace read API
- **THEN** the panel displays the artifact metadata and returned content in a dedicated preview surface

#### Scenario: Preview state while loading or unavailable
- **WHEN** the preview target is loading, missing, or unsupported for text preview
- **THEN** the workspace panel shows an explicit loading, unavailable, or fallback preview state instead of silently failing
