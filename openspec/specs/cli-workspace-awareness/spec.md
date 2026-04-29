# cli-workspace-awareness Specification

## Purpose
Define how managed CLI sessions stay workspace-aware by default, decide when prior context is needed from ordinary natural-language requests, and retrieve only the bounded scope that matches the user's intent.
## Requirements
### Requirement: Natural-language-triggered workspace retrieval
Managed CLI sessions SHALL treat ordinary natural-language user requests as the trigger for deciding whether prior workspace context is needed.

#### Scenario: Handle a self-contained request
- **WHEN** the user request can be answered from the current turn without prior workspace history
- **THEN** the managed CLI session answers without broad workspace scanning
- **THEN** the session does not preload unrelated artifacts or sessions as context

#### Scenario: Handle a context-dependent request
- **WHEN** the user request implies earlier browser, CLI, or workspace context
- **THEN** the managed CLI session consults workspace retrieval helpers before opening raw artifact content
- **THEN** the lookup begins from indexed scope metadata rather than global transcript injection

#### Scenario: Mention a prior session directly
- **WHEN** the user explicitly mentions a prior session, source, or context label in natural language
- **THEN** the managed CLI session treats that mention as a retrieval hint and consults the workspace index on demand
- **THEN** the user does not need to manually assemble or send a separate context handoff prompt

### Requirement: Scope-bounded CLI retrieval flow
Managed CLI sessions SHALL retrieve workspace context at scope or session granularity before reading individual artifacts.

#### Scenario: Rank candidate scopes before reading artifacts
- **WHEN** a managed CLI session performs workspace retrieval for a natural-language request
- **THEN** it receives ranked candidate scope IDs from indexed workspace metadata
- **THEN** the retrieval step does not read raw artifact content from multiple scopes

#### Scenario: Read artifacts only after scope selection
- **WHEN** a managed CLI session selects one candidate scope for inspection
- **THEN** it inspects that scope summary first
- **THEN** it opens only the specific artifacts needed from that selected scope

### Requirement: Inspectable retrieval outcomes
The system SHALL make managed CLI retrieval outcomes inspectable for each session when a workspace lookup occurs, and the recorded evidence SHALL remain stable enough to inspect through workspace-managed records instead of requiring transcript parsing or ad hoc file discovery.

#### Scenario: Record a retrieval with a selected scope
- **WHEN** a managed CLI session performs a lookup and selects a scope
- **THEN** the workspace records the original query, ranked candidate scopes, and selected scope identity for that session
- **THEN** the retrieval evidence can be inspected without parsing the full terminal transcript

#### Scenario: Record a retrieval with no selected scope
- **WHEN** a managed CLI session performs a lookup and no relevant scope is selected
- **THEN** the workspace records that no scope was chosen for the query
- **THEN** the recorded evidence includes a machine-readable reason or outcome for the no-match case

#### Scenario: Record a superseded pending lookup
- **WHEN** a managed CLI session starts a new lookup before the previous pending selection has been completed
- **THEN** the earlier lookup is finalized with an explicit machine-readable superseded outcome
- **THEN** the later lookup becomes the only active pending selection state for that session

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

### Requirement: Normalized retrieval audit metadata
Managed CLI retrieval audit records SHALL use a consistent summary and metadata shape so thread-aware inspection can compare retrieval outcomes across sessions without transcript parsing.

#### Scenario: Save a selected-scope retrieval outcome with normalized metadata
- **WHEN** a managed CLI lookup resolves and writes a retrieval audit record
- **THEN** the saved audit artifact includes normalized session, thread, outcome, and candidate-scope metadata together with a consistent inspection summary
- **THEN** later workspace inspection can compare retrieval outcomes across sessions using indexed metadata alone

#### Scenario: Save no-match or superseded outcomes consistently
- **WHEN** a managed CLI lookup ends with no selection or is superseded by a later lookup
- **THEN** the saved audit artifact uses the same normalized outcome and identity fields as successful lookups
- **THEN** thread-aware inspection can distinguish the outcome without special-case parsing logic

