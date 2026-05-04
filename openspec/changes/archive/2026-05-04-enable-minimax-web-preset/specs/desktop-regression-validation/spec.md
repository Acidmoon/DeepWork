## ADDED Requirements

### Requirement: MiniMax built-in web preset validation
The repository SHALL provide focused validation coverage proving that the MiniMax built-in web preset uses the managed web-panel lifecycle when enabled and returns to reserved behavior when disabled.

#### Scenario: Validate enabled MiniMax lifecycle
- **WHEN** the MiniMax web-panel validation flow runs with default settings
- **THEN** it verifies MiniMax is selectable from navigation as an enabled managed web panel
- **THEN** it verifies managed navigation state is published without relying on a live third-party login

#### Scenario: Validate disabled MiniMax override
- **WHEN** the validation flow applies a MiniMax built-in override with `enabled: false`
- **THEN** it verifies the panel reports reserved state
- **THEN** it verifies re-enabling or clearing the override restores the managed lifecycle
