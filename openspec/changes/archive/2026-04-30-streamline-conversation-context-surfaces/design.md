## Context

The project has already moved away from manual prompt builders and broad transcript injection. The next mistake would be rebuilding the same complexity as button-heavy Workspace management: open, reveal, preview, jump, select, and rethread controls scattered across the primary flow until users have to think about workspace mechanics before they can simply continue work.

The better fit for the current architecture is to let managed web and CLI panels stay primary. They already have session identity, thread identity, workspace retrieval, and indexed summaries available through the main-process managers. Workspace should remain the place you go when automatic continuity feels ambiguous, when you want to inspect what was captured, or when you need to repair organization state. It should not become the thing you constantly operate before every conversation.

## Goals / Non-Goals

**Goals:**
- Preserve compact continuity metadata for managed web and CLI panels without adding dedicated thread or session bars to those primary surfaces.
- Reuse indexed workspace metadata so continuity-aware retrieval and follow-up capture do not require raw artifact reads.
- Keep Workspace useful for search, preview, audit, and repair while making that role explicitly secondary.
- Keep selected-scope detail ordering centered on structured conversation context before logs or file inventories.

**Non-Goals:**
- Adding open or reveal buttons to every artifact row as the next primary workflow.
- Building rich inline viewers for every artifact type in this change.
- Reintroducing manual context packaging, prompt drafting, or send-to-CLI flows through Workspace.
- Removing Workspace inspection entirely.

## Decisions

### Use indexed continuity metadata as the source of continuity plumbing
Managed panels should not read raw artifact bodies just to understand what context is linked. The renderer and retrieval flows can rely on thread summaries, scope summaries, context labels, and session-linked metadata already emitted through workspace and panel snapshots.

Alternative considered: load representative artifacts to build richer panel headers. Rejected because it makes ordinary panel rendering depend on file reads and turns lightweight context feedback into hidden preview logic.

### Keep primary managed surfaces free of dedicated continuity chrome
Primary surfaces only need continuity plumbing so follow-up retrieval and capture stay attached to the right context. Adding a persistent current-thread bar, Workspace-jump action row, or thread-management toolbar makes ordinary conversation noisier and duplicates concerns that belong in Workspace.

Alternative considered: expose a compact continuity bar on managed surfaces. Rejected because even a lighter bar competes with the conversation itself and recreates pressure to think about workspace mechanics during ordinary follow-up work.

### Preserve Workspace as a secondary inspection and repair surface
Search, preview, thread inspection, and scope reassignment still matter. They just belong behind an explicit inspection step rather than inside the ordinary act of continuing a conversation.

Alternative considered: remove Workspace interaction pathways entirely. Rejected because we still need a place to audit retrieval decisions, inspect saved captures, and repair thread organization when automatic continuity is not enough.

### Keep selected-scope detail conversation-first
When users intentionally inspect a saved scope, the first useful thing is the conversation-shaped summary, then transcript or log fallback, then the broader artifact inventory. That preserves inspection value without turning the surface into a file manager.

Alternative considered: optimize selected-scope detail around file-type actions. Rejected because it would overfit inspection to artifact management instead of continuity understanding.

## Risks / Trade-offs

- [Continuity state may become harder to notice during ambiguous moments] -> Mitigation: keep Workspace inspection explicit and secondary, and let mention-driven retrieval plus saved thread metadata explain continuity when the user needs to inspect it.
- [Users may still need deeper inspection during ambiguous retrieval] -> Mitigation: retain a clear but secondary path into Workspace inspection.
- [Summary-only panel state may hide useful nuance] -> Mitigation: keep structured Workspace preview and audit flows available when the user asks for more detail.

## Migration Plan

- Extend workspace or panel snapshots so managed surfaces receive compact continuity metadata from indexed state.
- Update managed web and CLI panel UI to remove the dedicated continuity bar while keeping ordinary continuation conversation-first.
- Keep Workspace search and preview flows available, but revise copy and layout expectations so they read as secondary inspection surfaces.
- Extend regression coverage for the removed continuity chrome and for the boundary between primary conversation flow and secondary Workspace inspection.
