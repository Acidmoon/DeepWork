## 1. Static Quality Gate

- [ ] 1.1 Select lint and/or format tooling that fits the existing TypeScript, React, Electron, and npm workspace setup without broad unrelated rewrites.
- [ ] 1.2 Add root and desktop package scripts for the static quality gate.
- [ ] 1.3 Add any required lint/format configuration files with scoped source globs for app, package, and validation code.
- [ ] 1.4 Confirm the new quality command reports actionable file/rule failures and can pass on the current intended source set.

## 2. Shared Desktop Runtime Initialization

- [ ] 2.1 Extract the repeated settings, workspace, web panel, terminal, package-smoke, and disposal setup in `apps/desktop/src/main/index.ts` into a shared initialization helper or local orchestration boundary.
- [ ] 2.2 Update initial `app.whenReady()` startup to use the shared initialization path while preserving current startup workspace resolution.
- [ ] 2.3 Update `app.on('activate')` to use the same shared initialization path when no windows exist.
- [ ] 2.4 Preserve existing IPC handler names, preload API behavior, manager public method calls, and terminal workspace-root synchronization.
- [ ] 2.5 Preserve manager disposal and reference clearing when the main window closes.

## 3. Onboarding and Validation Documentation

- [ ] 3.1 Add a concise quickstart section or `docs/quickstart.md` covering install, typecheck, static quality, dev startup, and focused validation entrypoints.
- [ ] 3.2 Link the concise quickstart from the README while keeping detailed workspace, validation, and packaging documentation available.
- [ ] 3.3 Update desktop validation documentation to show where the static quality gate fits relative to typecheck and focused validation.
- [ ] 3.4 Update release-readiness guidance so the static quality gate is included before packaging or package smoke validation.

## 4. Validation

- [ ] 4.1 Run the new static quality command.
- [ ] 4.2 Run `npm run typecheck`.
- [ ] 4.3 Run `npm run build`, `npm run validate:renderer-entrypoint`, and `npm run validate:visual-smoke` after the initialization refactor.
- [ ] 4.4 Run `npm run validate:security-boundaries` to confirm startup and boundary assumptions remain intact.
- [ ] 4.5 Run package validation or document why package smoke is deferred if no fresh Windows package artifact is generated.
- [ ] 4.6 Run `npx openspec validate --all --strict`.
