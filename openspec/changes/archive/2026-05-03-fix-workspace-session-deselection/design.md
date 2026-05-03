## Context

The renderer stores the current scope selection in `selectedOrigin`, using `'all'` as the unselected state for source filtering. The session list rows in `workspace-panel.tsx` currently always assign the clicked scope ID, so the user can narrow inspection to a session but cannot reverse that choice by interacting with the same row again.

## Goals / Non-Goals

**Goals:**
- Make session-row selection reversible in both Workspace and Logs inspection.
- Reuse the existing `'all'` origin sentinel instead of introducing new panel state.
- Preserve other local inspection state such as preview target, artifact multi-select, bucket filter, and thread filter.
- Add deterministic regression coverage for repeated-click deselection.

**Non-Goals:**
- Do not add a new clear-selection control or redesign the Workspace layout.
- Do not change how the origin dropdown or thread filter currently behaves.
- Do not couple deselection to preview clearing, thread mutation, or continuity changes.

## Decisions

- Toggle session rows between the clicked scope ID and `'all'`.
  - Rationale: the panel already treats `'all'` as the canonical unselected state, so deselection can remain a pure `selectedOrigin` transition.
  - Alternative considered: introducing a second boolean or dedicated deselect button. That would duplicate existing state semantics for a small interaction fix.
- Keep deselection local to source filtering and selected-scope detail.
  - Rationale: existing specs already separate workspace inspection from continuity and preview behavior, and clearing a source filter should not implicitly discard other inspection context.
  - Alternative considered: clearing preview and artifact selection together with the source selection. That would make the action destructive and inconsistent with the panel's current separation of concerns.
- Extend the existing workspace regression flow instead of creating a new validation script.
  - Rationale: the current deterministic renderer validation already exercises session filtering, preview, and log inspection, so repeated-click assertions fit naturally there.
  - Alternative considered: adding a separate one-off renderer check. That would duplicate setup and weaken coverage of the real inspection path.

## Risks / Trade-offs

- [Users may confuse deselection with resetting all filters] -> Mitigation: only `selectedOrigin` changes; the current bucket, thread, and query filters remain intact.
- [Clearing the selected scope while preview stays loaded may look surprising] -> Mitigation: keep the existing contract that preview state is independent from source selection and cover that expectation in regression.
- [A small renderer-only change could regress quietly later] -> Mitigation: add repeat-click assertions in both artifact and log inspection flows.
