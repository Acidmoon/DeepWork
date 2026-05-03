## Context

The current Settings model still includes `SettingsOptionPlaceholder[]`, localized placeholder labels, and a renderer section for deferred preferences. Recent work implemented the preferences those placeholders originally represented, leaving `defaultSettingsPlaceholders` empty. The remaining UI path is dead weight unless a future change adds a real deferred preference contract.

## Goals / Non-Goals

**Goals:**
- Remove empty deferred Settings chrome from the default user experience.
- Keep all implemented Settings controls and persistence paths unchanged.
- Keep future deferred preferences possible by requiring an explicit non-empty placeholder definition before rendering that section.
- Update validation so it checks implemented controls rather than legacy placeholder text.

**Non-Goals:**
- Do not remove implemented terminal behavior, continuity, CLI retrieval, or workspace profile settings.
- Do not redesign the Settings layout beyond removing empty placeholder scaffolding.
- Do not change persisted settings file shape.

## Decisions

- Gate deferred Settings rendering on an explicit non-empty placeholder list.
  - Rationale: this is the smallest behavior change and avoids conflating "no deferred preferences" with "a hidden bug."
  - Alternative considered: remove the placeholder type entirely. That is cleaner long-term, but it would make future deferred preference experiments require a larger model reintroduction.
- Update tests to assert real implemented controls.
  - Rationale: validations should protect current product behavior, not historical placeholder labels.
  - Alternative considered: keep a hidden placeholder just for tests. That would preserve the wrong contract.
- Leave persisted settings untouched.
  - Rationale: placeholder metadata is not user configuration and does not need migration or rollback handling.

## Risks / Trade-offs

- [Future deferred preferences may need the placeholder surface again] -> Mitigation: keep the conditional rendering pattern and add entries through a future explicit spec.
- [Validation may have brittle text expectations] -> Mitigation: update focused assertions to target labels for implemented controls and the absence of empty deferred sections.
- [Removing copy could affect visual smoke screenshots] -> Mitigation: rerun renderer visual smoke and terminal behavior validation.
