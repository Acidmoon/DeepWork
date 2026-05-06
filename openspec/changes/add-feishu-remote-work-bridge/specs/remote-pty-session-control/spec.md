## ADDED Requirements

### Requirement: Remote PTY adapter uses the existing managed session
The system SHALL let a remote client control a DeepWork-managed PTY session through the existing terminal lifecycle instead of spawning a duplicate CLI process.

#### Scenario: Attach remote client to running Codex PTY
- **WHEN** the `codex-cli` terminal panel already has a running PTY session
- **THEN** the remote PTY adapter attaches to that existing session
- **THEN** remote writes and local terminal writes target the same PTY process

#### Scenario: Start remote-capable Codex PTY
- **WHEN** the remote bridge starts `codex-cli` and no PTY session is running
- **THEN** the system starts the panel through the managed terminal lifecycle
- **THEN** the session uses the same configured shell, working directory, prelude commands, and startup command as the desktop panel

#### Scenario: No duplicate Codex process
- **WHEN** a remote user sends normal input to a running `codex-cli` session
- **THEN** the system writes to the existing PTY
- **THEN** the system does not invoke `codex`, `codex exec`, or `codex app-server` as a separate remote-only process

### Requirement: Remote PTY write coordination
The system SHALL coordinate remote writes with local terminal activity to reduce prompt corruption and mixed input.

#### Scenario: Remote lock acquired
- **WHEN** an authorized remote user sends `/lock`
- **THEN** the selected PTY session records that remote actor as the lock owner
- **THEN** subsequent normal remote input from other actors is rejected until the lock is released or expires

#### Scenario: Remote lock released
- **WHEN** the lock owner or an authorized administrator sends `/unlock`
- **THEN** the selected PTY session clears the remote lock
- **THEN** subsequent authorized input can be accepted according to normal activity rules

#### Scenario: Local activity blocks remote normal text
- **WHEN** recent local terminal input indicates the desktop user is actively typing
- **THEN** the bridge rejects remote normal text unless the remote actor holds an active lock that policy allows
- **THEN** the rejection explains that the local session is active

### Requirement: Remote PTY control actions
The system SHALL expose bounded control actions for remote PTY sessions without exposing arbitrary terminal management.

#### Scenario: Remote interrupt
- **WHEN** an authorized remote user sends `/stop`
- **THEN** the PTY adapter writes the configured interrupt sequence to the target PTY
- **THEN** the adapter does not terminate or restart the PTY unless a separate authorized command requests it

#### Scenario: Remote status
- **WHEN** the bridge requests PTY session status
- **THEN** the adapter returns the panel id, title, running state, process id when present, cwd, buffer size, launch count, lock state, and last output timestamp

#### Scenario: Remote tail
- **WHEN** the bridge requests recent PTY output
- **THEN** the adapter returns output from the managed session buffer or log within the configured size limit
- **THEN** the returned output is suitable for downstream cleaning and Feishu delivery

### Requirement: Remote PTY output subscription
The system SHALL allow the remote bridge to subscribe to PTY output events for selected remote-capable panels.

#### Scenario: Subscribe to selected panel output
- **WHEN** the bridge subscribes to `codex-cli` output
- **THEN** the adapter receives the same PTY data that is published to the local renderer
- **THEN** the local renderer continues receiving output normally

#### Scenario: Ignore non-selected panel output
- **WHEN** another terminal panel emits output
- **THEN** the bridge does not send that output to Feishu unless the remote target has been explicitly switched to that panel

#### Scenario: Output subscription survives renderer panel switches
- **WHEN** the desktop user switches away from the terminal panel
- **THEN** the remote bridge remains subscribed to the managed PTY output
- **THEN** remote tail and output updates still reflect the running session
