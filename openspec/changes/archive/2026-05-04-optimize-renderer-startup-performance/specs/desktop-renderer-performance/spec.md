## ADDED Requirements

### Requirement: Bounded initial renderer load path
The desktop renderer SHALL keep the initial load path bounded so noncritical surfaces do not have to be fully loaded before the shell becomes usable.

#### Scenario: Load the shell without eagerly mounting every secondary surface
- **WHEN** the renderer shell starts
- **THEN** the initial load path includes only the code required to render the shell and activate the current surface safely
- **THEN** secondary surfaces or heavy modules that are not required for first interaction can be deferred

### Requirement: Stable deferred-surface activation
Renderer startup optimizations SHALL not break panel activation, settings hydration, or managed-surface behavior when deferred modules are loaded on demand.

#### Scenario: Open a deferred secondary surface
- **WHEN** the user navigates to a lazily loaded or otherwise deferred surface after startup
- **THEN** the surface loads without corrupting workbench state
- **THEN** managed Web, CLI, Workspace, and Settings behaviors remain consistent with the non-deferred contract
