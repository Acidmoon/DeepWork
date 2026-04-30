## MODIFIED Requirements

### Requirement: User-selected workspace initialization and structure
The system SHALL initialize a writable workspace root containing stable bucket directories, manifest files, rules files, and origin index files only after a workspace root is explicitly configured, selected, or restored from a saved default workspace profile.

#### Scenario: Start without a selected workspace
- **WHEN** the workspace manager is constructed without an explicit workspace root and no valid default workspace profile resolves to a root
- **THEN** it does not create a default workspace under the user's documents path
- **THEN** it exposes an uninitialized workspace snapshot with no active workspace root
- **THEN** artifact persistence, managed web capture, terminal transcript persistence, and retrieval-audit persistence do not write workspace records until a workspace root is selected

#### Scenario: Initialize a selected workspace
- **WHEN** a workspace root is configured at startup, selected by the user, or restored from a saved default workspace profile
- **THEN** the workspace manager creates bucket directories for inbox, artifacts, outputs, manifests, rules, and logs under that selected root
- **THEN** it writes baseline manifest and rules files if they do not already exist

#### Scenario: Switch workspace root
- **WHEN** a user selects a different workspace root directly or opens a saved workspace profile
- **THEN** the workspace manager reinitializes manifests and rules under the chosen root
- **THEN** it emits an updated workspace snapshot to the renderer
