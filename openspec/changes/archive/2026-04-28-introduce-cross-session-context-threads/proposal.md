## Why

DeepWork already unifies artifact storage and workspace retrieval, but it still fragments one ongoing line of work into unrelated web scopes, terminal launch scopes, and manual captures. That makes prior context discoverable, yet not truly continuous, because later sessions still have to reconstruct the thread of work from per-session records instead of continuing a stable shared context.

This change is needed now because the current workspace/retrieval foundation is strong enough to support a higher-level continuity model. Without a thread layer, future sessions will keep accumulating more context while remaining semantically split across scope labels like `session-0001` or URL-derived capture names.

## What Changes

- Introduce stable cross-session context threads above the existing artifact and scope model.
- Allow managed web panels, managed CLI sessions, and manual workspace saves to create, continue, or explicitly attach to a thread instead of always minting isolated context islands.
- Persist thread manifests and thread summaries alongside the current artifact manifest, context index, and per-scope origin manifests while keeping current scope IDs and artifact files valid.
- Make workspace inspection and managed CLI retrieval thread-aware so the current thread is preferred before global search, with bounded fallback behavior when no relevant thread-local context exists.
- Surface active-thread state in the renderer so users can intentionally continue or rethread work across web, terminal, and workspace flows.

## Capabilities

### New Capabilities
- `context-thread-management`: Defines stable cross-session thread identities, explicit continue/new-thread workflows, and reassignment of saved scopes into a shared long-lived context.

### Modified Capabilities
- `workspace-context-management`: Add thread manifests, thread membership inspection, rethread operations, and thread-aware helper-command support on top of existing artifact/scope persistence.
- `agent-session-handoff`: Add thread-aware managed-session bootstrap and transcript persistence so later CLI launches can continue the same line of work.
- `cli-workspace-awareness`: Add current-thread-biased retrieval behavior and thread-aware retrieval audit outcomes while preserving bounded lookup rules.
- `desktop-workbench-panels`: Add renderer-facing active-thread controls and continuation state for workspace, web, and terminal surfaces.

## Impact

- Affects `apps/desktop/src/main/workspace-manager.ts`, `apps/desktop/src/main/web-panel-manager.ts`, `apps/desktop/src/main/terminal-manager.ts`, and the preload bridge used by the renderer.
- Affects renderer state and UI under `apps/desktop/src/renderer/src/`, especially `App.tsx`, workspace browsing surfaces, and panel toolbar state.
- Affects workspace/core models under `packages/core/src/desktop/` for artifact metadata, thread manifests, retrieval metadata, and helper-command behavior.
- Adds or updates desktop validation coverage for thread creation, continuation, rethreading, and thread-aware retrieval behavior.
