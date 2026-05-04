## ADDED Requirements

### Requirement: Validate explicit settings-management commits
Focused renderer validation SHALL verify that updated settings and panel-management flows use explicit commit behavior for persisted edits where the UI no longer saves every intermediate draft change.

#### Scenario: Verify explicit profile rename commit
- **WHEN** the scripted validation edits a workspace profile name or comparable settings-management draft field
- **THEN** the persisted settings update occurs only after the explicit save or commit action
- **THEN** intermediate draft typing does not count as a completed persisted settings change
