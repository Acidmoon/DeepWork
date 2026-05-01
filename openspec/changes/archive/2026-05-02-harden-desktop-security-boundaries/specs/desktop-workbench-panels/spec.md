## ADDED Requirements

### Requirement: Main-process web panel URL enforcement
Managed web panels SHALL only mount or load initial and home URLs after the main process has validated and normalized those URLs to supported HTTP or HTTPS targets.

#### Scenario: Block unsafe stored home URL
- **WHEN** a built-in or custom web-panel configuration contains an unsupported stored home URL
- **THEN** the main process does not load that target into a `WebContentsView`
- **THEN** the panel snapshot reports a disabled, reserved, or error state instead of mounting an unsafe page

#### Scenario: Normalize stored home URL before first load
- **WHEN** an enabled web panel is first shown with a safe but non-canonical home URL
- **THEN** the main process resolves it to a canonical HTTP or HTTPS URL before calling the web contents load operation
- **THEN** the renderer receives the normalized home and current URL in panel state

#### Scenario: Continue to block unsafe runtime navigation
- **WHEN** a managed web panel attempts to navigate to a non-HTTP or non-HTTPS target
- **THEN** the main process blocks the navigation
- **THEN** the panel snapshot records a blocked-navigation error without changing to the unsafe target

#### Scenario: Keep valid web browsing behavior
- **WHEN** a user navigates an enabled web panel to a valid HTTP or HTTPS target
- **THEN** the main process loads the target and publishes normal navigation, loading, and history state
- **THEN** transient browsing still does not overwrite saved home URL configuration unless the user saves configuration
