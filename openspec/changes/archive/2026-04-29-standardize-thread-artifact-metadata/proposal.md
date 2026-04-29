## Why

DeepWork already preserves origin, context labels, capture modes, and thread IDs across multiple workspace artifact types, but the summaries, tags, and inspection metadata still vary noticeably by producer. That inconsistency makes thread browsing and retrieval-audit inspection feel stitched together even when the underlying records belong to one continuing line of work.

## What Changes

- Standardize thread-linked artifact metadata for manual saves, managed web captures, managed CLI transcripts, message indexes, and retrieval audit records.
- Normalize summaries, tags, context labels, and capture-mode fields so mixed artifact types can be grouped and inspected predictably inside one thread.
- Rebuild derived scope and thread indexes from the normalized inspection envelope without breaking existing manifests or rewriting raw artifact files.
- Keep backward compatibility for older artifacts by normalizing during write and rebuild paths instead of introducing a separate destructive migration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-context-management`: add a consistent thread-linked metadata and summary envelope across workspace-managed artifact types.
- `agent-session-handoff`: normalize managed CLI transcript metadata so later workspace inspection can group it with related thread artifacts.
- `cli-workspace-awareness`: normalize retrieval-audit artifact metadata so thread-aware lookup evidence is comparable across sessions.

## Impact

- Affected code: workspace artifact store and index rebuild helpers, transcript and web-capture upsert paths, retrieval-audit sync logic, and renderer helpers that format summaries or search text.
- Affected systems: workspace manifests, thread browsing, retrieval-audit inspection, and any fixture data that assumes producer-specific summary formats.
- Validation impact: deterministic workspace fixtures must cover mixed artifact types within one thread and confirm backward-compatible indexing behavior.
