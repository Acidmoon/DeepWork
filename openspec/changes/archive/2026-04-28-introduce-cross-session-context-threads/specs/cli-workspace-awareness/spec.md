## ADDED Requirements

### Requirement: Current-thread-biased retrieval
Managed CLI sessions SHALL prefer the active thread as the first bounded retrieval surface before falling back to global workspace ranking when a request appears context-dependent.

#### Scenario: Retrieve within the current thread first
- **WHEN** a managed CLI session has an active thread and the user request depends on prior context
- **THEN** the retrieval flow ranks candidate scopes from that thread before considering unrelated threads
- **THEN** raw artifact reads remain limited to the selected thread and chosen scope until a fallback is required

#### Scenario: Fall back to global retrieval when thread-local context is insufficient
- **WHEN** the current thread does not contain a relevant scope for the user's request
- **THEN** the retrieval flow can fall back to the broader workspace ranking path
- **THEN** the fallback still remains bounded and inspectable rather than broad transcript injection

### Requirement: Inspectable thread-aware retrieval outcomes
The system SHALL preserve whether managed CLI retrieval stayed within the current thread or fell back to global ranking so later inspection can explain how context was chosen.

#### Scenario: Record a thread-local retrieval outcome
- **WHEN** a managed CLI lookup resolves using a scope from the current thread
- **THEN** the retrieval audit record preserves the active thread identity and the selected scope outcome
- **THEN** later inspection can distinguish thread-local retrieval from a global lookup

#### Scenario: Record a global fallback outcome
- **WHEN** a managed CLI lookup leaves the current thread and falls back to global workspace ranking
- **THEN** the retrieval audit record preserves that fallback path together with the resulting outcome
- **THEN** the saved evidence remains machine-readable through normal workspace inspection flows
