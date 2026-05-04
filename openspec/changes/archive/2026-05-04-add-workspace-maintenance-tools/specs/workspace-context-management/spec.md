## ADDED Requirements

### Requirement: Workspace maintenance operations
The workspace manager SHALL provide explicit maintenance operations that scan workspace health, rebuild derived indexes, and apply safe non-destructive repairs without requiring manual JSON edits.

#### Scenario: Scan workspace health
- **WHEN** the user or helper command runs a workspace maintenance scan
- **THEN** the workspace manager reports structured findings for missing artifact files, orphaned manifest records, stale derived indexes, duplicate IDs, unsafe paths, and uninitialized workspace state
- **THEN** the scan does not modify workspace files

#### Scenario: Rebuild derived indexes
- **WHEN** the user or helper command runs a derived-index rebuild
- **THEN** the workspace manager rebuilds context indexes, origin manifests, thread indexes, and per-thread manifests from current safe artifact metadata
- **THEN** raw artifact files are not rewritten as part of the rebuild

#### Scenario: Apply safe repair
- **WHEN** the user explicitly applies safe maintenance repair
- **THEN** the workspace manager corrects derived manifest or index inconsistencies that can be repaired without deleting raw artifact files
- **THEN** any finding that would require destructive deletion remains reported for explicit follow-up instead of being performed automatically

#### Scenario: Respect workspace path confinement
- **WHEN** maintenance operations encounter artifact records with paths outside the active workspace root
- **THEN** they report the unsafe records and exclude outside paths from reads, writes, and deletion attempts
- **THEN** valid in-workspace records remain eligible for scan, rebuild, and safe repair

### Requirement: Workspace maintenance helper support
The managed workspace helper surface SHALL expose structured maintenance diagnostics for explicit inspection and debugging.

#### Scenario: Run maintenance scan from helper command
- **WHEN** a workspace-aware CLI session invokes the maintenance scan helper
- **THEN** the helper returns structured diagnostics derived from workspace-managed indexes
- **THEN** it does not recursively read raw artifact content from unrelated scopes

#### Scenario: Run rebuild from helper command
- **WHEN** a developer invokes the maintenance rebuild helper
- **THEN** the helper executes the same bounded derived-index rebuild operation as the desktop Workspace surface
- **THEN** the result identifies which derived files were rewritten or left unchanged
