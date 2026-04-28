## MODIFIED Requirements

### Requirement: Validation-backed workspace search and preview flow
The workspace search, artifact preview, and managed web-context resync flow SHALL be backed by a repeatable regression-validation path for their critical interactions.

#### Scenario: Revalidate workspace retrieval interactions after renderer changes
- **WHEN** the workspace renderer implementation changes in ways that could affect search, filtering, selection, or preview behavior
- **THEN** developers can rerun a repeatable validation flow covering those interactions
- **THEN** regressions in the critical workspace retrieval path can be detected without reconstructing manual validation steps from scratch

#### Scenario: Revalidate managed web-context persistence after sync-path changes
- **WHEN** main-process, preload, or renderer changes could affect managed web capture or manual workspace resync
- **THEN** developers can rerun a repeatable validation flow that exercises web-context persistence into the workspace
- **THEN** the validation confirms that manual workspace resync refreshes workspace-managed records instead of only updating local renderer status
