## ADDED Requirements

### Requirement: Log-bucket workspace inspection
The workspace panel SHALL expose artifacts stored under the `logs/` bucket through the same secondary inspection, search, and preview model used for other workspace-managed artifacts.

#### Scenario: Open log-bucket inspection
- **WHEN** the user opens the Logs workspace surface
- **THEN** the artifact list is filtered to log-bucket records by default
- **THEN** each listed log record exposes indexed metadata such as origin, context label, thread identity, summary, type, and latest update time

#### Scenario: Search within logs
- **WHEN** the user enters a query while inspecting Logs
- **THEN** the renderer filters log results using indexed metadata without recursively reading raw log files
- **THEN** active origin and thread filters continue to compose with the log-bucket constraint

#### Scenario: Preview a log artifact
- **WHEN** the user selects a text-compatible terminal transcript or retrieval-audit log artifact
- **THEN** the renderer loads that artifact through the workspace read-artifact operation
- **THEN** the preview surface displays the returned content together with the artifact metadata

#### Scenario: Avoid turning logs into CLI handoff
- **WHEN** the user selects one or more log records
- **THEN** the Logs surface treats selection as local inspection state
- **THEN** it does not expose prompt-draft generation or send-to-CLI actions as part of log browsing
