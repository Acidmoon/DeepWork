## ADDED Requirements

### Requirement: Static quality gate is part of documented validation
The repository SHALL document where the static quality gate fits relative to typechecking, focused desktop validation, and release-readiness flows.

#### Scenario: Run focused validation prechecks
- **WHEN** a developer follows documented focused validation guidance
- **THEN** the guidance includes the static quality gate and typecheck as prechecks or companion checks
- **THEN** focused behavior validation commands remain listed separately

#### Scenario: Run release-readiness validation
- **WHEN** a developer follows documented release-readiness validation
- **THEN** the guidance includes the static quality gate before packaging or release smoke checks
- **THEN** package validation remains responsible for generated artifact and startup smoke behavior

### Requirement: Startup refactor regression coverage
The repository SHALL keep validation coverage that proves shared desktop runtime initialization preserves first startup, activation, renderer entrypoint, and package smoke behavior.

#### Scenario: Validate renderer startup after initialization refactor
- **WHEN** the runtime initialization path is refactored
- **THEN** renderer entrypoint and visual smoke validation still pass against the deterministic renderer build
- **THEN** the main window shell still loads without selecting or creating a workspace implicitly

#### Scenario: Validate package smoke after initialization refactor
- **WHEN** a Windows alpha or beta package is generated after the runtime initialization refactor
- **THEN** package validation still confirms first-launch unselected-workspace behavior
- **THEN** package smoke result scheduling continues to write the expected validation payload
