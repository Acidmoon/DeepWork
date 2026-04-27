## Context

The current Workspace panel still contains a renderer-managed prompt builder that turns selected artifacts into a handcrafted prompt, chooses a target CLI panel, and writes that prompt into a terminal session. This path duplicates the newer product contract that managed CLI sessions are already workspace-aware and should retrieve prior context from indexes when the user asks for it in natural language.

The implementation spans three layers: Workspace view state in `packages/core`, prompt text generation in `apps/desktop/src/shared/prompt-builder.ts`, and renderer UI/actions in `apps/desktop/src/renderer/src/panel-content.tsx`. Removing the feature is a cross-cutting simplification because state shape, renderer behavior, and shared helper code all change together.

## Goals / Non-Goals

**Goals:**
- Remove all Workspace-panel behavior whose only purpose is building or sending manual handoff prompts.
- Preserve Workspace search, scope browsing, artifact selection, and artifact preview as operator-facing inspection tools.
- Keep the managed CLI interaction model aligned with natural-language-first retrieval rather than renderer-driven prompt injection.

**Non-Goals:**
- Changing how managed CLI sessions bootstrap into the workspace.
- Removing artifact selection if it is still useful for human review, bulk actions, or future debugging workflows.
- Introducing a new replacement UI for manual context transfer in this change.

## Decisions

### Remove prompt-builder UI and actions from the Workspace panel
The panel will stop rendering prompt target controls, prompt preview text, generate actions, and send-to-CLI actions. This keeps Workspace focused on discovery and inspection.

Alternative considered: keep the prompt builder behind a collapsed "advanced" or debug-only section. Rejected because it preserves a conflicting primary workflow and continues to require prompt-builder-specific state and copy.

### Delete prompt-builder-only state and helper code
`promptTargetPanelId`, `promptDraft`, and the shared prompt generation helper will be removed instead of left dormant. This avoids carrying dead state through panel snapshots and reduces the chance that future UI work accidentally revives manual handoff behavior.

Alternative considered: keep the state and helper as an internal fallback without UI. Rejected because the product direction is to let CLI sessions retrieve context themselves, not to preserve a hidden packaging path.

### Keep artifact selection semantics inspection-oriented
Selected artifacts remain a renderer-side review affordance only if needed by adjacent Workspace interactions, but selection no longer implies "prepare a prompt" or "send to CLI". The spec language should make inspection distinct from handoff packaging.

Alternative considered: remove artifact selection entirely in the same change. Rejected because selection may still support operator review and would broaden the change beyond removing the manual prompt builder.

## Risks / Trade-offs

- Removing the manual prompt builder may inconvenience operators who were still using handcrafted prompt injection as a workaround. -> Mitigation: keep artifact preview, helper commands, and scope browsing intact so manual debugging is still possible while the product continues converging on automatic retrieval.
- If renderer state cleanup is incomplete, stale persisted panel state could continue carrying unused fields. -> Mitigation: remove the fields from the typed view-state contract and default snapshot so the renderer naturally stops reading or writing them.
- Artifact selection may look less purposeful immediately after the builder is removed. -> Mitigation: preserve selection only where it still supports inspection flows, and treat any further cleanup as a separate follow-up change if needed.
