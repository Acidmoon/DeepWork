## Context

DeepWork already supports live built-in web panels, persisted partitions, safe HTTP/HTTPS navigation, and user-defined custom web panels. MiniMax remains a reserved built-in slot, which means the product still shows a visible placeholder even though the underlying runtime can support it.

## Goals / Non-Goals

**Goals:**
- Turn MiniMax into an enabled built-in managed web panel by default.
- Reuse the existing managed web-panel lifecycle, configuration surface, and URL safety checks.
- Keep explicit user overrides backward-compatible.
- Validate MiniMax through deterministic stubs without requiring live MiniMax credentials.

**Non-Goals:**
- Do not build provider-specific scraping, authentication automation, or MiniMax API integrations.
- Do not change custom web panel behavior.
- Do not weaken safe navigation restrictions.

## Decisions

- Treat MiniMax as a normal built-in web panel.
  - Rationale: this matches DeepSeek and keeps built-in providers in one catalog.
  - Alternative considered: instruct users to add MiniMax as a custom web page. That works but leaves the reserved built-in navigation item misleading.
- Let user settings override defaults.
  - Rationale: existing built-in web-panel settings already support enabled state, home URL, and partition overrides.
  - Alternative considered: force-enable MiniMax. That would violate the reserved/disabled override contract.
- Validate with stubbed renderer and main-process state.
  - Rationale: focused validation should not depend on a live third-party web app.
  - Alternative considered: live-site validation. It would be flaky and credential-dependent.

## Risks / Trade-offs

- [MiniMax changes its public URL or availability] -> Mitigation: keep the home URL configurable through built-in panel settings.
- [Users who prefer no MiniMax panel may see it by default] -> Mitigation: preserve existing disable flow and reserved-state behavior after disable.
- [Validation may overfit to catalog labels] -> Mitigation: assert generic managed web lifecycle behavior plus the MiniMax panel ID.
