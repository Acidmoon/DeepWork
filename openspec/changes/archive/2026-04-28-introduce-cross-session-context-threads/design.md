## Context

DeepWork already has the right lower-level building blocks for retrieval-safe continuity:

- the workspace persists artifacts from web capture, terminal transcripts, retrieval audits, and manual clipboard saves
- `context-index.json` and per-scope manifests allow bounded lookup without raw workspace scanning
- managed CLI sessions already bootstrap with workspace-aware helper commands
- web capture and terminal capture already maintain session-local identity through `contextLabel`, `sessionScopeId`, and origin metadata

What is missing is a stable semantic layer above those per-session and per-page scopes. Today:

- terminal launches generate new scope labels such as `session-0001`, `session-0002`, and so on
- web capture derives context labels from message text or URL/title
- manual saves can be tagged, but do not attach to an explicit long-lived thread
- retrieval can find prior scopes, but a user cannot cleanly say "continue this same work thread" as a first-class operation

The design therefore needs to preserve the current artifact/scope model while introducing a higher-level thread identity that spans multiple scopes over time.

## Goals / Non-Goals

**Goals:**

- Introduce a stable thread entity that can own many scopes and artifacts across web, CLI, and manual capture flows.
- Preserve existing artifact records, scope IDs, and retrieval-safe indexing instead of replacing them with a new opaque storage model.
- Let users explicitly continue an existing thread, start a new thread, or reassign an existing scope to a different thread.
- Make managed CLI retrieval prefer the current thread before falling back to global workspace ranking.
- Keep the first implementation additive and migration-safe for current workspaces.

**Non-Goals:**

- Replace scope IDs with thread IDs or flatten all captures into one global conversation stream.
- Automatically cluster historical scopes into perfect semantic threads without any operator input.
- Introduce cloud sync, multi-user collaboration, or remote workspace storage.
- Turn retrieval into broad transcript preloading or full-thread prompt injection by default.
- Redesign the full desktop navigation model beyond the minimum thread-selection and inspection surfaces needed for continuity.

## Decisions

### 1. Add a thread layer above scopes instead of replacing scopes

The system will keep scope IDs as immutable capture-group identities and add a stable thread identity above them. A thread can contain many scope IDs across multiple origins and session launches.

This preserves the current retrieval-safe indexing model, existing artifact records, and current validation assumptions while solving the continuity problem at the correct semantic level.

Alternative considered: replace scope IDs entirely with thread IDs. Rejected because scopes already map cleanly to bounded retrieval units and capture sessions, and removing them would create unnecessary migration and validation risk.

### 2. Make thread persistence additive and derived from workspace state

Thread data should be persisted as workspace-managed manifests, for example a top-level thread index plus per-thread manifests, and artifact metadata should carry optional thread identity fields. Existing artifacts without thread metadata should remain valid and be backfilled into compatible thread records during rebuild or migration.

This keeps the workspace as the single durable source of truth and avoids introducing a second disconnected store.

Alternative considered: maintain thread state only in renderer settings. Rejected because thread continuity must survive restarts, support CLI bootstrap, and participate in retrieval/index rebuilds.

### 3. Prefer explicit thread assignment over aggressive automatic merging

The first implementation should prioritize explicit user intent:

- create new thread
- continue selected thread
- reassign a saved scope into another thread

Automatic behavior should be limited to sane defaults, such as keeping subsequent captures in the same assigned thread or creating a new thread when none is assigned.

Alternative considered: automatically merge scopes into threads based on similarity heuristics. Rejected because false positives would silently corrupt context boundaries and make retrieval harder to trust.

### 4. Keep retrieval bounded, but bias it toward the active thread first

Managed CLI retrieval should remain bounded and inspectable. The change is not to preload more context, but to search in a better order:

1. if a current thread is active, rank candidate scopes inside that thread first
2. if no thread-local match exists, fall back to the current global scope-ranking behavior
3. continue recording retrieval outcomes as inspectable workspace-managed evidence

This improves continuity without weakening the retrieval-safety guarantees already codified in the workspace and CLI specs.

Alternative considered: inject the entire thread transcript into every new session automatically. Rejected because it would increase noise, cost, and accidental context bleed.

### 5. Surface thread continuity in the renderer, not only in helper commands

Users need an explicit, visible continuity model. The renderer should therefore expose:

- the currently active thread
- actions to start a new thread or continue an existing one
- workspace inspection of threads and their member scopes
- rethread operations for saved scopes

This keeps continuity understandable and operator-controlled instead of hiding it behind CLI-only commands.

Alternative considered: implement thread continuity as a backend-only feature. Rejected because the user goal is unified context across sessions, not merely a hidden storage upgrade.

### 6. Backfill legacy workspace content conservatively

Existing artifacts and scopes should be backfilled into thread records without destructive rewrites. The conservative default is one derived thread per existing scope unless later operator action merges or reassigns them.

This means old data remains intact, and future continuity improves immediately without requiring perfect historical reconstruction.

Alternative considered: run a one-time semantic migration that tries to infer multi-scope threads from old data. Rejected because it adds complexity and high misclassification risk to the first implementation.

## Risks / Trade-offs

- [Legacy workspaces remain somewhat fragmented after initial migration] -> Mitigation: backfill conservatively, then expose explicit rethread operations and forward continuity for all new sessions.
- [Thread-aware UI increases workbench complexity] -> Mitigation: keep the first UI limited to active-thread visibility, create/continue actions, and scope-to-thread reassignment.
- [Current-thread bias could hide relevant off-thread context] -> Mitigation: retrieval must fall back to global ranking when no thread-local match is found and must record that fallback in retrieval audit state.
- [Additional manifests could drift from artifact state] -> Mitigation: derive thread manifests from artifact metadata and explicit thread assignment state during the same rebuild flow that already updates scope indexes.
- [Users may over-trust automatic thread naming] -> Mitigation: let users rename or explicitly choose threads instead of treating inferred titles as authoritative.

## Migration Plan

1. Extend workspace/core models to represent thread indexes, per-thread manifests, and artifact-level thread metadata.
2. Add additive workspace rebuild logic that backfills thread records for existing artifacts and scopes.
3. Wire thread assignment into manual save, web capture, and terminal bootstrap/transcript persistence flows.
4. Expose thread selection, creation, inspection, and rethread controls in the renderer.
5. Update helper commands, retrieval behavior, and validation flows to understand active-thread-first retrieval.

Rollback strategy:

- ignore or stop writing thread metadata and thread manifests
- continue using the existing artifact manifest, context index, and per-scope retrieval path
- leave additive thread files in place because they can be regenerated from workspace state if the feature is re-enabled later

## Open Questions

- Should the first version use one global active thread for the whole workbench, or allow each web/CLI panel to track its own active thread selection?
- Is explicit scope reassignment enough for v1, or do we also need first-class thread merge/split operations immediately?
- Should helper-command support expose dedicated thread commands such as `aw-threads` and `aw-thread`, or should thread-aware retrieval remain implicit behind `aw-suggest` for the first iteration?
