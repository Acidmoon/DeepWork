## Context

`workspace-panel.tsx` currently drives both Workspace and Logs inspection with one mostly shared layout. The same top-level skeleton presents status cards, explanatory copy, filter controls, source selection, selected summary, session preview, artifact list, artifact preview, and multiple advanced sections in a long vertical stack. This preserves functionality, but it makes the first reading path ambiguous and forces users to infer whether they are browsing conversational context, related artifacts, or raw logs.

Logs are especially affected because the current implementation reuses conversation-shaped labels and summary regions for a mode that is primarily about record inspection and debugging. At the same time, repair, maintenance, and technical sections remain visible enough that they compete with the main inspection panes even when the user only wants to confirm what the workspace captured.

## Goals / Non-Goals

**Goals:**
- Make the primary reading flow obvious in both Workspace and Logs.
- Clarify the difference between conversation/context inspection and log inspection without changing workspace persistence or retrieval semantics.
- Reduce repeated summaries so each pane has one clear purpose.
- Keep repair, maintenance, and technical areas available but visually subordinate.
- Extend deterministic regression coverage so the clarified structure is protected.

**Non-Goals:**
- Do not redesign the global shell, sidebar, or primary Web and Terminal surfaces.
- Do not change workspace manifests, artifact schemas, retrieval ranking, or preview APIs.
- Do not add new maintenance or thread-management capabilities beyond re-presenting the existing ones.
- Do not split Workspace and Logs into separate state models unless the existing shared model proves insufficient.

## Decisions

- Keep one renderer component, but derive explicit mode-specific presentation configs for Workspace and Logs.
  - Rationale: both surfaces share the same underlying snapshot, selection state, and preview mechanics, so duplicating components would increase drift risk. A mode config can still give each surface its own headings, empty states, and pane ordering.
  - Alternative considered: separate `WorkspacePanel` and `LogsPanel` components. That would improve conceptual purity, but it would duplicate selection, preview, and validation plumbing immediately.

- Replace the stacked intro-plus-summary flow with one compact inspection header and one dominant content region.
  - Rationale: the current layout spends too much vertical space before the actual inspection panes begin. A compact header can show workspace name, active thread scope, bucket mode, and active filters without competing with the content.
  - Alternative considered: keep the existing sections and only rename headings. That would not fix the reading-path ambiguity.

- Give Workspace and Logs different primary pane semantics.
  - Rationale: Workspace is conversation-first, so its detail area should emphasize selected source context and structured message or session detail before related artifacts. Logs are record-first, so they should emphasize log source, log rows, and raw preview terminology without conversation-shaped summary blocks unless structured detail truly exists.
  - Alternative considered: keep the same pane order for both modes and only swap copy. That would leave Logs feeling like a slightly renamed Workspace screen.

- Keep advanced controls in collapsible subordinate regions below the main inspection flow.
  - Rationale: thread repair, maintenance, and technical diagnostics are important but rare. Their visual presence should not compete with the list/detail/preview path that users visit most often.
  - Alternative considered: move all advanced regions into a separate settings-style panel. That would over-separate repair actions from the inspection context they operate on.

- Protect the clarified hierarchy by extending the existing workspace regression flow instead of inventing a separate UI-only check.
  - Rationale: the existing deterministic renderer validation already covers Workspace and Logs selection and preview behavior, so hierarchy assertions belong there.
  - Alternative considered: rely on manual screenshots or visual smoke only. That would be weaker for semantic layout regressions.

## Risks / Trade-offs

- [Mode-specific presentation logic could make the shared component harder to follow] -> Mitigation: centralize Workspace versus Logs labels and pane-order decisions in explicit derived config or helper structures instead of scattering `isLogInspection` branches everywhere.
- [Reducing repeated summaries might remove information some users subconsciously relied on] -> Mitigation: preserve the key metadata in one dedicated selected-detail area and strengthen selected-state cues so the location of that information is clearer.
- [Layout changes could regress constrained-width behavior] -> Mitigation: keep the responsive grid rules intentional and extend renderer validation to assert the revised hierarchy and mode labels.
- [Advanced controls may feel hidden after demotion] -> Mitigation: keep clear section titles and preserve current capabilities, but move them below the primary inspection region instead of removing them.

## Migration Plan

1. Refactor the renderer panel into explicit Workspace-mode and Logs-mode presentation sections while preserving the existing snapshot and local selection state.
2. Update labels, headings, and pane hierarchy in the renderer and shared styles.
3. Extend deterministic workspace regression assertions to cover the revised Workspace and Logs reading flow.
4. Re-run typecheck, renderer build prerequisites, and workspace regression validation before implementation is considered complete.

## Open Questions

- Whether the clarified header should expose active filter state as inline chips, a concise sentence, or both. The change should leave room for either, but the implementation can decide based on visual fit.
