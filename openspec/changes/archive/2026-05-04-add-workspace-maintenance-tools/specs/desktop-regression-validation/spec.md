## ADDED Requirements

### Requirement: Workspace maintenance validation
The repository SHALL provide focused validation coverage for workspace maintenance scan, rebuild, safe repair, and path-confinement behavior.

#### Scenario: Validate maintenance diagnostics
- **WHEN** maintenance validation runs with deterministic inconsistent workspace fixtures
- **THEN** it verifies missing files, orphaned manifest records, stale indexes, duplicate IDs, and unsafe paths are reported as structured findings
- **THEN** scan-only mode leaves fixture files unchanged

#### Scenario: Validate rebuild and safe repair
- **WHEN** validation runs rebuild and safe repair operations
- **THEN** it verifies derived indexes and manifests are regenerated from safe artifact metadata
- **THEN** it verifies raw artifact files and outside-workspace paths are not deleted or rewritten
