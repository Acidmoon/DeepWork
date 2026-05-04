## MODIFIED Requirements

### Requirement: Profile management remains secondary settings behavior
Workspace profile management SHALL live in Settings as the administrative workflow while Home remains a lightweight current-workspace and quick-reentry surface.

#### Scenario: Manage profiles from Settings
- **WHEN** the user opens Settings
- **THEN** saved workspace profiles are shown as implemented controls rather than deferred placeholders
- **THEN** the user can rename, open, mark default, and remove profile records from that surface

#### Scenario: Use Home for current workspace selection
- **WHEN** the user opens Home
- **THEN** the current workspace status and choose-workspace action remain available
- **THEN** Home MAY show a bounded set of quick-open saved profiles or recent workspace shortcuts
- **THEN** profile list management, rename, default selection, and removal remain in Settings rather than replacing Home's quick current-workspace flow
