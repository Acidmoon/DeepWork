## MODIFIED Requirements

### Requirement: Workspace inspection remains secondary
The workspace panel SHALL present artifact, scope, and thread browsing as an optional secondary inspection and debugging surface with routine inspection content prioritized above advanced maintenance or repair workflows.

#### Scenario: Continue work without opening Workspace
- **WHEN** a managed web or CLI surface already carries enough thread or scope context for the current task
- **THEN** the user can continue that line of work from the active conversation surface
- **THEN** no workspace artifact or scope selection is required before the model can use bounded retrieval

#### Scenario: Browse filtered artifact results only when deeper inspection is needed
- **WHEN** the workspace contains artifact records that match the active filter state
- **THEN** the artifact list updates to reflect the filtered workspace state
- **THEN** artifact review remains available from that filtered list without becoming the primary context-steering workflow

#### Scenario: Keep artifact browsing separate from CLI handoff
- **WHEN** the operator selects artifacts or sessions in the workspace panel
- **THEN** the panel treats those selections as local inspection state only
- **THEN** the panel does not expose prompt-draft generation or send-to-CLI actions as part of the browsing flow

#### Scenario: Keep maintenance and repair visually secondary
- **WHEN** the user opens the workspace panel for ordinary inspection
- **THEN** artifact, scope, thread, and preview browsing appear before low-frequency maintenance or repair controls
- **THEN** maintenance scans, rebuilds, safe repair, and scope-reassignment tooling remain available as clearly secondary operator workflows
