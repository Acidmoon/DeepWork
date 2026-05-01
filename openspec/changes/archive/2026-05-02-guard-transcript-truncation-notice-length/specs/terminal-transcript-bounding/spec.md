## ADDED Requirements

### Requirement: Transcript capture size must exceed notice length
The `MAX_TRANSCRIPT_CAPTURE_SIZE` constant SHALL be enforced to be greater than `TRANSCRIPT_TRUNCATION_NOTICE.length` at module load time. If the invariant is violated, the process SHALL fail immediately with a descriptive error.

#### Scenario: Current values pass the assertion
- **WHEN** the terminal-manager module is loaded with `MAX_TRANSCRIPT_CAPTURE_SIZE = 120_000` and the current notice string
- **THEN** the invariant check passes and execution continues normally

#### Scenario: Reduced MAX_TRANSCRIPT_CAPTURE_SIZE triggers assertion failure
- **WHEN** `MAX_TRANSCRIPT_CAPTURE_SIZE` is reduced below `TRANSCRIPT_TRUNCATION_NOTICE.length`
- **THEN** the module fails to load with an error message indicating the invariant is violated
