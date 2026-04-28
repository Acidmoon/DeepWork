## MODIFIED Requirements

### Requirement: Scripted verification of critical workspace interactions
The repository SHALL provide a scripted validation path for the critical workspace interactions introduced in the desktop application, including renderer-side workspace browsing and the managed web capture plus Workspace Sync flow.

#### Scenario: Verify search and preview behavior
- **WHEN** the scripted validation runs against the desktop renderer workspace panel
- **THEN** it verifies metadata query filtering over session and artifact results
- **THEN** it verifies artifact preview rendering for text-compatible markdown, JSON, and log artifacts
- **THEN** it verifies that artifact checkbox selection does not implicitly change the preview target

#### Scenario: Verify managed web capture through workspace resync
- **WHEN** the scripted validation runs a deterministic web conversation capture scenario
- **THEN** it triggers the same Workspace Sync or `workspace:resync` path used by the product
- **THEN** it verifies that conversation-like web content is persisted into workspace-managed artifacts
- **THEN** it verifies that the refreshed workspace snapshot exposes the captured context through normal workspace browsing data

### Requirement: Regression validation documentation
The repository SHALL document how to execute the workspace regression validation flows together with the required prechecks, including the managed web capture and Workspace Sync coverage.

#### Scenario: Run documented validation workflow
- **WHEN** a developer follows the documented regression-validation workflow
- **THEN** the workflow includes renderer typechecking as a required precheck
- **THEN** the workflow includes the exact command path needed to execute the browser-driven validation
- **THEN** the workflow distinguishes the existing workspace browsing validation from the managed web capture resync validation when they run as separate scripts
