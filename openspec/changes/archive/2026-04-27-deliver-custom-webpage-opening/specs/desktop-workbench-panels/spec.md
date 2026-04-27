## MODIFIED Requirements

### Requirement: Navigation and panel visibility model
The renderer SHALL organize the workbench into stable navigation sections and panel definitions, keep a pinned home panel available, hydrate persisted user-defined panels into navigation state, and manage active/open state without deleting panel definitions when a non-pinned panel is hidden.

#### Scenario: Open a registered panel
- **WHEN** a user selects a registered panel from the sidebar
- **THEN** that panel becomes the active panel
- **THEN** the panel is marked visible and opened in renderer state

#### Scenario: Restore a persisted user-defined panel
- **WHEN** the renderer hydrates settings that include custom web or CLI panel definitions
- **THEN** navigation state includes those user-defined panels in their configured sections
- **THEN** those panels remain selectable without requiring hardcoded panel registry entries

#### Scenario: Hide a non-pinned panel
- **WHEN** a user closes a non-pinned panel
- **THEN** the panel remains registered in navigation state
- **THEN** the panel is marked not visible
- **THEN** the renderer selects another visible panel, preferring `home` when needed

### Requirement: Managed web panel lifecycle
Enabled built-in and user-defined web panels SHALL run as main-process-managed `WebContentsView` instances with navigation state synchronization, safe URL restrictions, persisted configuration handoff, and explicit reserved behavior for disabled panels.

#### Scenario: Show an enabled web panel
- **WHEN** the renderer opens an enabled web panel
- **THEN** the main process loads the panel home URL if it has not loaded yet
- **THEN** it applies the renderer bounds to the `WebContentsView`
- **THEN** it publishes navigation and loading state back to the renderer

#### Scenario: Open a persisted custom web panel
- **WHEN** a user-defined web panel is restored from persisted settings and selected in navigation
- **THEN** the main process resolves the stored home URL and partition for that panel
- **THEN** it mounts a live `WebContentsView` without requiring a built-in provider slot

#### Scenario: Access a disabled web panel
- **WHEN** the renderer requests state for a disabled web panel
- **THEN** the system returns a reserved snapshot instead of creating a live browser instance
- **THEN** the snapshot reports the panel as disabled with a reserved-state error message

#### Scenario: Attempt unsafe navigation
- **WHEN** a panel tries to navigate to a non-HTTP or non-HTTPS target
- **THEN** the navigation is blocked
- **THEN** the panel snapshot records the blocked-navigation error
