## ADDED Requirements

### Requirement: MiniMax built-in web preset availability
The MiniMax built-in web panel SHALL be available as a live managed web panel by default while continuing to use the existing safe navigation, persistent partition, and reserved-state contracts.

#### Scenario: Open MiniMax as a live built-in panel
- **WHEN** the user selects the MiniMax built-in web panel without a persisted override disabling it
- **THEN** the main process mounts a managed `WebContentsView` for MiniMax
- **THEN** the panel loads the configured HTTPS home URL with a persistent partition
- **THEN** the renderer receives normal loading, navigation, and availability state rather than a reserved placeholder snapshot

#### Scenario: Disable MiniMax through configuration
- **WHEN** the user saves a built-in MiniMax web-panel override with `enabled: false`
- **THEN** the renderer shows MiniMax as reserved rather than live
- **THEN** the main process does not keep a live `WebContentsView` mounted for that panel

#### Scenario: Preserve browser-like navigation
- **WHEN** the user browses from MiniMax to another safe HTTP or HTTPS URL
- **THEN** the panel updates transient current-address state through the managed web-panel lifecycle
- **THEN** the saved MiniMax home URL remains unchanged unless the user explicitly saves configuration
