## Context

The repository currently relies on TypeScript strict mode and focused validation flows for correctness. That catches type errors and product regressions, but it does not provide a quick static quality gate for formatting, common React/TypeScript pitfalls, or accidental style drift. The main process also initializes settings, workspace, web panel, and terminal managers in both initial startup and macOS-style activation paths, which creates a future maintenance risk whenever startup behavior changes.

The README is comprehensive and useful as a reference, but first-time setup requires scanning through a large document before reaching the smallest reliable command path. This change should make routine contribution and verification easier without changing runtime product behavior.

## Goals / Non-Goals

**Goals:**

- Add a root-level static quality gate that is fast enough for local use and explicit enough for release-readiness flows.
- Keep the existing `typecheck` and focused validations as the authoritative behavior checks.
- Refactor desktop runtime initialization so startup and activation share the same manager creation and synchronization path.
- Preserve package smoke behavior, startup workspace profile resolution, settings synchronization, terminal workspace root synchronization, and manager disposal semantics.
- Add concise onboarding documentation for install, typecheck, dev startup, and validation entrypoints.

**Non-Goals:**

- Replacing the existing validation suite with a single broad E2E test.
- Reformatting the entire codebase unless required by the selected formatter gate.
- Changing app startup behavior, default workspace selection, or manager public APIs.
- Moving large main-process modules into new packages.
- Rewriting README content that is still accurate.

## Decisions

1. Prefer a small, conventional quality gate.

   The implementation should choose tooling that fits the existing TypeScript, React, Electron, and npm workspace setup. A root `npm run lint` or `npm run quality` should be available, and any formatter check should be deterministic on Windows. The alternative is relying only on `tsc`, but that misses style and many static correctness issues.

2. Keep behavior validation separate from static quality checks.

   Static quality gates should run before or alongside existing focused validation commands, not replace them. This preserves the current validation architecture and avoids making lint failures look like product-flow failures.

3. Extract runtime initialization into a local main-process helper boundary.

   `apps/desktop/src/main/index.ts` should expose or contain a shared initialization helper that creates the window, settings manager, workspace manager, web panel manager, terminal manager, IPC handlers, and disposal/activation wiring in one path. The alternative is extracting a large new module immediately, but a local helper first reduces risk while eliminating duplicated logic.

4. Keep onboarding concise and linked to full reference docs.

   The quickstart should show the shortest safe path: install, typecheck, dev, focused validation, and release preflight pointers. The existing README can remain the detailed source of truth, with a short top-level quickstart section or separate `docs/quickstart.md` linked from README.

## Risks / Trade-offs

- Adding lint or format tooling can introduce noisy first-run failures. Mitigation: configure it narrowly around existing source files and avoid broad repo rewrites unless necessary.
- Refactoring startup can accidentally change initialization ordering. Mitigation: preserve current ordering in the shared helper and run typecheck, renderer entrypoint, security-boundary, visual smoke, and package smoke where relevant.
- A quickstart can become stale if commands change. Mitigation: reference root package scripts instead of duplicating low-level command chains wherever possible.
