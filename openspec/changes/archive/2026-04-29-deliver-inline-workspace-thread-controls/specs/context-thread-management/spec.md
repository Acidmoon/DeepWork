## ADDED Requirements

### Requirement: Editable thread titles
The system SHALL let operators rename an existing thread without changing its stable thread identity or existing scope membership.

#### Scenario: Rename an existing thread
- **WHEN** the operator saves a new title for an existing thread
- **THEN** the system persists the new title against the existing thread ID
- **THEN** later workspace snapshots and continuity surfaces show the updated title

#### Scenario: Preserve membership across thread renames
- **WHEN** a thread title changes after scopes or sessions have already linked to that thread
- **THEN** existing scope memberships and artifact associations remain attached to the same thread ID
- **THEN** future captures continue using that stable thread identity until the operator selects another thread
