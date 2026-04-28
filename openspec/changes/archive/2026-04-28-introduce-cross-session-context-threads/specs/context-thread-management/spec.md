## ADDED Requirements

### Requirement: Persistent cross-session context threads
The system SHALL maintain stable context-thread records that are distinct from per-capture scope IDs so multiple web, CLI, and manual scopes can belong to one continuing line of work.

#### Scenario: Create a new thread
- **WHEN** the user explicitly starts a new context thread
- **THEN** the system creates a stable thread identity with a title or label suitable for later continuation
- **THEN** later captures can attach to that thread without reusing one scope ID for every session

#### Scenario: Backfill thread identity for existing workspace content
- **WHEN** previously saved workspace artifacts or scopes do not yet carry explicit thread metadata
- **THEN** the system derives backward-compatible thread records for them during rebuild or migration
- **THEN** the existing artifacts remain valid without rewriting their raw content files

### Requirement: Explicit thread continuation workflow
The system SHALL let users continue an existing context thread from later web, CLI, or manual-capture flows instead of forcing each new session to become a disconnected context island.

#### Scenario: Continue work on an existing thread
- **WHEN** the user selects an existing thread and opens or starts a later work surface
- **THEN** the resulting web or CLI session remains associated with that same thread
- **THEN** new captures from that flow are grouped under the selected thread while preserving their own session scope identity

#### Scenario: Start a new thread beside existing ones
- **WHEN** the user chooses to start a fresh thread instead of continuing an existing one
- **THEN** the system creates a new thread identity
- **THEN** subsequent captures are attached to the new thread until the user switches again

### Requirement: Scope-to-thread reassignment
The system SHALL allow an existing saved scope to be reassigned into a different thread without flattening scope boundaries or deleting the saved artifacts that belong to that scope.

#### Scenario: Move a saved scope into another thread
- **WHEN** the user reassigns a saved scope to an existing target thread
- **THEN** the scope remains an intact retrieval unit with its own artifact membership
- **THEN** workspace thread manifests and summaries update to reflect the new membership

#### Scenario: Preserve artifact integrity during reassignment
- **WHEN** a scope is moved from one thread to another
- **THEN** the raw artifact files remain in place unless another operation explicitly changes them
- **THEN** the reassignment is represented through workspace-managed metadata and index rebuilds
