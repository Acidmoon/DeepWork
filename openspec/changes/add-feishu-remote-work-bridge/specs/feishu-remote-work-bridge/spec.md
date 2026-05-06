## ADDED Requirements

### Requirement: Remote bridge enablement and authorization
The system SHALL keep Feishu remote work access disabled until explicit configuration provides Feishu credentials and an allowlist of permitted chats and users.

#### Scenario: Remote bridge disabled by default
- **WHEN** the application starts without remote bridge enablement
- **THEN** no Feishu message intake is started
- **THEN** no remote terminal input can be accepted

#### Scenario: Unauthorized chat is ignored
- **WHEN** the bridge receives a Feishu message from a chat that is not allowlisted
- **THEN** the system refuses to route the message to any work session
- **THEN** the refusal is recorded without exposing terminal output to that chat

#### Scenario: Unauthorized user is rejected
- **WHEN** the bridge receives a Feishu command or normal text from a non-allowlisted user
- **THEN** the system rejects the action
- **THEN** no PTY write, control command, or structured Codex request is issued

### Requirement: Feishu message command routing
The system SHALL route Feishu messages into explicit remote work commands or normal session input while preserving message deduplication and reply context.

#### Scenario: Status command
- **WHEN** an authorized user sends `/status`
- **THEN** the bridge responds with the selected work surface, running state, process identity when available, working directory, lock state, and last output timestamp

#### Scenario: Start command
- **WHEN** an authorized user sends `/start` for a remote-capable work surface that is not running
- **THEN** the bridge starts or attaches the corresponding DeepWork session
- **THEN** the bridge responds with the resulting session status

#### Scenario: Tail command
- **WHEN** an authorized user sends `/tail`
- **THEN** the bridge returns a bounded, cleaned tail of recent output from the selected work session

#### Scenario: Stop command
- **WHEN** an authorized user sends `/stop`
- **THEN** the bridge requests interruption of the selected work session through the active remote session adapter
- **THEN** the bridge confirms that the stop request was issued

#### Scenario: Normal text input
- **WHEN** an authorized user sends a non-command text message while the selected session accepts input
- **THEN** the bridge sends that text to the active remote session adapter as one user input action
- **THEN** the bridge acknowledges or streams follow-up output according to the configured delivery mode

### Requirement: Mobile-friendly output delivery
The system SHALL deliver remote work output to Feishu as bounded, readable messages rather than raw terminal streams.

#### Scenario: ANSI output cleaning
- **WHEN** PTY output contains ANSI control sequences or terminal redraw sequences
- **THEN** the bridge removes or normalizes those sequences before sending content to Feishu

#### Scenario: Output throttling
- **WHEN** the selected work session emits many output chunks in a short interval
- **THEN** the bridge coalesces chunks before sending Feishu updates
- **THEN** Feishu message rate limits are respected by using bounded buffers and update intervals

#### Scenario: Output truncation
- **WHEN** cleaned output exceeds the configured Feishu message budget
- **THEN** the bridge sends the most relevant tail or summary
- **THEN** the response indicates that output was truncated

### Requirement: Remote activity audit
The system SHALL record remote bridge actions that can affect local work sessions.

#### Scenario: Audit remote input
- **WHEN** an authorized Feishu message is routed as session input
- **THEN** the system records the actor, chat, panel or session target, timestamp, and input length

#### Scenario: Audit remote control command
- **WHEN** an authorized Feishu command starts, stops, locks, unlocks, or switches a remote work target
- **THEN** the system records the command, actor, chat, target, timestamp, and result

#### Scenario: Audit rejected action
- **WHEN** a Feishu message is rejected by authorization, lock, session state, or validation rules
- **THEN** the system records the rejection reason without writing to the target session
