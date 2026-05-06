## ADDED Requirements

### Requirement: Codex app-server remote adapter
The system SHALL define a structured Codex remote session adapter that can drive a DeepWork-owned Codex app-server thread without parsing PTY terminal output.

#### Scenario: Start structured Codex thread
- **WHEN** the structured Codex adapter starts a new remote work session
- **THEN** it creates or connects to a DeepWork-owned Codex app-server runtime
- **THEN** it starts a Codex thread associated with the selected work surface and workspace context

#### Scenario: Resume structured Codex thread
- **WHEN** the selected work surface has an existing Codex app-server thread identity
- **THEN** the structured adapter resumes that thread instead of starting a new unrelated conversation
- **THEN** subsequent remote messages continue the same Codex working context

#### Scenario: Feature detection failure
- **WHEN** the installed Codex CLI does not support the required app-server protocol
- **THEN** the structured adapter reports the feature as unavailable
- **THEN** the system can continue using the PTY adapter if it is enabled

### Requirement: Structured turn control
The system SHALL map message-bot actions to Codex app-server turn APIs.

#### Scenario: Start a turn from normal text
- **WHEN** an authorized remote user sends normal text while the structured Codex thread is idle
- **THEN** the adapter sends a `turn/start` request with the text as user input
- **THEN** the adapter records the returned turn identity

#### Scenario: Steer active turn
- **WHEN** an authorized remote user sends normal text while the current Codex turn is steerable
- **THEN** the adapter sends a `turn/steer` request with the expected active turn identity
- **THEN** the adapter reports rejection if the active turn is not steerable

#### Scenario: Interrupt active turn
- **WHEN** an authorized remote user sends `/stop` while a structured Codex turn is active
- **THEN** the adapter sends a `turn/interrupt` request for the active thread and turn
- **THEN** the adapter reports the interruption request result to the bridge

### Requirement: Structured event delivery
The system SHALL translate Codex app-server events into mobile-friendly Feishu messages.

#### Scenario: Agent message completion
- **WHEN** Codex emits completed agent message items for the active turn
- **THEN** the bridge sends the final assistant text to the authorized Feishu conversation within configured size limits

#### Scenario: Tool progress event
- **WHEN** Codex emits command execution, file change, MCP tool, or reasoning progress items
- **THEN** the bridge sends concise progress updates according to the configured output mode

#### Scenario: Turn completion
- **WHEN** Codex emits turn completion or idle status for the active thread
- **THEN** the structured adapter marks the session idle
- **THEN** later normal text starts a new turn unless same-turn steering is explicitly available

### Requirement: Structured mode coexistence
The system SHALL allow structured Codex mode to coexist with the PTY MVP while keeping a single selected remote target per Feishu conversation.

#### Scenario: PTY mode selected
- **WHEN** the remote target is configured for PTY mode
- **THEN** Feishu normal text and commands are routed to the PTY adapter
- **THEN** no Codex app-server thread is created solely for that message

#### Scenario: Structured mode selected
- **WHEN** the remote target is configured for Codex app-server mode
- **THEN** Feishu normal text and commands are routed to the structured Codex adapter
- **THEN** PTY output is not used as the source of remote response truth

#### Scenario: Mode switch requires explicit command or configuration
- **WHEN** a Feishu conversation is bound to a remote target
- **THEN** the system does not silently switch between PTY mode and structured Codex mode
- **THEN** mode changes require explicit configuration or an authorized command
