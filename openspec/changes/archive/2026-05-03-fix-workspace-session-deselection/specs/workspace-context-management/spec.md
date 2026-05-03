## ADDED Requirements

### Requirement: Reversible local session inspection selection
The workspace panel SHALL allow operators to clear a selected session or log source through the same list interaction that selected it, while keeping the action scoped to local inspection state.

#### Scenario: Toggle a selected session back to all visible sources
- **WHEN** the operator clicks a session row in Workspace or Logs that is already the active local source selection
- **THEN** the panel resets the local source filter to the current thread-filtered all-sources state
- **THEN** the selected-scope summary and conversation detail surfaces return to their unselected inspection hints

#### Scenario: Preserve independent inspection state when deselecting
- **WHEN** the operator clears a local session selection through a repeated row click
- **THEN** the active bucket filter, thread filter, artifact multi-selection, and preview target remain unchanged
- **THEN** no continuity metadata or primary conversation state is rewritten by that deselection
