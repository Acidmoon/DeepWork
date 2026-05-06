## Codex App-Server Research Spike

This directory is the non-default structured remote-session spike for `codex app-server`. PTY mode remains the default Feishu remote target.

### Detected Support

- Installed CLI: `codex-cli 0.128.0`
- `codex app-server` is available.
- Supported transports from help output: `stdio://` by default, `unix://`, `unix://PATH`, `ws://IP:PORT`, and `off`.
- Generated tooling is available:
  - `codex app-server generate-ts --experimental --out <DIR>`
  - `codex app-server generate-json-schema --experimental --out <DIR>`

### Generated Artifacts

Protocol artifacts were generated into:

- `protocol/ts`
- `protocol/json-schema`
- `protocol/metadata.json`

The generated `ClientRequest` union includes the required research-spike methods: `initialize`, `thread/start`, `thread/resume`, `turn/start`, `turn/steer`, and `turn/interrupt`.

### Auth And Transport Assumptions

The first structured adapter should use a DeepWork-owned local app-server process. `stdio://` is the safest default for local-only process ownership. `ws://127.0.0.1:<port>` can be used for explicit experiments when lifecycle and token handling are added. Non-loopback websocket listeners require an app-server websocket auth mode and must not be enabled by default.

### Fallback Behavior

If feature detection fails, structured mode reports unavailable and Feishu routing remains on the PTY adapter. The system must not silently switch a conversation into structured mode.
