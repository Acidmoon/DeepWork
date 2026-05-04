## ADDED Requirements

### Requirement: Panel management avoids native browser dialogs
The workbench shell SHALL keep panel-management interactions inside the renderer UI so validation, cancellation, and destructive confirmation states remain testable and visually consistent.

#### Scenario: Add web action opens app-managed editor
- **WHEN** the user activates the sidebar add-web action
- **THEN** the workbench opens an app-managed editor or modal within the renderer
- **THEN** the flow does not call `window.prompt`

#### Scenario: Delete panel action opens app-managed confirmation
- **WHEN** the user requests deletion of a user-defined panel
- **THEN** the workbench opens an app-managed confirmation affordance
- **THEN** the flow does not call `window.confirm` for panel deletion

#### Scenario: Panel management errors are visible in context
- **WHEN** a custom panel management operation fails validation or persistence
- **THEN** the error is displayed near the relevant in-app controls
- **THEN** the user remains in the current workbench context without a native browser dialog interruption
