## MODIFIED Requirements

### Requirement: Inspectable retrieval outcomes
The system SHALL make managed CLI retrieval outcomes inspectable for each session when a workspace lookup occurs, and the recorded evidence SHALL remain stable enough to inspect through workspace-managed records instead of requiring transcript parsing or ad hoc file discovery.

#### Scenario: Record a retrieval with a selected scope
- **WHEN** a managed CLI session performs a lookup and selects a scope
- **THEN** the workspace records the original query, ranked candidate scopes, and selected scope identity for that session
- **THEN** the retrieval evidence can be inspected without parsing the full terminal transcript

#### Scenario: Record a retrieval with no selected scope
- **WHEN** a managed CLI session performs a lookup and no relevant scope is selected
- **THEN** the workspace records that no scope was chosen for the query
- **THEN** the recorded evidence includes a machine-readable reason or outcome for the no-match case

#### Scenario: Record a superseded pending lookup
- **WHEN** a managed CLI session starts a new lookup before the previous pending selection has been completed
- **THEN** the earlier lookup is finalized with an explicit machine-readable superseded outcome
- **THEN** the later lookup becomes the only active pending selection state for that session
