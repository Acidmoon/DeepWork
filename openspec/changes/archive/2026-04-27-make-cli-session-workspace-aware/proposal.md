## Why

Managed CLI sessions already enter the DeepWork workspace and can inspect saved indexes, but the current flow still leans on manual prompt handoff and artifact-level keyword matches. The next step is to make workspace awareness feel native: when the user describes a task in natural language, the CLI should use workspace indexes to find the most relevant prior session or source boundary instead of loading broad global context.

## What Changes

- Add retrieval-first workspace awareness for managed CLI sessions so natural-language requests can trigger scoped lookup against workspace indexes without manual context handoff.
- Promote workspace retrieval from artifact-level suggestions to session/scope-level ranking so related conversations can be located before any raw artifact content is opened.
- Enforce boundary control rules that distinguish self-contained requests from context-dependent requests and prevent unrelated workspace history from being injected or scanned.
- Surface retrieval evidence so the system can show which scope was consulted, or why no scope was selected, when a CLI request uses workspace context.

## Capabilities

### New Capabilities
- `cli-workspace-awareness`: Managed CLI sessions can interpret a natural-language request, retrieve the most relevant workspace scope on demand, and stay bounded to that scope instead of preloading global context.

### Modified Capabilities
- `workspace-context-management`: Workspace indexes and helper retrieval commands will shift from artifact-first lookup to scope-first ranking with explicit boundary-safe lookup rules.

## Impact

- Affected specs: `cli-workspace-awareness`, `workspace-context-management`
- Likely code areas: workspace indexing and helper rules in `apps/desktop/src/main/workspace-manager.ts`, terminal bootstrap/runtime behavior in `apps/desktop/src/main/terminal-manager.ts`, shared workspace models in `packages/core`, and validation coverage for retrieval behavior
- User-facing behavior: CLI sessions become workspace-aware by default, but only retrieve prior context when the request implies it
