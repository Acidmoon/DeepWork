## MODIFIED Requirements

### Requirement: Managed-panel continuity metadata without dedicated chrome
The workbench SHALL preserve session-linked continuity and retrieval metadata for managed web and CLI panels so ordinary conversation flow can continue without adding a dedicated current-thread or current-session bar to the primary surface.

#### Scenario: Preserve continuity metadata for an active managed panel
- **WHEN** a managed web or CLI panel is active
- **THEN** the renderer state for that panel includes session-linked continuity information such as thread identity, session scope identity, fresh-session state, or latest retrieval outcome summary
- **THEN** the metadata is derived from indexed, audit, or session-linked state rather than requiring workspace preview reads

#### Scenario: Show compact CLI retrieval context
- **WHEN** a managed CLI session has a latest retrieval outcome summary
- **THEN** the terminal panel can display that summary in an existing status or inspector region
- **THEN** the display remains subordinate to the terminal conversation and does not require opening Workspace first

#### Scenario: Keep primary panel chrome focused on the conversation
- **WHEN** continuity or retrieval metadata exists for a managed panel
- **THEN** the primary web or CLI surface does not require a persistent continuity toolbar, inspection button row, or thread-management strip
- **THEN** deeper inspection and repair remain available through Workspace and other secondary flows
