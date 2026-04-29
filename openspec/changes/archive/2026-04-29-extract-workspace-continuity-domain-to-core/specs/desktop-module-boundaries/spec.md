## ADDED Requirements

### Requirement: Workspace facade composes extracted core continuity modules
The desktop main process SHALL keep `WorkspaceManager` as the stable workspace orchestration facade while composing extracted `packages/core` modules for workspace continuity planning and managed workspace content definitions.

#### Scenario: Preserve workspace manager contracts during core extraction
- **WHEN** existing desktop callers invoke the current `WorkspaceManager` public methods
- **THEN** those method signatures remain available through the desktop facade
- **THEN** the extraction does not require callers to import continuity planners or workspace content templates directly

#### Scenario: Keep runtime side effects outside the core package
- **WHEN** the workspace facade applies continuity planning results or writes managed instruction files
- **THEN** filesystem reads, manifest writes, snapshot emission, and desktop runtime coordination remain inside `apps/desktop`
- **THEN** the composed `packages/core` modules remain limited to runtime-independent domain rules and template ownership
