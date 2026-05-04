## ADDED Requirements

### Requirement: IPC payloads are validated before privileged desktop operations
The main process SHALL validate renderer-originated IPC payload shapes before invoking manager operations that can mutate settings, workspace files, terminal sessions, web-panel navigation, or clipboard-backed artifacts.

#### Scenario: Malformed terminal write is rejected
- **WHEN** an IPC caller sends a terminal write request with a non-string panel ID or non-string data payload
- **THEN** the main process rejects the request before calling the terminal manager
- **THEN** no PTY input is written for that malformed request

#### Scenario: Malformed web panel navigation is rejected
- **WHEN** an IPC caller sends a web-panel navigation request with an unknown action, malformed panel ID, or invalid URL payload
- **THEN** the main process rejects or normalizes the request before calling the web panel manager
- **THEN** unsafe navigation targets do not reach a live `WebContentsView`

#### Scenario: Malformed workspace mutation is rejected
- **WHEN** an IPC caller sends a workspace mutation request with missing, non-string, or oversized identifiers
- **THEN** the main process rejects the request before invoking workspace mutation methods
- **THEN** workspace manifests and artifacts remain unchanged by that malformed request

#### Scenario: Malformed settings update is normalized or rejected
- **WHEN** an IPC caller sends settings updates with malformed panel definitions, unsupported URLs, invalid terminal behavior bounds, or identity collisions
- **THEN** the main process applies the existing settings normalization rules before persistence
- **THEN** rejected or normalized fields do not crash dependent manager synchronization

### Requirement: Preload bridge exposes only bounded desktop capabilities
The preload bridge SHALL expose desktop capabilities through typed, purpose-specific methods and SHALL avoid exposing unbounded privileged primitives to the renderer.

#### Scenario: Clipboard access is constrained to text helpers
- **WHEN** renderer code uses the preload clipboard capability
- **THEN** it can read or write text through explicit helper methods
- **THEN** it does not receive direct Electron clipboard or IPC objects

#### Scenario: Renderer cannot access raw IPC primitives
- **WHEN** renderer code inspects the exposed `workbenchShell` API
- **THEN** it receives purpose-specific workbench methods
- **THEN** it does not receive raw `ipcRenderer`, filesystem, PTY, or Electron module handles

### Requirement: Main-window preload sandbox posture is verified
The desktop app SHALL either run the main-window preload bridge with Electron sandboxing enabled or maintain a documented validation-backed reason for any remaining unsandboxed preload requirement.

#### Scenario: Sandbox can be enabled
- **WHEN** the preload bridge and desktop validation flows operate correctly with `sandbox: true`
- **THEN** the main window runs with preload sandboxing enabled
- **THEN** focused validation confirms the renderer shell and preload APIs still function

#### Scenario: Sandbox blocker is documented
- **WHEN** a required preload or runtime dependency cannot operate with `sandbox: true`
- **THEN** the code or validation documentation records the specific blocker
- **THEN** security-boundary validation continues to verify `contextIsolation`, disabled node integration, denied secondary windows, and bounded preload capabilities
