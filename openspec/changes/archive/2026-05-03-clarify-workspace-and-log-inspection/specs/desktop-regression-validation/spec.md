## ADDED Requirements

### Requirement: Workspace and Logs hierarchy regression validation
The repository SHALL provide repeatable validation coverage for the clarified Workspace and Logs inspection hierarchy so semantic layout regressions are detectable before release.

#### Scenario: Validate Workspace inspection reading flow
- **WHEN** the workspace regression validation opens the Workspace inspection flow with deterministic fixture data
- **THEN** it verifies the flow distinguishes active filters, selected source detail, related records, and preview behavior through stable headings or state markers
- **THEN** it verifies the Workspace surface continues to prioritize conversation-oriented detail over lower-priority record browsing

#### Scenario: Validate Logs inspection reading flow
- **WHEN** the same regression validation opens the Logs inspection flow with deterministic fixture data
- **THEN** it verifies Logs exposes log-oriented headings, list states, and preview behavior distinct from conversation-first Workspace inspection
- **THEN** it verifies log browsing still supports deterministic source selection and preview assertions
