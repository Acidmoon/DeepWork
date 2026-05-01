## ADDED Requirements

### Requirement: Workspace artifact path confinement
The workspace manager SHALL treat persisted artifact paths as untrusted workspace-relative references and SHALL prevent artifact read, write, overwrite, and delete operations from resolving outside the active workspace root.

#### Scenario: Read ignores an artifact path outside the workspace
- **WHEN** the artifact manifest contains an artifact whose persisted path or absolute path resolves outside the active workspace root
- **THEN** the workspace read-artifact operation does not read that outside file
- **THEN** the operation returns an unavailable artifact result or omits the unsafe record from readable artifact content

#### Scenario: Delete scope does not remove files outside the workspace
- **WHEN** a scope contains an artifact record whose stored path points outside the active workspace root
- **THEN** deleting that scope does not delete the outside file
- **THEN** the workspace manifest and indexes are still rewritten without trusting the unsafe file path

#### Scenario: Upsert existing artifact repairs unsafe absolute path
- **WHEN** a managed capture upserts an existing artifact whose persisted absolute path disagrees with the safe workspace-relative path
- **THEN** the workspace writes the updated content only to a path resolved under the active workspace root
- **THEN** the persisted artifact metadata is repaired to expose the safe resolved absolute path

#### Scenario: Safe artifacts continue to work
- **WHEN** the artifact manifest contains a valid artifact path under the active workspace root
- **THEN** reads, upserts, deletes, and index rebuilds continue to operate on that workspace-managed file
- **THEN** existing valid workspace records remain backward-compatible
