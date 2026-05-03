## ADDED Requirements

### Requirement: Actionable Home onboarding surface
The Home panel SHALL present explicit next-step actions for first-run, active-workspace, and returning-workspace states without becoming a full profile-management surface.

#### Scenario: Guide a first-run user
- **WHEN** the Home panel loads without an active workspace root
- **THEN** it shows an explicit choose-workspace action
- **THEN** it explains that selecting a workspace is the next step before captures and retrieval can persist data

#### Scenario: Guide a returning user
- **WHEN** the Home panel loads with an active workspace root or saved workspace profiles
- **THEN** it shows the active workspace status and current thread summary when available
- **THEN** it can surface a bounded set of quick-open saved workspace shortcuts for fast re-entry
- **THEN** deeper profile administration remains outside the Home surface
