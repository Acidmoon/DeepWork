## Context

DeepWork already has most of the technical pieces for custom web panels:

- renderer-side section actions can create user-defined web panels
- settings persistence already stores custom web panel definitions
- the main process already mounts user-defined `WebContentsView` instances
- runtime snapshots already distinguish `homeUrl` from `currentUrl`
- safe navigation already blocks non-HTTP and non-HTTPS targets

What is missing is a coherent browser-like contract. Today the add-web flow is still treated like scaffolded configuration, while the runtime browsing behavior is only partially surfaced. This change needs to unify creation, navigation, persistence, and restart behavior so a newly added web panel behaves like a lightweight browser panel instead of a one-off provider shortcut.

## Goals / Non-Goals

**Goals:**

- Let users add a custom web panel by entering any safe HTTP or HTTPS URL.
- Make a custom web panel open immediately and behave like a browser-style surface after creation.
- Keep a clear distinction between the persisted `homeUrl` and the live `currentUrl`.
- Preserve restart compatibility for existing custom web panels and built-in safety constraints.

**Non-Goals:**

- Building a full multi-tab browser, bookmarks system, or download manager.
- Supporting non-HTTP(S) schemes inside managed web panels.
- Changing the retrieval/capture model beyond whatever existing navigation behavior already triggers.
- Redesigning built-in provider panels into a different product surface.

## Decisions

### 1. Persist `homeUrl`, not `currentUrl`

Custom web panels will continue to persist a stable `homeUrl` while treating `currentUrl` as runtime-only browsing state.

Why:

- Users need a predictable restart target.
- Browsing to a temporary address should not silently rewrite saved configuration.
- The current data model already supports this split, so the change can stay compatible with existing settings files.

Alternative considered:

- Persist the last visited URL automatically. Rejected because it blurs configuration and browsing state, makes restart behavior harder to predict, and adds unnecessary state churn.

### 2. Reuse the managed navigation pipeline for arbitrary browsing

Arbitrary address entry will use the existing web-panel navigation path and safe-target validation instead of introducing a separate browser subsystem.

Why:

- The main process already owns navigation, loading state, and unsafe-target blocking.
- Reusing the same path keeps built-in and custom panels behaviorally aligned.
- It avoids creating a second set of rules for URL normalization and navigation errors.

Alternative considered:

- Launch arbitrary URLs externally or through a separate ad hoc browser panel. Rejected because it would split the user experience and bypass the managed panel lifecycle.

### 3. Treat custom web creation as creation of an enabled browser-like panel

The add-web flow will create a real enabled custom panel from the initial user-entered URL and open it immediately in navigation.

Why:

- The user expectation for "add web" is to get a usable page, not a placeholder that needs extra activation steps.
- Immediate open confirms that the URL was accepted and reduces setup friction.

Alternative considered:

- Create disabled or empty custom panels first and require a second configuration step. Rejected because it preserves the current scaffold feeling and works against the requested browser-like workflow.

### 4. Keep browser-style address entry distinct from saved configuration updates

The UI contract will support entering a temporary address for navigation without forcing that address to become the saved home URL unless the user explicitly saves configuration changes.

Why:

- This mirrors lightweight browser behavior while keeping configuration intentional.
- It fits the existing `homeUrl` plus `currentUrl` state model.

Alternative considered:

- Use one shared URL field for both navigation and persistence. Rejected because it makes every browse action double as a settings mutation.

## Risks / Trade-offs

- [Some sites refuse embedding with frame or security policies] → Surface load errors cleanly and let users edit or replace the URL without corrupting panel state.
- [Hostname-derived titles may be too generic] → Keep rename/edit flows part of the supported lifecycle.
- [Users may expect full browser features once arbitrary URLs are allowed] → Keep scope explicit: single managed panel with safe navigation, not a full browser product.
- [Address-entry UI changes may affect built-in panels] → Reuse the existing managed web-panel model and constrain the new browser-like expectations to custom panel behavior where needed.

## Migration Plan

- No data migration is required because the existing custom web-panel settings contract already persists `title`, `homeUrl`, `partition`, and `enabled`.
- Existing custom web panels remain valid and continue to reopen from their stored `homeUrl`.
- Rollback only requires reverting renderer and manager behavior; persisted settings stay backward-compatible with the prior model.

## Open Questions

None currently. The main product decision for this proposal is to keep `homeUrl` persisted and `currentUrl` runtime-only, which resolves the largest ambiguity in the browser-like workflow.
