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
The system SHALL make managed CLI retrieval outcomes inspectable for each session when a workspace lookup occurs.

#### Scenario: Record a retrieval with a selected scope
- **WHEN** a managed CLI session performs a lookup and selects a scope
- **THEN** the workspace records the original query, ranked candidate scopes, and selected scope identity for that session
- **THEN** the retrieval evidence can be inspected without parsing the full terminal transcript

#### Scenario: Record a retrieval with no selected scope
- **WHEN** a managed CLI session performs a lookup and no relevant scope is selected
- **THEN** the workspace records that no scope was chosen for the query
- **THEN** the recorded evidence includes a machine-readable reason or outcome for the no-match case
