## Context

Home is currently a lightweight status page that shows the active workspace, counts, and thread status. That keeps the surface quiet, but it also means a new or returning user gets little guidance about what action to take next. The product already stores enough data to improve this without inventing a new onboarding subsystem.

## Goals / Non-Goals

**Goals:**

- Make Home immediately actionable for first-run and return-to-work scenarios.
- Reuse existing workspace profile and active-thread data.
- Keep Home lighter than Settings and Workspace.

**Non-Goals:**

- Turning Home into a full workspace profile management screen.
- Adding a new persistence model just for onboarding.
- Replacing Web or CLI panels as the primary work surfaces.

## Decisions

- Render Home as a stateful action surface with distinct empty, active, and reentry states.
  Rationale: the correct next step depends on whether a workspace is selected and whether saved profiles exist.
- Show only a bounded set of quick-open workspace profile shortcuts.
  Rationale: Home should help users re-enter work quickly without duplicating the full profile list from Settings.
- Keep workspace profile administration in Settings.
  Rationale: rename, remove, and default-selection behaviors are app preferences, not day-to-day launch actions.

## Risks / Trade-offs

- [Risk] Home can become crowded if too many shortcuts are shown. -> Mitigation: cap the quick-open list and prioritize the default or most recently used profiles.
- [Risk] Missing or stale profile roots could create noisy failure states on Home. -> Mitigation: reuse the existing profile-open error path instead of inventing a new one.
