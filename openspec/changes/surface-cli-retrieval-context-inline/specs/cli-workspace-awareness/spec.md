## ADDED Requirements

### Requirement: Inline retrieval outcome summaries
Managed CLI sessions SHALL expose a concise latest retrieval outcome summary that can be rendered by the terminal panel without reading raw artifact content or parsing terminal transcript text.

#### Scenario: Summarize selected-scope retrieval
- **WHEN** a managed CLI lookup resolves with a selected scope
- **THEN** the session state exposes the original query, retrieval mode, selected scope identity, and candidate count as summary metadata
- **THEN** the summary references the persisted retrieval audit evidence without embedding unrelated raw artifact content

#### Scenario: Summarize global fallback retrieval
- **WHEN** a thread-first lookup falls back to global workspace ranking
- **THEN** the summary preserves that fallback path together with the selected or no-match outcome
- **THEN** later renderer inspection can distinguish fallback from thread-local retrieval

#### Scenario: Summarize no-match retrieval
- **WHEN** a managed CLI lookup resolves without selecting a scope
- **THEN** the summary exposes the no-match outcome and machine-readable reason
- **THEN** the terminal panel can explain that no prior context was attached for that lookup

#### Scenario: Avoid raw content injection
- **WHEN** a retrieval summary is projected into terminal panel state
- **THEN** it includes only bounded metadata from the retrieval outcome
- **THEN** it does not include raw artifact bodies from selected or unselected scopes
