# desktop-core-domain Specification

## Purpose
TBD - created by archiving change extract-core-domain-from-desktop. Update Purpose after archive.

## Requirements
### Requirement: Runtime-independent desktop core entrypoints
The repository SHALL provide a desktop-domain package under `packages/core` that exports the serializable models and pure utilities shared by the desktop renderer and main-process modules without requiring Electron, React, or `node-pty` dependencies inside the extracted modules.

#### Scenario: Consume desktop core models from both runtimes
- **WHEN** renderer or main-process code needs shared panel, settings, terminal, web, or workspace domain models
- **THEN** it imports them from `@ai-workbench/core` entrypoints instead of app-local duplicate definitions
- **THEN** the extracted modules accept and return plain TypeScript data rather than runtime-owned objects such as `BrowserWindow`, `WebContentsView`, or PTY handles

### Requirement: Extracted ownership of pure desktop rules
The desktop core-domain package SHALL own the pure rules for panel catalogs, default view-state derivation, workspace scope/index normalization, and capture metadata normalization that do not require direct filesystem or Electron access.

#### Scenario: Derive renderer panel state from core rules
- **WHEN** the renderer builds panel definitions, default view states, or custom-panel domain state from saved settings
- **THEN** those derivations come from shared core-domain utilities
- **THEN** the renderer store remains responsible for state transitions, localization, and UI orchestration

#### Scenario: Derive workspace and capture metadata from core rules
- **WHEN** the main process normalizes origins, context labels, scope IDs, context-index entries, or web-capture labels
- **THEN** those derivations come from shared core-domain utilities
- **THEN** equivalent normalization rules are not reimplemented independently inside desktop managers

### Requirement: Desktop adapters remain in the application shell
The desktop application SHALL keep Electron, filesystem, clipboard, PTY, and browser-view side effects inside `apps/desktop` adapter modules that compose the extracted core domain rather than moving those runtime concerns into `packages/core`.

#### Scenario: Compose shell adapters around the core domain
- **WHEN** the desktop app persists artifacts, manages WebContents, launches terminals, or reads settings from disk
- **THEN** those operations continue to execute inside desktop-specific managers
- **THEN** the managers translate runtime state into core-domain inputs and outputs without exposing framework-specific objects through the core package
