## Why

The repository already contains a near-MVP desktop workbench, but its current behavior only exists in code, UI copy, and implicit phase notes. Without baseline OpenSpec artifacts, future work risks changing panel behavior, workspace retrieval rules, and agent handoff flows without a stable contract.

This change is needed now because the project has crossed the point where "read the code to understand the product" is no longer enough. The next phase should start from an explicit baseline: what is already working, what is still incomplete for MVP, and which structural gaps must be closed before the system can scale cleanly.

## What Changes

- Create a baseline OpenSpec change for the current MVP-aligned implementation without modifying application source code.
- Capture the current desktop workbench surface as a spec: Electron shell, panel model, visibility rules, and main-process ownership of live web and terminal runtimes.
- Capture the current workspace behavior as a spec: workspace initialization, artifact persistence, scope indexing, retrieval rules, and deletion semantics.
- Capture the current agent handoff behavior as a spec: terminal bootstrap, workspace helper commands, prompt generation, and prompt delivery into managed CLI sessions.
- Capture the current settings and extensibility behavior as a spec: persisted preferences, configurable built-in panels, and user-defined web/CLI panels.
- Record unfinished MVP work and structural deficiencies in design and task artifacts so later changes can proceed against explicit constraints instead of inferred intent.

## Capabilities

### New Capabilities
- `desktop-workbench-panels`: Defines the baseline shell, navigation sections, and live panel lifecycle for web, terminal, workspace, tool, and settings panels.
- `workspace-context-management`: Defines how DeepWork initializes a workspace, persists artifacts, builds source/session indexes, and exposes retrieval-safe helper commands.
- `agent-session-handoff`: Defines how managed terminal sessions are bootstrapped, how context-limited prompts are generated, and how prompts are sent into CLI agent panels.
- `settings-and-panel-extensibility`: Defines persisted application preferences plus creation, configuration, rename, enable/disable, and removal behavior for built-in and custom panels.

### Modified Capabilities

None.

## Impact

- Adds OpenSpec baseline documentation under `openspec/changes/establish-mvp-baseline-specs/`.
- Establishes the requirement contract for the current implementation in `apps/desktop/src/main`, `apps/desktop/src/preload`, `apps/desktop/src/shared`, and `apps/desktop/src/renderer/src`.
- Does not change runtime behavior, package dependencies, build output, or existing source files.
