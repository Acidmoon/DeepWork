## ADDED Requirements

### Requirement: MiniMax built-in web-panel defaults and overrides
The system SHALL provide a valid default built-in web-panel configuration for MiniMax and SHALL let persisted built-in web-panel overrides customize or disable that default through the existing settings flow.

#### Scenario: Load MiniMax default settings
- **WHEN** application settings do not contain a MiniMax built-in web-panel override
- **THEN** the resolved MiniMax panel configuration is enabled
- **THEN** the resolved configuration includes a safe HTTPS home URL and non-empty persistent partition

#### Scenario: Preserve a persisted MiniMax override
- **WHEN** settings contain a persisted MiniMax built-in web-panel override
- **THEN** the settings manager preserves the supported home URL, partition, and enabled fields after normalization
- **THEN** renderer navigation and the web panel manager consume the normalized override instead of the catalog default

#### Scenario: Reject unsafe MiniMax override URL
- **WHEN** a persisted or IPC-provided MiniMax override contains a non-HTTP or non-HTTPS home URL
- **THEN** the settings normalization flow does not expose that unsafe URL as a live panel target
- **THEN** valid MiniMax configuration fields remain recoverable through later safe updates
