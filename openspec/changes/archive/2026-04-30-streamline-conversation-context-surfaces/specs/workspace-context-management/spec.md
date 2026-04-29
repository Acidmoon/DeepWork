## ADDED Requirements

### Requirement: Workspace inspection stays secondary to conversation flow
The workspace panel SHALL remain an optional inspection and debugging surface and SHALL not become a prerequisite for ordinary managed web or CLI continuation.

#### Scenario: Continue work without opening Workspace
- **WHEN** a managed web or CLI surface already carries enough continuity context for the current task
- **THEN** the user can continue from that active surface
- **THEN** no workspace artifact or scope selection is required before bounded retrieval can occur

#### Scenario: Keep detailed inspection subordinate to search and preview
- **WHEN** the operator intentionally opens Workspace to inspect a saved scope or artifact
- **THEN** the panel keeps that activity scoped to inspection, debugging, or recovery
- **THEN** the surface does not expand into a control-heavy artifact action cockpit

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
