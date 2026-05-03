## ADDED Requirements

### Requirement: Beta desktop package command
The repository SHALL provide a documented command path that produces a broader beta desktop distribution artifact from the validated Electron build output.

#### Scenario: Build a beta desktop artifact
- **WHEN** a developer runs the documented beta packaging command on a supported Windows development machine
- **THEN** the command builds the Electron main, preload, and renderer outputs
- **THEN** it produces a beta DeepWork desktop artifact under a documented generated-output directory
- **THEN** generated package artifacts are not written into source-controlled application directories

### Requirement: Beta distribution artifact boundaries
The beta desktop distribution SHALL package application code and runtime dependencies while excluding local workspace data, validation artifacts, logs, and repository-only development files.

#### Scenario: Exclude local runtime and validation data
- **WHEN** a beta desktop package is generated
- **THEN** it does not include developer-machine workspace data, transient validation outputs, or repo-only fixtures unless explicitly required at runtime
- **THEN** first launch still requires explicit workspace selection or valid saved-profile resolution

### Requirement: Packaged beta app startup behavior
The packaged beta app SHALL preserve the explicit workspace-selection and main-process settings-normalization behavior used by development and alpha builds.

#### Scenario: Launch beta app without workspace
- **WHEN** the packaged beta app starts without a valid saved default workspace profile or active workspace root
- **THEN** it opens the renderer shell
- **THEN** it remains in the unselected workspace state without creating workspace files implicitly

#### Scenario: Launch beta app with saved settings
- **WHEN** the packaged beta app starts with valid saved application settings
- **THEN** it loads language, theme, workspace profile, web panel, terminal panel, and continuity settings through the normal settings manager path
- **THEN** packaged beta mode does not bypass main-process settings normalization
