## ADDED Requirements

### Requirement: Managed panels surface session-linked continuity context
The workbench SHALL surface session-linked continuity context for managed web and CLI panels so operators can distinguish the panel's current session identity from the workspace's currently selected thread.

#### Scenario: Show continuity context for a managed terminal panel
- **WHEN** a managed CLI session is running or has buffered state linked to a workspace scope
- **THEN** the renderer receives that session's scope identity, context label, and linked thread identity in the panel state snapshot
- **THEN** the active terminal surface displays that continuity context without requiring the operator to inspect logs or workspace manifests

#### Scenario: Show continuity context for a managed web panel
- **WHEN** a managed web panel is linked to a thread or saved capture scope
- **THEN** the renderer receives the linked thread identity and latest saved session-scope identity in the panel state snapshot
- **THEN** the active web surface displays whether later captures continue an existing thread or start from a fresh one

### Requirement: Managed panels can jump into workspace inspection
The workbench SHALL let operators open the workspace inspection surface for the session scope that backs the current managed panel.

#### Scenario: Open a managed panel session in Workspace
- **WHEN** the operator invokes the workspace jump action from a managed web or CLI panel that has a saved or linked session scope
- **THEN** the workbench activates the Workspace panel
- **THEN** the workspace surface focuses the corresponding scope so the operator can inspect related artifacts and thread membership
