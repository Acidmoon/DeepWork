## ADDED Requirements

### Requirement: Log inspection regression validation
The repository SHALL provide repeatable validation coverage for log-bucket listing, metadata filtering, and preview behavior.

#### Scenario: Validate log listing and filtering
- **WHEN** the workspace regression validation opens the Logs surface with deterministic fixtures
- **THEN** it verifies terminal transcript and retrieval-audit log records are listed from the `logs/` bucket
- **THEN** it verifies query and origin filters reduce log results using indexed metadata

#### Scenario: Validate log preview
- **WHEN** the validation selects a text-compatible log artifact
- **THEN** it verifies the preview content is loaded through the workspace artifact read path
- **THEN** it verifies unavailable or unsupported logs produce explicit preview states
