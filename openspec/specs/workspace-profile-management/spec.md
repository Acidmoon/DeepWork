# workspace-profile-management Specification

## Purpose
TBD - created by archiving change add-workspace-profiles. Update Purpose after archive.
## Requirements
### Requirement: Named workspace profiles
The system SHALL persist named workspace profiles as app-level settings records that identify reusable workspace roots without owning or deleting the underlying directories.

#### Scenario: Add current workspace as a profile
- **WHEN** the user saves the currently selected workspace as a profile
- **THEN** the settings snapshot stores a profile with a stable ID, display name, root path, creation timestamp, and last-used timestamp
- **THEN** the active workspace root remains selected

#### Scenario: Avoid duplicate root profiles
- **WHEN** the user adds a workspace root that already exists in the profile list after path normalization
- **THEN** the system updates the existing profile metadata instead of creating a duplicate profile for the same root

#### Scenario: Remove a profile record
- **WHEN** the user removes a workspace profile
- **THEN** the settings snapshot removes only that profile record
- **THEN** the system does not delete or rewrite files under the profile's workspace root

### Requirement: Workspace profile switching
The system SHALL let users switch the active workspace by opening a saved workspace profile and SHALL synchronize that root through existing workspace and terminal manager flows.

#### Scenario: Open a saved profile
- **WHEN** the user opens a saved workspace profile
- **THEN** the active workspace root changes to the profile root
- **THEN** the workspace manager initializes that root if needed and emits an updated workspace snapshot
- **THEN** managed terminal defaults synchronize to the newly active workspace root for future launches
- **THEN** the profile last-used timestamp is updated

#### Scenario: Switch to a missing profile root
- **WHEN** the user tries to open a profile whose root path is unavailable
- **THEN** the active workspace root remains unchanged
- **THEN** the renderer receives an explicit profile-open error state

### Requirement: Default startup workspace profile
The system SHALL allow one saved workspace profile to be marked as the startup default and SHALL restore that profile's root when the application starts.

#### Scenario: Mark profile as startup default
- **WHEN** the user marks a saved profile as the startup default
- **THEN** the settings snapshot stores that profile ID as `defaultWorkspaceProfileId`
- **THEN** later application startup resolves the active workspace root from that profile if the profile still exists

#### Scenario: Start without a default profile
- **WHEN** the application starts with no valid default workspace profile and no persisted active workspace root
- **THEN** the workspace remains unselected
- **THEN** no workspace directories or managed workspace files are created implicitly

#### Scenario: Remove the default profile
- **WHEN** the user removes the profile currently marked as the startup default
- **THEN** the settings snapshot clears `defaultWorkspaceProfileId`
- **THEN** later startup does not attempt to restore that removed profile

### Requirement: Profile management remains secondary settings behavior
Workspace profile management SHALL live in Settings as an app-level preference workflow while Home remains the lightweight current-workspace status and quick-selection surface.

#### Scenario: Manage profiles from Settings
- **WHEN** the user opens Settings
- **THEN** saved workspace profiles are shown as implemented controls rather than deferred placeholders
- **THEN** the user can rename, open, mark default, and remove profile records from that surface

#### Scenario: Use Home for current workspace selection
- **WHEN** the user opens Home
- **THEN** the current workspace status and choose-workspace action remain available
- **THEN** profile list management does not replace Home's quick current-workspace flow

