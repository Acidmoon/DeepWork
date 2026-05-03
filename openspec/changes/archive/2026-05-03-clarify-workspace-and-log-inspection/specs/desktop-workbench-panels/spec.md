## ADDED Requirements

### Requirement: Distinct Workspace and Logs inspection framing
The renderer SHALL present Workspace and Logs as distinct secondary inspection surfaces with mode-specific hierarchy, labels, and pane emphasis rather than as the same inspection layout with light copy changes.

#### Scenario: Inspect conversational context in Workspace
- **WHEN** the operator opens Workspace to inspect saved conversation or artifact context
- **THEN** the primary surface leads with source discovery, selected source detail, related records, and preview in a reading order that is easy to scan
- **THEN** thread repair, maintenance, and technical sections remain available but visually subordinate to the main inspection panes

#### Scenario: Inspect runtime records in Logs
- **WHEN** the operator opens Logs to inspect terminal transcripts, retrieval audits, or debugging records
- **THEN** the primary surface uses log-oriented headings and pane emphasis for source selection, record browsing, and raw preview
- **THEN** the surface does not depend on conversation-first summary framing for routine log inspection
