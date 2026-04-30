# desktop-regression-validation Specification

## Purpose
Define the repeatable validation assets, scripted regression flows, and execution guidance that protect critical desktop workspace, retrieval, and managed panel continuity behavior from regressions.

## Requirements
### Requirement: Repeatable desktop regression validation assets
The repository SHALL provide repeatable validation assets for focused desktop validation flows without requiring a live user workspace or ad hoc inline scripting.

#### Scenario: Load deterministic workspace fixtures
- **WHEN** a developer runs the workspace regression validation flow
- **THEN** the validation uses repo-owned fixture data for workspace snapshot metadata and artifact contents
- **THEN** the flow does not depend on the operator's current local workspace records under `Documents`

#### Scenario: Run panel validation against stubbed runtime surfaces
- **WHEN** a developer runs a focused managed-panel validation flow
- **THEN** the validation can inject deterministic runtime stubs instead of requiring a live Electron main-process session
- **THEN** the pass or fail result remains reproducible from repo-owned assets and scripted assertions

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

### Requirement: Scripted verification of critical desktop interactions
The repository SHALL provide scripted validation paths for the critical desktop interactions introduced in the application, including renderer-side workspace inspection, conversation-first selected-scope detail, managed web capture plus Workspace Sync, CLI retrieval helper behavior, managed panel configuration persistence flows, and the absence of deprecated current-session chrome on primary managed surfaces.

#### Scenario: Verify secondary workspace inspection behavior
- **WHEN** the scripted validation runs against the desktop renderer workspace panel
- **THEN** it verifies metadata query filtering over session and artifact results
- **THEN** it verifies structured conversation detail is prioritized before lower-level log or file fallback when selected-scope data permits
- **THEN** it verifies artifact preview rendering for text-compatible markdown, JSON, and log artifacts
- **THEN** it verifies that secondary inspection selections do not implicitly rewrite the continuity or preview state promised elsewhere in the UI

#### Scenario: Verify managed web capture through workspace resync
- **WHEN** the scripted validation runs a deterministic web conversation capture scenario
- **THEN** it triggers the same Workspace Sync or `workspace:resync` path used by the product
- **THEN** it verifies that conversation-like web content is persisted into workspace-managed artifacts
- **THEN** it verifies that the refreshed workspace snapshot exposes the captured context through normal workspace browsing data

#### Scenario: Verify primary managed panels stay free of deprecated continuity chrome
- **WHEN** the scripted validation opens managed web or CLI panels after workspace and thread state changes
- **THEN** it confirms those primary surfaces do not render the removed current-session continuity bar or workspace-jump action row
- **THEN** linked continuity metadata can still persist across panel and thread state changes underneath that UI simplification

#### Scenario: Verify CLI retrieval helpers and audit persistence
- **WHEN** the scripted validation runs against the managed workspace retrieval helpers
- **THEN** it verifies scope-ranking behavior and retrieval-audit persistence using a deterministic workspace fixture
- **THEN** the flow does not require a live operator workspace to confirm those retrieval contracts

#### Scenario: Verify managed panel configuration flows
- **WHEN** the scripted validation runs against managed panel configuration surfaces
- **THEN** it verifies persisted configuration synchronization for the targeted panel workflow
- **THEN** it verifies any explicit restart-to-apply or reserved-state behavior that the product promises for that workflow

### Requirement: Internal alpha regression workflow
The repository SHALL document and script the internal-alpha regression workflow that combines renderer typechecking, retrieval-helper validation, and browser-driven panel-validation flows.

#### Scenario: Run the documented internal alpha regression workflow
- **WHEN** a developer follows the documented alpha regression workflow
- **THEN** the workflow includes the precheck and validation commands for retrieval-helper, workspace browsing, managed web capture, custom web panels, and terminal panel configuration
- **THEN** failures report missing entrypoints or stale validation prerequisites with actionable guidance

### Requirement: Regression validation documentation
The repository SHALL document how to execute the focused regression validation flows together with the required prechecks, including workspace inspection, managed web capture, retrieval-helper, and managed-panel configuration coverage where applicable.

#### Scenario: Run documented validation workflow
- **WHEN** a developer follows the documented regression-validation workflow
- **THEN** the workflow includes renderer typechecking as a required precheck
- **THEN** the workflow includes the exact command path needed to execute each documented validation flow
- **THEN** the workflow distinguishes the workspace inspection, managed web capture resync, retrieval-helper, and panel-configuration flows when they run as separate scripts
