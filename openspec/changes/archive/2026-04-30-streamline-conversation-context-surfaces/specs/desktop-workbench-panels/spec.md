## ADDED Requirements

### Requirement: Managed-panel continuity metadata without dedicated chrome
Managed web and CLI panels SHALL preserve compact session-linked continuity metadata so ordinary conversation flow can continue without adding a dedicated current-thread or current-session bar to the primary surface.

#### Scenario: Preserve continuity metadata for an active managed panel
- **WHEN** the user is working inside a managed web or CLI panel
- **THEN** the panel state includes session-linked continuity fields such as thread identity, session scope identity, or explicit fresh-session state
- **THEN** those fields are derived from indexed or session-linked metadata rather than raw artifact preview reads

#### Scenario: Keep the primary panel surface focused on conversation
- **WHEN** continuity metadata exists for a managed panel
- **THEN** the primary web or CLI surface remains focused on the conversation itself rather than rendering a dedicated continuity toolbar or thread-management row
- **THEN** deeper inspection and repair stay in secondary workspace flows

### Requirement: Workspace inspection remains separately intentional
Managed web and CLI panels SHALL keep Workspace available as a separate inspection surface without requiring panel-level jump buttons or routine workspace hopping before follow-up work can continue.

#### Scenario: Inspect saved context from Workspace only when needed
- **WHEN** the operator wants to audit saved artifacts or repair thread organization for a managed panel session
- **THEN** the user can switch to Workspace and inspect that context through Workspace's own browsing controls
- **THEN** ordinary continuation on the managed panel does not depend on a dedicated in-panel Workspace jump
