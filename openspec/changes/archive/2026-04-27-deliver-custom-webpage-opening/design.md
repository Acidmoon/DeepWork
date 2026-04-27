## Context

The active change was originally framed around activating a reserved MiniMax web panel, but the product need is broader: DeepWork should support opening arbitrary custom web pages as managed desktop workbench panels. The current codebase already has most of the plumbing for this flow, including renderer-side creation of custom web panels, settings persistence for `customWebPanels`, runtime synchronization into `WebPanelManager`, and in-panel editing of URL, partition, and enabled state.

What is missing is not a brand-new web runtime, but a coherent contract that turns this partial implementation into a first-class delivered capability. The design therefore needs to formalize generic custom webpage opening across renderer navigation, persisted settings, and main-process panel lifecycle without regressing the existing managed web safety model.

Constraints:

- Reuse the current `WebContentsView` architecture instead of introducing a second web-runtime path.
- Keep persisted settings backward compatible with the existing `customWebPanels` shape.
- Preserve the current security envelope: only `http:` and `https:` targets are allowed, and disabled web panels remain non-live reserved entries.
- Avoid turning this change into a broad provider integration effort. MiniMax can remain as an optional built-in target, but it is no longer the design center.

## Goals / Non-Goals

**Goals:**

- Make user-defined web pages a first-class supported panel flow in the desktop workbench.
- Keep a single settings-backed contract for creating, opening, editing, disabling, and restoring custom web panels.
- Ensure built-in and custom web panels share the same runtime lifecycle, navigation synchronization, and safety rules.
- Preserve session persistence behavior through explicit per-panel partition configuration.

**Non-Goals:**

- Removing existing built-in web panel slots or redesigning the full sidebar information architecture.
- Adding site-specific compatibility logic, permission prompts, or popup-management policies beyond the current managed panel behavior.
- Replacing the current lightweight add flow with a dedicated multi-step creation wizard.
- Supporting non-HTTP(S) schemes or external-browser fallback behavior.

## Decisions

### 1. Keep settings as the source of truth for custom web panel definitions

Custom web panels will continue to be represented in `AppSettingsSnapshot.customWebPanels`, and both startup hydration and live settings updates will derive navigation/runtime state from that persisted list.

Rationale:

- The renderer already persists new custom web panels through `settings.update`.
- The main process already reconstructs custom web configs from settings on startup.
- This keeps restart recovery, rename/delete behavior, and enable/disable semantics in one place.

Alternative considered:

- Maintain runtime-only custom tabs separate from settings. Rejected because it weakens restart restoration and creates a second lifecycle model for web panels.

### 2. Reuse the managed web-panel pipeline for arbitrary pages

Custom web pages will use the same `WebPanelManager` lifecycle as built-in web panels: managed `WebContentsView`, synchronized snapshots, bounds updates, navigation controls, and reserved-state handling when disabled.

Rationale:

- The runtime already supports enabled custom configs through `syncCustomPanels`.
- One pipeline keeps safety, state reporting, and session persistence consistent.

Alternative considered:

- Render custom sites inside the renderer shell or open them externally. Rejected because it would bypass existing Electron safety controls and fragment panel behavior.

### 3. Treat provider-specific sites as configurations, not as the capability boundary

MiniMax and similar destinations will be treated as optional web targets that can be expressed either through a built-in reserved panel or through a user-defined custom web panel. The delivered capability is generic webpage opening, not a provider toggle.

Rationale:

- Adding one built-in slot per provider does not scale.
- The current custom panel model is already a better fit for arbitrary destinations.

Alternative considered:

- Keep the change scoped to enabling only `minimax-web`. Rejected because it would leave the broader custom-web workflow underspecified despite existing partial support.

### 4. Disabled custom web panels remain registered and editable

Disabling a custom web panel will keep its definition in navigation and settings while preventing a live `WebContentsView` from being mounted until re-enabled.

Rationale:

- This matches the current reserved-state behavior used for built-in disabled panels.
- Disable is an operational state, not a delete action.

Alternative considered:

- Delete custom web panels when turned off. Rejected because users need to preserve configuration and session partition choices without reopening a live site.

### 5. Normalize URLs at creation and save boundaries, but keep advanced fields editable

The add/open flow will normalize user-entered URLs into navigable HTTP(S) targets while still allowing users to edit title, partition, and enabled state through the existing panel controls.

Rationale:

- Lightweight URL entry is the lowest-friction way to deliver the feature.
- Retaining editable partition metadata supports persistent versus isolated sessions when needed.

Alternative considered:

- Hide partition and auto-generate all metadata with no user control. Rejected because advanced users need explicit session isolation and durable login partitions.

## Risks / Trade-offs

- [The implementation already partly exists, so remaining work can look ambiguous] -> Anchor the change on explicit user-visible scenarios and task only the missing productization work.
- [Generic webpage support may be interpreted as universal site compatibility] -> Keep the scope limited to managed opening, persistence, and navigation; do not guarantee provider-specific behavior beyond the shared web runtime.
- [The current change name remains MiniMax-specific] -> Keep artifact content generic and treat rename as optional follow-up metadata cleanup.
- [Custom panels can accumulate stale entries] -> Preserve rename, disable, and delete controls so panel definitions remain manageable through the same settings-backed lifecycle.

## Migration Plan

No data migration is required because the existing `customWebPanels` settings model already stores the fields needed by this change: `id`, `title`, `sectionId`, `homeUrl`, `partition`, and `enabled`.

Existing built-in panel overrides remain valid. Users can continue enabling reserved built-in panels such as MiniMax, but the primary supported workflow becomes adding arbitrary custom web pages through the generic custom-panel path.

Rollback is low risk because it only reverts behavior and copy around the custom web-panel workflow; it does not require rewriting persisted settings.

## Open Questions

- Whether the change directory should be renamed from `activate-minimax-web-panel` to a generic custom-web name for traceability.
- Whether a later follow-up should demote or remove the reserved built-in MiniMax panel once the generic custom webpage flow is the preferred entry path.
