## ADDED Requirements

### Requirement: Thread-aware managed session bootstrap
Managed CLI sessions SHALL bootstrap with workspace thread context when the user starts or continues work on a specific context thread.

#### Scenario: Start a managed CLI session on a selected thread
- **WHEN** the user starts or restarts a managed CLI panel while a thread is explicitly selected for continuation
- **THEN** the session bootstrap receives the current workspace root together with stable thread identity metadata
- **THEN** the launched session still keeps its own per-launch scope identity for transcript and retrieval audit records

#### Scenario: Start a fresh managed CLI session without a selected thread
- **WHEN** the user starts a managed CLI panel without continuing an existing thread
- **THEN** the bootstrap flow creates or selects a new thread according to the supported thread-start workflow
- **THEN** the resulting session is ready to capture later transcript content into that new thread

### Requirement: Thread-linked transcript persistence
Managed terminal sessions SHALL persist transcript artifacts with both session-scope identity and stable thread identity so later launches can continue the same line of work without transcript stitching.

#### Scenario: Flush transcript content during an active thread
- **WHEN** a managed terminal session emits transcript content while linked to a thread
- **THEN** the persisted workspace artifact preserves the session scope identity and associated thread identity
- **THEN** later workspace browsing and retrieval can discover that transcript through either layer

#### Scenario: Flush transcript content on exit or disposal
- **WHEN** a managed terminal session exits or is disposed after working within a thread
- **THEN** any pending transcript content is flushed before teardown completes
- **THEN** the saved transcript remains attached to the same thread for later continuation
