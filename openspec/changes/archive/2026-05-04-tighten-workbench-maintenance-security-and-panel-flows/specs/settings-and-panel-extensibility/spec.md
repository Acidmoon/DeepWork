## ADDED Requirements

### Requirement: Custom panel management uses in-app explicit flows
The renderer SHALL create, configure, rename, and delete user-defined web and CLI panels through in-app controls rather than native browser prompt or confirm dialogs.

#### Scenario: Create custom web panel through in-app form
- **WHEN** the user chooses to add a custom web panel
- **THEN** the renderer shows an in-app form for title and HTTP or HTTPS home URL
- **THEN** saving a valid form persists the custom web-panel definition and opens the new panel
- **THEN** canceling the form leaves settings unchanged

#### Scenario: Reject invalid custom web panel form
- **WHEN** the user submits a custom web panel form with an empty title or unsupported URL
- **THEN** the renderer shows an in-app validation error
- **THEN** the settings snapshot remains unchanged

#### Scenario: Create custom CLI panel through in-app flow
- **WHEN** the user chooses to add a custom CLI panel
- **THEN** the renderer creates the panel through an in-app flow that makes the initial configuration explicit
- **THEN** saving persists a custom terminal-panel definition through the settings IPC path
- **THEN** canceling leaves settings unchanged

#### Scenario: Delete custom panel through in-app confirmation
- **WHEN** the user requests deletion of a user-defined web or CLI panel
- **THEN** the renderer shows an in-app destructive confirmation state naming the target panel
- **THEN** confirming removes the custom panel from persisted settings and navigation state
- **THEN** canceling keeps the panel definition and runtime state intact
