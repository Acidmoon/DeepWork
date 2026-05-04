## Context

Windows alpha packaging already exists and passes packaged smoke. Beta readiness is a different concern: it needs a more explicit contract about what is included, how packaged startup behaves, and what validation gates are required before broader testing. This should build on the alpha path instead of replacing it.

## Goals / Non-Goals

**Goals:**

- Define what beta-ready packaging must guarantee.
- Preserve current startup safety and settings normalization in packaged builds.
- Keep release validation explicit and repeatable.

**Non-Goals:**

- Final production distribution, code signing, or auto-update rollout.
- Cross-platform packaging in the same change.
- Reworking the Electron build pipeline unrelated to packaging readiness.

## Decisions

- Introduce beta distribution as a new capability rather than overloading the alpha one.
  Rationale: the product already has an alpha baseline, and beta readiness deserves a separate contract.
- Keep packaged startup behavior aligned with development behavior.
  Rationale: packaged mode should not create hidden workspace differences or bypass safety boundaries.
- Treat signing and installer strategy as follow-on hardening topics unless required by the chosen beta scope.
  Rationale: those are important, but they are separable from basic packaged-runtime correctness.

## Risks / Trade-offs

- [Risk] The change can become too broad if it tries to solve every release concern at once. -> Mitigation: scope it to packaging contract, packaged behavior, and validation gates.
- [Risk] Beta expectations may evolve after trial distribution. -> Mitigation: keep the capability explicit so later iterations can amend it cleanly.
