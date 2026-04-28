## Context

Managed CLI sessions already receive retrieval-specific environment variables and helper commands at bootstrap time. Those helpers can rank scope candidates with `aw-suggest`, persist temporary lookup state in `*.pending.json`, and append structured JSON lines to `logs/retrieval/<session-scope>.jsonl` when a lookup resolves.

That means the repository already has the beginnings of retrieval auditing, but it is still helper-centric rather than workspace-centric. The current audit files are not yet guaranteed to behave like first-class workspace records, and the inspection path still depends too much on knowing where the raw log file lives instead of using the normal workspace artifact/index flows.

## Goals / Non-Goals

**Goals:**
- Make retrieval audit outcomes stable, structured, and complete for managed CLI sessions.
- Persist completed retrieval audits through the workspace artifact/index model so they are inspectable like other saved workspace records.
- Keep pending lookup state separate from completed audit evidence.
- Reuse existing workspace search, logs-bucket browsing, and artifact preview paths instead of inventing a parallel inspection surface.

**Non-Goals:**
- Changing the ranking algorithm used by `aw-suggest`.
- Reworking the full renderer information architecture for logs or sessions beyond what is needed to inspect retrieval audit records.
- Capturing every intermediate helper command invocation as a separate audit event when it does not represent a resolved lookup outcome.

## Decisions

### Keep session-scoped JSONL audit files as the source format
Completed retrieval outcomes will continue to append into `logs/retrieval/<session-scope>.jsonl` so the CLI helper flow stays simple, append-friendly, and scriptable.

Alternative considered: replace JSONL with one standalone JSON artifact per lookup. Rejected because append-only session logs match the existing helper flow better and avoid excessive artifact fan-out for repeated retrievals in one terminal session.

### Promote completed audit logs into workspace-managed artifacts
The workspace layer will treat retrieval audit logs as first-class saved records with manifest metadata, scope identity, and previewable content rather than leaving them as opaque sidecar files outside normal workspace indexing.

Alternative considered: leave the files unindexed and document their path. Rejected because that keeps audit inspection off the main product path and weakens the contract that retrieval outcomes are inspectable from the workspace itself.

### Keep pending lookup files transient and non-inspectable as completed evidence
`*.pending.json` state will remain an internal coordination file for in-flight selection state only. It should either resolve into a completed audit entry or be cleared with an explicit superseded/no-match outcome rather than surfacing as if it were a finished audit record.

Alternative considered: index pending lookup state directly in the workspace. Rejected because incomplete lookup state is operational plumbing, not user-facing retrieval evidence.

### Encode retrieval outcome metadata for search and debugging
Audit artifact metadata should carry normalized outcome, selected scope ID, candidate scope IDs, and query-derived fields so operators can find retrieval events through existing workspace filtering and metadata search without parsing whole transcripts.

Alternative considered: rely only on raw JSONL preview. Rejected because raw preview helps debugging, but indexed metadata is what makes the records actually discoverable.

## Risks / Trade-offs

- [Audit files become noisy during active CLI usage] -> Mitigation: keep one append-only artifact per session scope instead of one artifact per lookup, and summarize the latest outcome in metadata for quick inspection.
- [Pending-state cleanup may miss edge cases] -> Mitigation: require explicit handling for superseded lookups and verify that unfinished `*.pending.json` files do not masquerade as completed evidence.
- [Renderer inspection could still feel indirect if audit records blend into generic logs] -> Mitigation: store recognizable retrieval-specific metadata and summaries so existing workspace search and logs browsing can isolate them quickly.
