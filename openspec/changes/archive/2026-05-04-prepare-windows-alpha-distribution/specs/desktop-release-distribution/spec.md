## ADDED Requirements

### Requirement: Windows alpha package command
The repository SHALL provide a documented command path that produces a Windows alpha desktop distribution artifact from the validated Electron build output.

#### Scenario: Build a Windows alpha artifact
- **WHEN** a developer runs the documented Windows alpha packaging command on a supported Windows development machine
- **THEN** the command builds the Electron main, preload, and renderer outputs
- **THEN** it produces a packaged DeepWork desktop artifact under a documented generated-output directory
- **THEN** generated package artifacts are not written into source-controlled application directories

#### Scenario: Report missing packaging prerequisites
- **WHEN** packaging cannot proceed because required native module, build-tool, or packaging prerequisites are missing
- **THEN** the command fails with actionable output
- **THEN** the documentation identifies the prerequisite or recovery command needed before retrying

### Requirement: Distribution artifact boundaries
The Windows alpha distribution SHALL package application code and runtime dependencies while excluding local workspace data, validation screenshots, Playwright artifacts, logs, and repository-only development files.

#### Scenario: Exclude local workspace data
- **WHEN** a Windows alpha package is generated
- **THEN** it does not include any user-selected workspace root or workspace-managed artifacts from the developer machine
- **THEN** first launch still requires explicit workspace selection or saved profile resolution from the user's app data

#### Scenario: Exclude validation and build noise
- **WHEN** a Windows alpha package is generated
- **THEN** validation screenshots, Playwright transient files, development logs, and source-only validation fixtures are excluded from the packaged runtime artifact unless explicitly required by the app

### Requirement: Packaged app smoke behavior
The packaged Windows alpha app SHALL launch into the DeepWork renderer shell and preserve the explicit workspace-selection behavior used by development builds.

#### Scenario: Launch packaged app without workspace
- **WHEN** the packaged app starts without a valid saved default workspace profile or active workspace root
- **THEN** it opens the renderer shell
- **THEN** it remains in the unselected workspace state without creating workspace files implicitly

#### Scenario: Launch packaged app with saved settings
- **WHEN** the packaged app starts with valid saved application settings
- **THEN** it loads language, theme, workspace profile, web panel, terminal panel, and continuity settings through the normal settings manager path
- **THEN** package mode does not bypass main-process settings normalization
