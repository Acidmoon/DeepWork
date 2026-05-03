## Context

The CLI workspace awareness model records selected scope, no-match, superseded, thread-local, fallback, and global-preferred outcomes. Those records are inspectable through Workspace, but the active terminal panel does not currently explain the latest lookup inline. The prior product direction intentionally removed persistent continuity chrome, so any new display must remain compact and secondary.

## Goals / Non-Goals

**Goals:**
- Make the latest retrieval decision visible from the CLI panel.
- Preserve conversation-first terminal usage.
- Reuse retrieval audit metadata rather than parsing terminal text.
- Support selected-scope, no-match, fallback, and global-preferred summaries.

**Non-Goals:**
- Do not change retrieval ranking semantics.
- Do not preload raw artifact content into the terminal UI.
- Do not add a persistent thread-management toolbar or send-to-Workspace control strip.

## Decisions

- Project summary metadata from audit state into terminal panel state.
  - Rationale: the renderer should not parse JSONL files or terminal transcript output.
  - Alternative considered: read the latest audit artifact from Workspace on render. That couples terminal paint to artifact I/O and risks stale reads.
- Display the summary in existing terminal status or details surfaces.
  - Rationale: this keeps it discoverable without reintroducing dedicated continuity chrome.
  - Alternative considered: persistent top-of-terminal banner. That competes with the terminal conversation.
- Validate with deterministic terminal snapshots.
  - Rationale: the UI behavior can be tested without live CLI retrieval.

## Risks / Trade-offs

- [Summary may be mistaken for complete context content] -> Mitigation: label it as retrieval outcome metadata and avoid showing raw artifact content inline.
- [Snapshots may grow with too much audit detail] -> Mitigation: include only latest outcome, selected scope identity, mode, and audit reference.
- [No-match summaries may feel noisy] -> Mitigation: render them only after a lookup occurs, not for every idle terminal.
