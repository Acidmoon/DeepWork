## ADDED Requirements

### Requirement: Active OpenSpec changes remain current
The repository SHALL keep `openspec/changes/` reserved for changes that are not yet completed or archived, and SHALL archive completed changes through the normal OpenSpec workflow.

#### Scenario: Completed change is archived
- **WHEN** a change under `openspec/changes/` has all implementation and validation tasks complete
- **THEN** the change is archived through the OpenSpec archive command path rather than remaining as active work
- **THEN** active change listings no longer include that completed change

#### Scenario: Incomplete change remains active
- **WHEN** a change still has unchecked implementation, validation, design, or release-readiness tasks
- **THEN** the change remains under `openspec/changes/`
- **THEN** it is not archived solely because adjacent changes have completed
