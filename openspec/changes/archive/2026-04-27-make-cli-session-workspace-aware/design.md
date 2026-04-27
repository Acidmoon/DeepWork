## Context

DeepWork already has the baseline pieces for workspace-aware CLI sessions:

- managed CLI panels start inside the current workspace and load `WORKBENCH_TOOLS.ps1`
- workspace rules and `AGENTS.md` / `CLAUDE.md` already tell the CLI to inspect indexes before reading raw artifacts
- terminal and web capture now avoid persisting empty or input-free sessions, which improves workspace signal quality

The remaining gap is retrieval quality and boundary control. The current `aw-suggest` helper scans `artifacts.json` and scores individual artifact metadata, which is enough for manual inspection but not strong enough for natural-language, session-oriented retrieval. It also does not provide a robust way to explain which scope was chosen when the CLI decides to retrieve context.

This change needs to keep the product philosophy intact:

- the user talks to the CLI normally in natural language
- the CLI becomes workspace-aware by default
- prior context is retrieved on demand, not preloaded globally
- unrelated sessions stay outside the working set unless the current request actually points to them

## Goals / Non-Goals

**Goals:**

- Make managed CLI sessions rely on workspace retrieval by default instead of manual prompt handoff.
- Upgrade retrieval from artifact-first matching to scope/session-first ranking.
- Keep retrieval index-first and bounded so the CLI narrows to one relevant scope before opening raw artifacts.
- Make retrieval behavior inspectable when a lookup happens or when no scope is selected.
- Reuse the existing workspace bootstrap, capture pipeline, and manifest regeneration flow.

**Non-Goals:**

- Preload the full workspace into every CLI turn.
- Build embedding search, vector storage, or external retrieval services in this change.
- Add speech capture or transcription; this change starts after the CLI receives plain natural-language input.
- Remove the existing prompt-builder flow if it is still useful for manual workflows.
- Redesign workspace persistence beyond the metadata needed for scope ranking and retrieval evidence.

## Decisions

### 1. Retrieval remains agent-initiated, but the host provisions stronger retrieval primitives

The desktop host will not choose context on behalf of the CLI and inject it into every turn. Instead, managed CLI sessions will continue to start inside the workspace with managed instructions and helper commands, but those helpers will become good enough for the model to use on ordinary natural-language requests.

This matches the target product behavior more closely than renderer-side "Send to CLI" flows. The user should be able to describe work naturally, and the CLI should decide whether it needs prior workspace context.

Alternative considered: automatically run retrieval in the host before every user turn and append results into the terminal input stream. Rejected because it hides decision-making, weakens boundaries, and moves the system back toward manual handoff with automatic packaging.

### 2. `context-index.json` will become the primary retrieval surface for scope ranking

`artifacts.json` will remain the source of truth for artifact records, but `aw-suggest` should stop ranking individual artifacts directly. Instead, workspace rebuilds will enrich `ContextIndexEntry` with scope-level retrieval metadata derived only from already indexed fields, such as:

- normalized origin and context label
- latest artifact summary and updated time
- aggregated tags and artifact types
- a compact scope summary / search term set built from artifact summaries, titles, and metadata

`aw-suggest` will read `context-index.json`, score scopes, and return candidate sessions or sources first. Only after one scope is chosen should the CLI inspect `aw-origin <scopeId>` and then open specific artifacts.

Alternative considered: keep scanning `artifacts.json` and infer scope membership from the top hits. Rejected because it produces noisier matches, encourages over-reading, and makes session boundaries weaker.

### 3. Helper commands will gain structured retrieval output and session-bound audit logging

For model-driven retrieval to be reliable, helper output needs to be structured. `aw-suggest` should support JSON-oriented output for CLI consumption, while keeping a readable default for humans. Managed terminal bootstrap will also set stable session environment variables such as panel ID, launch label, and workspace scope metadata so helper commands can write retrieval audit entries to a session-scoped log file under the workspace `logs` area.

Each retrieval audit entry should capture at least:

- the original query string
- ranked candidate scope IDs
- the selected scope ID, if any
- the reason when no scope is selected
- timestamp and session identity

This gives the workspace an inspectable trace of what the CLI looked up without forcing raw transcript parsing.

Alternative considered: rely on transcript text alone as retrieval evidence. Rejected because it is brittle, harder to query, and mixes retrieval decisions with unrelated CLI output.

### 4. Boundary control will be encoded as a two-step lookup protocol, not bulk context injection

Managed instructions and helper semantics will enforce a narrow workflow:

1. decide whether the request depends on prior workspace context
2. if yes, rank candidate scopes with `aw-suggest`
3. inspect one candidate scope with `aw-origin`
4. open only the specific artifacts needed with `aw-artifact` or `aw-cat-artifact`

The important behavior is that `aw-suggest` returns scopes, not raw artifact content, and no command should encourage loading multiple unrelated scopes at once. If no scope is relevant, the CLI should continue without broad scanning or explicitly ask for clarification.

Alternative considered: automatically open artifacts from the top-ranked scope after suggestion. Rejected because it collapses the boundary between search and read, making accidental overreach more likely.

## Risks / Trade-offs

- [Scope-level metadata may still miss intent that only appears in raw content] -> Mitigation: keep the retrieval protocol explicit and allow the CLI to inspect one candidate scope before deciding whether deeper reads are needed.
- [Audit logging adds another persisted artifact stream] -> Mitigation: keep entries lightweight, session-scoped, and append-only under `logs`, not a second full transcript system.
- [Structured helper output may complicate manual operator use] -> Mitigation: keep human-readable defaults and add explicit JSON mode for model-facing retrieval.
- [Instruction-driven retrieval depends on model compliance] -> Mitigation: make helper usage the path of least resistance through better instructions, JSON output, and regression validation around the bootstrap/rules surface.

## Migration Plan

No destructive migration is required.

1. Extend core workspace index models and builders so scope entries expose retrieval metadata.
2. Update workspace rule files and helper commands to use scope-first retrieval and structured output.
3. Extend terminal bootstrap with session identity environment variables needed for retrieval audit logging.
4. Regenerate workspace manifests and rules on initialization so existing workspaces pick up the new retrieval behavior.
5. Add validation fixtures and regression coverage for scope ranking, bounded lookup, and no-global-context behavior.

Rollback can keep the enriched index fields in place and simply revert helper command behavior to artifact-first lookup if needed.

## Open Questions

- Should retrieval audit entries live only as log files in this change, or also be exposed as first-class workspace artifacts later?
- Is the first ranking iteration purely deterministic keyword scoring, or do we also want weighted boosts for origin, recency, and exact context-label matches immediately?
- Should custom terminal panels inherit the same retrieval audit behavior by default, or only the built-in Codex / Claude panels in the first pass?
