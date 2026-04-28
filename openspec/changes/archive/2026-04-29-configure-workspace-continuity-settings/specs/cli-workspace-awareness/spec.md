## MODIFIED Requirements

### Requirement: Current-thread-biased retrieval
Managed CLI sessions SHALL honor the configured retrieval preference, using the active thread as the first bounded retrieval surface when the preference is thread-first and using workspace-wide ranking immediately when the preference is global-first.

#### Scenario: Retrieve within the current thread first
- **WHEN** a managed CLI session has an active thread, the user request depends on prior context, and the retrieval preference is thread-first
- **THEN** the retrieval flow ranks candidate scopes from that thread before considering unrelated threads
- **THEN** raw artifact reads remain limited to the selected thread and chosen scope until a fallback is required

#### Scenario: Fall back to global retrieval when thread-local context is insufficient
- **WHEN** the current thread does not contain a relevant scope for the user's request and the retrieval preference is thread-first
- **THEN** the retrieval flow can fall back to the broader workspace ranking path
- **THEN** the fallback still remains bounded and inspectable rather than broad transcript injection

#### Scenario: Use global retrieval immediately when configured
- **WHEN** the user request depends on prior context and the retrieval preference is global-first
- **THEN** the retrieval flow ranks candidates from the broader workspace without first filtering to the active thread
- **THEN** raw artifact reads still remain bounded to the selected scope rather than broad transcript injection

### Requirement: Inspectable thread-aware retrieval outcomes
The system SHALL preserve whether managed CLI retrieval stayed within the current thread, fell back from the current thread, or skipped thread bias because the retrieval preference was global-first so later inspection can explain how context was chosen.

#### Scenario: Record a thread-local retrieval outcome
- **WHEN** a managed CLI lookup resolves using a scope from the current thread
- **THEN** the retrieval audit record preserves the active thread identity and the selected scope outcome
- **THEN** later inspection can distinguish thread-local retrieval from a global lookup

#### Scenario: Record a global fallback outcome
- **WHEN** a managed CLI lookup leaves the current thread and falls back to global workspace ranking
- **THEN** the retrieval audit record preserves that fallback path together with the resulting outcome
- **THEN** the saved evidence remains machine-readable through normal workspace inspection flows

#### Scenario: Record a global-preferred retrieval outcome
- **WHEN** a managed CLI lookup uses workspace-wide ranking immediately because the retrieval preference is global-first
- **THEN** the retrieval audit record preserves that global-preferred path together with the resulting outcome
- **THEN** later inspection can distinguish global-preferred retrieval from thread-local or fallback retrieval
