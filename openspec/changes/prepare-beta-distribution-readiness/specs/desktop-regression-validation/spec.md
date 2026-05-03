## ADDED Requirements

### Requirement: Validate beta packaged-app readiness
The repository SHALL provide repeatable packaged-app validation guidance or checks for the beta desktop distribution workflow.

#### Scenario: Verify beta packaged startup behavior
- **WHEN** the beta packaged-app validation flow runs
- **THEN** it confirms the packaged renderer shell opens successfully
- **THEN** it confirms the app preserves explicit workspace-selection behavior and safe settings restoration
