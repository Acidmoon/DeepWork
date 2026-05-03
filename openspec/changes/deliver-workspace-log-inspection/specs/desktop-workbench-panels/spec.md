## ADDED Requirements

### Requirement: Logs panel inspection surface
The Logs panel SHALL present a scannable workspace inspection surface for log-bucket artifacts instead of a placeholder-style bucket summary.

#### Scenario: Inspect Logs from navigation
- **WHEN** the user selects the Logs panel from Workspace navigation
- **THEN** the workbench opens a Workspace-style inspector focused on `logs/`
- **THEN** log list, filter, preview, and empty-state regions use the same compact hierarchy as the Artifacts workspace surface

#### Scenario: Keep logs secondary
- **WHEN** log records are visible in the Logs panel
- **THEN** the panel copy and controls frame them as audit and debugging material
- **THEN** Web and CLI panels remain the primary surfaces for continuing conversation work
