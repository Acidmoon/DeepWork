## ADDED Requirements

### Requirement: Inspectable managed session identity
Managed CLI sessions SHALL expose their linked workspace session identity through runtime panel state in addition to bootstrap environment variables.

#### Scenario: Publish session identity after session start
- **WHEN** the main process starts or restarts a managed CLI session
- **THEN** the terminal snapshot published to the renderer includes the session scope identity, context label, and linked thread identity for that launch
- **THEN** the emitted runtime state matches the identity used for transcript persistence and retrieval-audit records

#### Scenario: Keep session identity stable during later thread switches
- **WHEN** the operator changes the workspace's active thread after a managed CLI session has already started
- **THEN** the running session keeps reporting the session identity assigned at launch
- **THEN** only future managed session launches adopt the newly selected active thread unless an explicit reassignment flow runs elsewhere
