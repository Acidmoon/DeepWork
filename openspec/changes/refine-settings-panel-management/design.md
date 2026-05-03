## Context

The current settings architecture is solid: the renderer edits settings, the settings manager normalizes and persists them, and dependent managers sync runtime state. The rough edges are in interaction quality, not architecture. The goal is to keep the same boundaries while making persistence and custom panel editing feel intentional instead of incidental.

## Goals / Non-Goals

**Goals:**

- Make persisted edits explicit and predictable.
- Reduce dependence on browser prompts for day-to-day panel management.
- Preserve existing settings normalization and manager synchronization.

**Non-Goals:**

- Rewriting the settings manager or persistence schema from scratch.
- Collapsing built-in and custom panel ownership boundaries.
- Introducing a plugin-style panel marketplace workflow.

## Decisions

- Move profile rename persistence to explicit commit behavior.
  Rationale: writing on every keystroke is noisy and makes it easy to persist accidental transient edits.
- Favor in-surface forms or drawers over prompt dialogs for custom panel editing.
  Rationale: prompts break context, hide validation affordances, and scale poorly as fields expand.
- Keep built-in and custom panel rules unchanged.
  Rationale: the product still needs app-controlled built-ins and user-controlled customs as separate classes.

## Risks / Trade-offs

- [Risk] Larger in-surface forms can make Settings denser. -> Mitigation: keep editing flows scoped and progressive rather than exposing every field all at once.
- [Risk] Changing persistence timing can reveal assumptions in current validation. -> Mitigation: update focused validation to assert explicit-save behavior.
