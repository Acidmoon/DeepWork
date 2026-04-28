## MODIFIED Requirements

### Requirement: Managed web panel lifecycle
Enabled built-in and user-defined web panels SHALL run as main-process-managed `WebContentsView` instances with navigation state synchronization, safe URL restrictions, persisted configuration handoff, browser-like current-address loading for safe targets, and explicit reserved behavior for disabled panels.

#### Scenario: Show an enabled web panel
- **WHEN** the renderer opens an enabled web panel
- **THEN** the main process loads the panel home URL if it has not loaded yet
- **THEN** it applies the renderer bounds to the `WebContentsView`
- **THEN** it publishes navigation and loading state back to the renderer

#### Scenario: Open a persisted custom web panel
- **WHEN** a user-defined web panel is restored from persisted settings and selected in navigation
- **THEN** the main process resolves the stored home URL and partition for that panel
- **THEN** it mounts a live `WebContentsView` without requiring a built-in provider slot
- **THEN** the initial current address matches the stored home URL until the user browses elsewhere

#### Scenario: Load a safe arbitrary address in a custom web panel
- **WHEN** the user enters an HTTP or HTTPS target for a custom web panel and requests navigation
- **THEN** the main process loads that target without recreating the panel definition
- **THEN** the panel snapshot updates `currentUrl`, loading state, and back-forward navigation state to reflect the new page

#### Scenario: Access a disabled web panel
- **WHEN** the renderer requests state for a disabled web panel
- **THEN** the system returns a reserved snapshot instead of creating a live browser instance
- **THEN** the snapshot reports the panel as disabled with a reserved-state error message

#### Scenario: Attempt unsafe navigation
- **WHEN** a panel tries to navigate to a non-HTTP or non-HTTPS target
- **THEN** the navigation is blocked
- **THEN** the panel snapshot records the blocked-navigation error
