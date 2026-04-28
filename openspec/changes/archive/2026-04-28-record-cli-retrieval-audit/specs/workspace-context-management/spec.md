## ADDED Requirements

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
