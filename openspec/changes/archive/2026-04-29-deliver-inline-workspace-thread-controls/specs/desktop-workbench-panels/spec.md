## ADDED Requirements

### Requirement: Inline workspace thread controls
The workspace surface SHALL provide inline controls for thread creation, thread activation, thread title editing, and scope reassignment without relying on browser prompt or confirm dialogs.

#### Scenario: Create or activate a thread from inline controls
- **WHEN** the operator uses the workspace continuity controls to create a new thread or continue an existing one
- **THEN** the workbench updates the active thread through the existing workspace mutation flow
- **THEN** the resulting thread state is visible in the same workspace surface without reopening a modal dialog

#### Scenario: Reassign a scope from inline controls
- **WHEN** the operator selects a saved scope and applies a different target thread from the workspace surface
- **THEN** the workbench persists the reassignment through the workspace mutation flow
- **THEN** the workspace surface reflects the updated thread membership in place
