## MODIFIED Requirements

### Requirement: Settings surface for implemented and deferred preferences
The settings panel SHALL expose the preferences that are currently implemented, including workspace profiles and terminal behavior, and SHALL render deferred preference placeholders only when one or more product-defined deferred preference entries exist.

#### Scenario: Edit implemented settings
- **WHEN** the user changes language, theme, terminal prelude commands, terminal behavior settings, default thread continuation, managed CLI retrieval preference, or workspace profile settings in the settings panel
- **THEN** the updated values are persisted through the settings IPC flow
- **THEN** language and theme changes take effect in the renderer without requiring a code change
- **THEN** later managed captures and managed CLI retrievals use the updated continuity settings without requiring manual file edits
- **THEN** terminal panels use the updated terminal behavior settings for renderer-side interaction behavior without requiring a PTY restart
- **THEN** workspace profile changes are reflected in the active workspace and startup-default behavior when applicable

#### Scenario: View settings with no deferred preferences
- **WHEN** the user opens the settings panel and no deferred preference entries are defined
- **THEN** terminal behavior settings are presented as implemented controls rather than a future-facing placeholder
- **THEN** workspace profiles are presented as implemented settings rather than a future-facing placeholder
- **THEN** the settings panel does not render an empty upcoming-preferences or placeholder-only section

#### Scenario: View settings with explicit deferred preferences
- **WHEN** a future product change defines one or more deferred preference entries
- **THEN** those entries are presented as future-facing placeholders rather than active runtime configuration
- **THEN** implemented settings remain visually and semantically separate from deferred placeholders
