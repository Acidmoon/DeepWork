## ADDED Requirements

### Requirement: Packaged archive boundary validation
The repository SHALL provide repeatable package validation that inspects generated Windows alpha and beta `app.asar` archives before packaged startup smoke checks run.

#### Scenario: Inspect packaged archive contents
- **WHEN** a developer runs the documented alpha or beta packaged-app validation command after packaging
- **THEN** the validation lists `resources/app.asar` contents through a repo-owned deterministic mechanism
- **THEN** the validation applies the documented forbidden development-artifact boundary checks to the listed archive entries

#### Scenario: Report unreadable archive diagnostics
- **WHEN** the packaged-app validation cannot list the generated `app.asar` archive
- **THEN** the validation fails before startup smoke checks
- **THEN** the failure includes the package channel and archive path or underlying archive-listing error needed to diagnose the preflight failure

#### Scenario: Exclude development-only packaged inputs
- **WHEN** a Windows alpha or beta package is generated
- **THEN** the package excludes workspace-package source trees, dependency source trees, test files, logs, validation assets, and native build scaffolding from the packaged runtime artifact
- **THEN** the package preserves runtime application output, runtime JavaScript dependencies, and Windows native prebuilds needed by managed terminal panels
