## ADDED Requirements

### Requirement: Deterministic renderer validation entrypoint
The repository SHALL provide a deterministic renderer validation entrypoint that browser-driven validation flows can open without requiring a separately started localhost dev server.

#### Scenario: Prepare the shared renderer validation entrypoint
- **WHEN** a developer prepares to run a browser-driven desktop validation flow
- **THEN** the repository can produce or locate a shared renderer entrypoint from repo-owned assets
- **THEN** the validation flow does not depend on a manually started `http://localhost:5173` server

#### Scenario: Allow explicit renderer URL overrides for debugging
- **WHEN** a developer explicitly provides a validation renderer URL override for debugging
- **THEN** the browser-driven validation flows accept that override
- **THEN** the default documented path remains the deterministic repo-managed entrypoint

### Requirement: Internal alpha regression workflow
The repository SHALL document and script the internal-alpha regression workflow that combines renderer typechecking, retrieval-helper validation, and browser-driven panel-validation flows.

#### Scenario: Run the documented internal alpha regression workflow
- **WHEN** a developer follows the documented alpha regression workflow
- **THEN** the workflow includes the precheck and validation commands for retrieval-helper, workspace browsing, managed web capture, custom web panels, and terminal panel configuration
- **THEN** failures report missing entrypoints or stale validation prerequisites with actionable guidance
