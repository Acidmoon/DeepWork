## ADDED Requirements

### Requirement: Windows distribution preflight validation
The repository SHALL document or script a Windows distribution preflight path that combines internal-alpha validation with package generation and a packaged-app smoke check.

#### Scenario: Run release preflight
- **WHEN** a developer prepares a Windows alpha distribution
- **THEN** the documented preflight includes `validate:internal-alpha` or an equivalent validated sequence before packaging
- **THEN** the preflight includes the Windows package command and expected output verification

#### Scenario: Smoke packaged renderer startup
- **WHEN** the packaged-app smoke step runs
- **THEN** it verifies the packaged app can reach the renderer shell
- **THEN** it verifies startup does not create a workspace implicitly when no workspace is configured
