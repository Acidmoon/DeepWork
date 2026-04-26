## Context

The baseline workspace experience is already functional in one narrow sense: the main process persists artifacts, the renderer receives workspace snapshots, and users can filter by bucket or origin before selecting artifacts for prompt building. The problem is that the UI still behaves like a thin manifest inspector rather than a practical retrieval surface.

Current limitations in the renderer:

- The shell-level search input is not connected to workspace discovery.
- The workspace panel only supports bucket and origin filters; there is no free-text query over indexed metadata.
- Session and artifact lists are artificially trimmed (`slice(0, 8)` and `slice(0, 12)`), which makes larger workspaces harder to explore.
- Session preview exists, but artifact preview does not. Users can select artifacts for prompt building without being able to inspect the actual content they are about to send.
- The existing `workspace:read-artifact` IPC path can already fetch content by artifact ID, so the missing behavior is mostly renderer orchestration rather than storage redesign.

This change should improve usability without violating the baseline retrieval model. Search must remain index-first and cheap; preview can read full content on demand only after the user narrows to a specific artifact.

## Goals / Non-Goals

**Goals:**

- Add query-driven discovery for sessions and artifacts inside the workspace panel.
- Let bucket, origin, and search query combine into one coherent filtering model.
- Add dedicated artifact preview behavior using the existing `workspace.readArtifact()` IPC path.
- Preserve prompt-building and artifact multi-select flows while making them easier to inspect.
- Keep the change primarily in renderer state and UI logic.

**Non-Goals:**

- Implement recursive full-text scanning over all artifact files on disk.
- Turn the global sidebar search box into a cross-panel command palette in this change.
- Add preview rendering for binary-first formats such as images or PDFs beyond text-compatible fallback behavior.
- Change manifest schema, artifact persistence rules, or workspace capture behavior.
- Introduce new dependencies for indexing or search.

## Decisions

### 1. Search will be metadata-driven, not file-content-driven

Search will match against the artifact/session data already present in renderer state: artifact ID, origin, summary, tags, path, context label, and session summary text. This keeps search fast, deterministic, and aligned with the index-first retrieval rules defined in the baseline spec.

Alternative considered: search full artifact content on every query. Rejected because it would require broad file reads, scale poorly, and undermine the current retrieval contract.

### 2. Artifact preview content will be lazy-loaded and kept out of the global store

The global workspace panel state should store search and selection intent, such as `searchQuery` and `previewArtifactId`, but not the full preview payload. Raw artifact content can be large and should be loaded on demand through `workspace.readArtifact()` when the user selects an artifact to inspect.

Alternative considered: hydrate raw content for every listed artifact into the store. Rejected because it would bloat renderer state, increase startup/update cost, and duplicate the purpose of the existing read API.

### 3. Session preview and artifact preview remain distinct surfaces

Session preview already shows structured message timelines or terminal excerpts for a selected scope. Artifact preview should complement that flow rather than replace it. The workspace panel will continue to distinguish:

- scope-level preview for a selected session/source
- artifact-level preview for a selected artifact record

Alternative considered: collapse both into one preview area. Rejected because session summaries and artifact content answer different questions and would create confusing state transitions.

### 4. The change remains renderer-first and reuses current IPC

No new search backend or workspace manifest fields are required for the first iteration. The expected code changes are concentrated in renderer panel state, filtering logic, selection logic, and preview presentation. Existing `readArtifact` IPC is sufficient for on-demand preview loading.

Alternative considered: add new main-process query endpoints. Rejected because current renderer state already contains the metadata needed for search.

## Risks / Trade-offs

- [Metadata search misses terms that exist only in raw content] -> Mitigation: keep the search contract explicit and rely on preview for deep inspection after narrowing results.
- [Preview state could fight with multi-select state] -> Mitigation: keep preview selection separate from checkbox selection so prompt-building behavior remains stable.
- [Large result sets may create a denser UI] -> Mitigation: preserve existing bucket/origin narrowing and show clear counts/empty states for filtered results.
- [Non-text artifacts may not preview well] -> Mitigation: scope MVP preview to text-compatible artifacts and show fallback messaging for unsupported content.

## Migration Plan

No data migration is required.

Implementation sequence:

1. Extend workspace panel state with search and preview-selection fields.
2. Update workspace filtering logic and result rendering.
3. Add lazy artifact preview loading through existing IPC.
4. Typecheck and manually verify prompt-builder compatibility with the new interaction model.

## Open Questions

- Should the final UX search only the current bucket/origin view, or also use the query to rank scopes globally while keeping filters applied?
- Should artifact preview support copy/export actions in the same change, or remain read-only for the first iteration?
- If binary artifact types become common later, should preview capability move into a separate dedicated spec instead of staying inside workspace-context-management?
