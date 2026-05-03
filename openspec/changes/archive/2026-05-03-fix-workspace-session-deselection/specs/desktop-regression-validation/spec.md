## ADDED Requirements

### Requirement: Workspace session deselection regression validation
The repository SHALL provide repeatable validation coverage for clearing Workspace and Logs session selections through repeated row clicks.

#### Scenario: Validate repeated click deselection in artifact inspection
- **WHEN** the workspace regression validation selects the same session row twice in the artifact inspection flow
- **THEN** it verifies the second click clears the selected-source summary back to the unselected inspection state
- **THEN** it verifies any existing preview target remains available after the source selection is cleared

#### Scenario: Validate repeated click deselection in log inspection
- **WHEN** the workspace regression validation selects the same log-source row twice in the log inspection flow
- **THEN** it verifies the second click returns the log inspection source filter to the current all-sources state
- **THEN** it verifies the log list and preview behavior continue to work after deselection
