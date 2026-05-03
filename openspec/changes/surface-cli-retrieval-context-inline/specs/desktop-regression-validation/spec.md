## ADDED Requirements

### Requirement: Inline CLI retrieval context validation
The repository SHALL provide focused validation coverage for rendering latest CLI retrieval outcome summaries without reintroducing deprecated continuity chrome.

#### Scenario: Validate selected-scope summary
- **WHEN** renderer validation opens a terminal panel with a selected-scope retrieval summary fixture
- **THEN** it verifies the selected scope and retrieval mode are visible in the terminal status or inspector surface
- **THEN** it verifies raw artifact content is not displayed as part of the summary

#### Scenario: Validate fallback and no-match summaries
- **WHEN** renderer validation opens terminal fixtures for global fallback and no-match retrieval outcomes
- **THEN** it verifies each outcome is distinguishable through visible summary text or state
- **THEN** it verifies the primary panel still lacks deprecated continuity toolbar chrome
