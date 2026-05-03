## Context

The desktop app currently builds with `electron-vite build` and validates with `validate:internal-alpha`. That confirms source build and renderer behavior, but it does not produce an installable or portable Windows alpha artifact. The app also depends on `node-pty`, so packaging must account for native module rebuild behavior.

## Goals / Non-Goals

**Goals:**
- Add a repeatable Windows packaging command.
- Produce a packaged alpha artifact from the same build output used by validation.
- Keep generated output out of source control.
- Document preflight commands and expected output locations.
- Provide a smoke validation path for package readiness.

**Non-Goals:**
- Do not implement auto-update.
- Do not require code signing for internal alpha.
- Do not publish releases to GitHub automatically.
- Do not package or migrate user workspaces.

## Decisions

- Use a standard Electron packaging tool rather than hand-copying build output.
  - Rationale: packaging must handle Electron metadata, native modules, platform-specific output, and exclusions consistently.
  - Alternative considered: zip the `out/` directory manually. That would not produce a reliable app layout and would miss native module concerns.
- Make package generation a separate command from `validate:internal-alpha`.
  - Rationale: developers should be able to validate source behavior without always generating large package artifacts.
  - Alternative considered: always package during internal alpha validation. That would slow every validation run.
- Add a release preflight that chains validation plus packaging when preparing an alpha.
  - Rationale: release preparation needs one documented command path with clear failure points.

## Risks / Trade-offs

- [Native module packaging may fail on machines without build tools] -> Mitigation: document prerequisites and keep `rebuild:native` available.
- [Package artifacts may accidentally enter git] -> Mitigation: add ignore rules and validation checks for output paths.
- [Unsigned Windows artifacts may show warnings] -> Mitigation: document unsigned internal-alpha status and keep signing out of scope.
