## MODIFIED Requirements

### Requirement: Workspace artifact result browsing
The workspace panel SHALL present artifact and session result lists as search-aware discovery surfaces rather than fixed-size recent-only slices, and those browsing surfaces SHALL remain inspection-oriented instead of acting as manual CLI handoff builders.

#### Scenario: Browse filtered session results
- **WHEN** the workspace contains indexed sessions and the user adjusts filters or search query
- **THEN** the session list updates to reflect the filtered workspace state
- **THEN** selecting a session continues to drive scope-level preview behavior

#### Scenario: Browse filtered artifact results
- **WHEN** the workspace contains artifact records that match the active filter state
- **THEN** the artifact list updates to reflect the filtered workspace state
- **THEN** artifact review and optional manual inspection remain available from that filtered list without gating automatic CLI retrieval

#### Scenario: Keep artifact browsing separate from CLI handoff
- **WHEN** the operator selects artifacts or sessions in the workspace panel
- **THEN** the panel treats those selections as local inspection state only
- **THEN** the panel does not expose prompt-draft generation or send-to-CLI actions as part of the browsing flow
