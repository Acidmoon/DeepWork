## ADDED Requirements

### Requirement: Main-process settings boundary normalization
The settings manager SHALL normalize persisted and IPC-provided panel settings at the main-process boundary before dependent managers or renderer state consume them.

#### Scenario: Normalize custom web panels on startup
- **WHEN** the application starts with persisted custom web-panel settings
- **THEN** the settings manager keeps only entries with valid required string fields, a normalized HTTP or HTTPS home URL, a valid enabled flag, and a non-empty partition
- **THEN** malformed custom web-panel entries do not crash startup or downstream panel synchronization

#### Scenario: Reject unsafe custom web target through settings update
- **WHEN** the renderer or another IPC caller submits a custom web-panel settings update with a non-HTTP or non-HTTPS home URL
- **THEN** the settings manager does not persist that unsafe home URL as an enabled web-panel target
- **THEN** the web panel manager does not receive a live panel definition for that unsafe target

#### Scenario: Avoid panel identity collisions
- **WHEN** persisted or IPC-provided custom panel settings include duplicate IDs or IDs that collide with built-in panel IDs
- **THEN** the settings manager keeps a deterministic safe set of custom panel definitions
- **THEN** built-in panel definitions remain under application control

#### Scenario: Preserve valid custom web panels
- **WHEN** custom web-panel settings contain valid user-defined panel definitions
- **THEN** the settings snapshot preserves those definitions with normalized home URLs and partitions
- **THEN** renderer navigation and main-process web panel synchronization continue to restore the panels
