## Context

The current shell already treats the sidebar as a compact navigation list, but it still reserves space for a search control that does not execute any real command or filtering behavior. With only a few primary panels, direct navigation is faster and clearer than a placeholder command surface.

## Goals / Non-Goals

**Goals:**

- Remove dead navigation chrome from the sidebar.
- Keep the shell visually tighter without changing panel state behavior.
- Preserve the existing section and add-panel affordances.

**Non-Goals:**

- Introducing a real command palette or global search workflow.
- Redesigning sidebar grouping, ordering, or panel lifecycle.
- Changing the underlying navigation store or persistence model.

## Decisions

- Delete the sidebar search row instead of hiding it behind a feature flag.
  Rationale: the control is not functional today, and a hidden placeholder still leaves product ambiguity.
- Leave direct panel navigation as the only sidebar interaction model for now.
  Rationale: the panel inventory is small enough that extra indirection hurts more than it helps.
- Treat future command/search work as a separate capability.
  Rationale: a real command surface would need its own interaction model, shortcuts, and validation contract.

## Risks / Trade-offs

- [Risk] The shell may need search again if the tool inventory grows quickly. -> Mitigation: keep the removal scoped and reversible through a future dedicated navigation-command change.
- [Risk] Small spacing shifts could ripple into visual smoke expectations. -> Mitigation: rerun focused renderer validation after the cleanup.
