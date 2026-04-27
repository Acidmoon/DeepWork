## ADDED Requirements

### Requirement: Repeatable workspace regression validation assets
The repository SHALL provide repeatable validation assets for the desktop renderer workspace flow without requiring a live user workspace or manual inline scripting.

#### Scenario: Load deterministic workspace fixtures
- **WHEN** a developer runs the workspace regression validation flow
- **THEN** the validation uses repo-owned fixture data for workspace snapshot metadata and artifact contents
- **THEN** the flow does not depend on the operator's current local workspace records under `Documents`

### Requirement: Scripted verification of critical workspace interactions
The repository SHALL provide a scripted validation path for the critical workspace search and preview interactions introduced in the renderer.

#### Scenario: Verify search and preview behavior
- **WHEN** the scripted validation runs against the desktop renderer workspace panel
- **THEN** it verifies metadata query filtering over session and artifact results
- **THEN** it verifies artifact preview rendering for text-compatible markdown, JSON, and log artifacts
- **THEN** it verifies that artifact checkbox selection does not implicitly change the preview target

### Requirement: Regression validation documentation
The repository SHALL document how to execute the workspace regression validation flow together with the required prechecks.

#### Scenario: Run documented validation workflow
- **WHEN** a developer follows the documented regression-validation workflow
- **THEN** the workflow includes renderer typechecking as a required precheck
- **THEN** the workflow includes the exact command path needed to execute the browser-driven validation
