## ADDED Requirements

### Requirement: OpenSpec active-change hygiene validation
The repository SHALL provide a repeatable check or documented validation step that identifies completed active OpenSpec changes before release-readiness validation is considered complete.

#### Scenario: Detect completed active changes
- **WHEN** the release-readiness validation checks active OpenSpec changes
- **THEN** it identifies active changes whose task lists are fully complete
- **THEN** it reports those changes as candidates for archival

### Requirement: IPC boundary regression validation
The repository SHALL provide focused validation coverage for malformed renderer-originated IPC payloads reaching security-sensitive desktop shell capabilities.

#### Scenario: Validate malformed IPC rejection
- **WHEN** the security-boundary validation sends malformed payloads for terminal, web-panel, workspace, and settings operations
- **THEN** the main-process boundary rejects or normalizes them before manager side effects occur
- **THEN** the validation reports failures with the affected IPC capability name

#### Scenario: Validate valid IPC behavior remains intact
- **WHEN** the same validation sends representative valid payloads for guarded operations
- **THEN** the guarded operations continue to reach the intended manager paths
- **THEN** existing focused desktop validation flows remain compatible with the new guards

### Requirement: In-app panel management regression validation
The repository SHALL provide renderer validation that covers custom web and CLI panel create/delete flows after native browser dialogs are removed.

#### Scenario: Validate custom web panel creation form
- **WHEN** the custom web-panel validation runs
- **THEN** it creates a custom web panel through the in-app form
- **THEN** it verifies invalid URL submission shows an in-app error without persisting settings

#### Scenario: Validate custom panel deletion confirmation
- **WHEN** the custom panel validation deletes a user-defined web or CLI panel
- **THEN** it confirms deletion through the in-app confirmation state
- **THEN** it verifies canceling the confirmation leaves the panel persisted
