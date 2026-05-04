## Context

The product already passes correctness and visual checks, but the renderer bundle is large enough that startup optimization should be handled deliberately rather than incidentally. This is primarily a shaping problem: deciding what must be in the first-load path and what can be deferred without hurting the product model.

## Goals / Non-Goals

**Goals:**

- Reduce the initial renderer cost for startup.
- Preserve correctness and stable panel behavior.
- Add measurable expectations for startup optimization work.

**Non-Goals:**

- Rewriting the renderer stack or abandoning the current app architecture.
- Prematurely optimizing every component without startup evidence.
- Changing feature scope under the banner of performance.

## Decisions

- Treat startup performance as a first-load-path problem.
  Rationale: the biggest gain usually comes from moving noncritical surfaces out of the initial bundle.
- Prefer bounded lazy loading for secondary surfaces or large modules where behavior allows it.
  Rationale: Home, Settings, and Workspace do not all need to block first paint equally.
- Pair optimization work with measurable validation or guardrails.
  Rationale: performance changes drift unless the repo records what is being protected.

## Risks / Trade-offs

- [Risk] Aggressive code splitting can introduce loading flashes or state timing bugs. -> Mitigation: limit deferral to surfaces that can tolerate staged loading and validate the resulting UX.
- [Risk] Performance work can become vague and unfinishable. -> Mitigation: require explicit bundle or startup baselines in the implementation plan.
