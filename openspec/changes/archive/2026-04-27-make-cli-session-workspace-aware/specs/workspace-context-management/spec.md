## ADDED Requirements

### Requirement: Scope-ranked retrieval metadata
The system SHALL persist scope-level retrieval metadata in `context-index.json` using indexed artifact fields so workspace lookups can rank candidate sessions without reading raw artifact content.

#### Scenario: Rebuild scope retrieval metadata
- **WHEN** artifact records are added, updated, or removed
- **THEN** the workspace manager rebuilds each scope entry with normalized scope identity, latest-update metadata, and aggregated searchable metadata
- **THEN** the resulting scope entries can be ranked without opening raw artifact files

#### Scenario: Keep retrieval metadata scoped
- **WHEN** artifacts belong to different origins or context labels
- **THEN** the workspace manager keeps retrieval metadata grouped by scope ID
- **THEN** unrelated sessions are not merged into one retrieval candidate

## MODIFIED Requirements

### Requirement: Retrieval-safe workspace rules
The system SHALL write retrieval protocol files and helper PowerShell commands into the workspace so CLI agents can decide whether retrieval is needed, rank candidate scopes, and open only the specific artifacts required for the current request.

#### Scenario: Inspect workspace helper rules
- **WHEN** the workspace is initialized
- **THEN** it contains managed rule files that distinguish self-contained requests from context-dependent requests
- **THEN** it contains a PowerShell helper script defining `aw-workspace`, `aw-origins`, `aw-origin`, `aw-artifact`, `aw-cat-artifact`, and `aw-suggest`
- **THEN** `aw-suggest` returns scope-first retrieval candidates from indexed metadata before any raw artifact file is read

#### Scenario: Request structured scope suggestions
- **WHEN** a CLI agent requests structured retrieval suggestions for a query
- **THEN** the workspace helper returns ranked scope data in a machine-readable format
- **THEN** the structured result excludes raw artifact content from unrelated scopes

#### Scenario: Rebuild managed rule content
- **WHEN** the workspace manager reinitializes an existing workspace
- **THEN** it rewrites the managed protocol and helper-command files with the latest scope-first retrieval behavior
- **THEN** it preserves the marker-managed instruction blocks inside `AGENTS.md` and `CLAUDE.md`
