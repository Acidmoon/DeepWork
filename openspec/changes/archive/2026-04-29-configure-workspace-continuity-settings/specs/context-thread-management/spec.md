## ADDED Requirements

### Requirement: Configurable default session continuity
The system SHALL apply the persisted default thread-continuation preference whenever a managed web capture, managed CLI session, or manual save starts without an explicit thread selection.

#### Scenario: Continue the active thread by default
- **WHEN** the default continuation preference is set to continue the active thread and an implicit capture or managed session starts without a thread ID
- **THEN** the system attaches the new scope to the current active thread when one exists
- **THEN** it creates and activates a new thread only if no active thread exists yet

#### Scenario: Start a new thread for a new implicit scope
- **WHEN** the default continuation preference is set to start a new thread and an unseen implicit scope is captured without a thread ID
- **THEN** the system creates and activates a new thread for that scope before saving artifacts
- **THEN** later writes for the same scope continue using that created thread rather than opening a fresh thread on every save

#### Scenario: Explicit thread selection overrides the default
- **WHEN** a capture or session already provides an explicit thread ID
- **THEN** the system uses that explicit thread selection
- **THEN** it does not replace it with the persisted default continuation preference
