## Why

Web conversation capture into the workspace now drives the core "mention a prior session and let the CLI retrieve it" workflow, but that path still lacks repeatable regression coverage. After the recent sync and capture fixes, the next risk is silently breaking web-context persistence or Workspace Sync behavior without noticing until a user reports it.

## What Changes

- Add a repeatable validation flow for managed web-context capture into the workspace.
- Add deterministic validation fixtures and/or harness behavior that can verify Workspace Sync triggers a real workspace rescan instead of a renderer-only refresh.
- Verify that conversation-like web content is persisted into workspace-managed artifacts and becomes visible through normal workspace snapshot flows.
- Document the validation workflow so developers can rerun it after main-process, preload, or renderer changes that affect capture and sync behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-regression-validation`: Extend regression coverage beyond renderer-only workspace browsing so it also verifies the web capture and Workspace Sync path.
- `workspace-context-management`: Clarify that validation coverage exists for the managed web-context persistence and manual workspace resync flow.

## Impact

- Affects desktop validation assets and docs under `apps/desktop/validation/`.
- Likely adds or extends a validation harness for main-process-driven web capture and workspace snapshot refresh.
- May add deterministic test fixtures for conversation-like web scrape results and expected workspace artifacts.
