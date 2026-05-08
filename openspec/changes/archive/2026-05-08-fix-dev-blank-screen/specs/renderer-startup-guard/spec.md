## ADDED Requirements

### Requirement: Renderer startup error is visible

The renderer process SHALL display a visible error message when React fails to mount, instead of showing a blank white screen.

#### Scenario: React mount failure
- **WHEN** React's `createRoot().render()` throws an unhandled exception during initial mount
- **THEN** the page SHALL display a text error message describing the failure, visible on a dark background

#### Scenario: Preload API unavailable
- **WHEN** `window.workbenchShell` is not available at renderer startup (preload script failed to load)
- **THEN** the page SHALL display "Workbench shell unavailable. Restart the application." before attempting React mount

### Requirement: Renderer startup guard does not affect valid startup

The renderer startup guard SHALL NOT interfere with normal successful startup.

#### Scenario: Normal startup
- **WHEN** all dependencies are available and React mounts successfully
- **THEN** the application SHALL render the normal App shell without any guard messages visible
