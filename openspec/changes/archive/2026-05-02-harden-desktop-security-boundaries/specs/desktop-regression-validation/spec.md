## ADDED Requirements

### Requirement: Security and resource boundary validation
The repository SHALL provide repeatable validation coverage for workspace path confinement, main-process web-panel settings validation, malformed custom panel settings, and bounded terminal transcript persistence.

#### Scenario: Validate unsafe workspace artifact paths
- **WHEN** the focused validation runs with a workspace manifest containing artifact paths that escape the workspace root
- **THEN** read, overwrite, and delete operations do not access files outside the workspace root
- **THEN** valid in-workspace artifacts remain readable and indexable

#### Scenario: Validate unsafe web-panel settings
- **WHEN** the focused validation submits persisted or IPC-provided web-panel settings with unsupported URL schemes
- **THEN** unsafe web-panel targets are rejected or normalized out before a managed web panel can load them
- **THEN** valid HTTP and HTTPS panel settings continue to synchronize

#### Scenario: Validate malformed custom web-panel settings
- **WHEN** the focused validation loads malformed, duplicate, or built-in-colliding custom web-panel settings
- **THEN** settings normalization produces a deterministic safe snapshot
- **THEN** renderer and runtime panel synchronization do not crash

#### Scenario: Validate long terminal transcript behavior
- **WHEN** the focused validation simulates a long-running managed terminal session with repeated output and transcript flushes
- **THEN** transcript persistence remains bounded or chunked according to the implemented resource limit
- **THEN** terminal state, visible buffer behavior, and persisted transcript metadata remain consistent
