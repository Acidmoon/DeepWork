## ADDED Requirements

### Requirement: Workspace maintenance inspector controls
The Workspace surface SHALL expose maintenance tools as explicit secondary repair controls for scan, rebuild, and safe repair operations.

#### Scenario: Run a maintenance scan from Workspace
- **WHEN** the user opens the Workspace maintenance section and runs a scan
- **THEN** the workbench displays structured findings without changing workspace files
- **THEN** the maintenance section remains subordinate to thread, scope, artifact, and preview inspection

#### Scenario: Run a safe repair from Workspace
- **WHEN** the user explicitly applies safe repair after reviewing findings
- **THEN** the workbench invokes the workspace maintenance repair operation
- **THEN** the resulting report identifies repaired findings and any destructive follow-up left unresolved

#### Scenario: Handle uninitialized workspace
- **WHEN** the user opens maintenance controls before selecting a workspace root
- **THEN** the workbench shows an explicit unavailable state
- **THEN** no workspace directories or manifest files are created implicitly
