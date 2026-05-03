## Context

The Workspace panel is intentionally the inspection and repair surface, not the primary working surface. However, its current layout places routine browsing and high-risk or low-frequency tools in the same visual band, which weakens the product's conversation-first model and makes the page feel more complex than its role requires.

## Goals / Non-Goals

**Goals:**

- Make the default Workspace view easier to scan.
- Push maintenance and repair actions behind clearer secondary boundaries.
- Preserve existing inspection and repair capability coverage.

**Non-Goals:**

- Removing maintenance or continuity repair from the product.
- Changing workspace persistence, indexing, or audit semantics.
- Reintroducing prompt-builder or CLI handoff flows.

## Decisions

- Split Workspace into layered surfaces: routine browsing first, advanced controls later.
  Rationale: users should be able to inspect recent artifacts and selected scope detail without wading through repair controls.
- Keep maintenance and continuity repair in collapsible advanced sections.
  Rationale: these are explicit operator actions, not part of ordinary browsing.
- Reduce helper-command reference prominence while preserving availability.
  Rationale: helper commands matter for debugging, but they should not compete with artifact and scope inspection.

## Risks / Trade-offs

- [Risk] Power users may need one extra click to reach maintenance controls. -> Mitigation: keep those sections on the same page and make them clearly discoverable.
- [Risk] Refactoring a large renderer file can cause subtle behavior regressions. -> Mitigation: preserve existing state transitions and extend validation around critical browsing flows.
