## MODIFIED Requirements

### Requirement: Scripted verification of critical desktop interactions
The repository SHALL provide scripted validation paths for the critical desktop interactions introduced in the application, including renderer-side workspace inspection, conversation-first selected-scope detail, managed web capture plus Workspace Sync, CLI retrieval helper behavior, managed panel configuration persistence flows, workspace profile persistence and switching, terminal behavior settings persistence, and the absence of deprecated current-session chrome on primary managed surfaces.

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

#### Scenario: Verify workspace profile flows
- **WHEN** the scripted validation runs against workspace profile behavior
- **THEN** it verifies profile creation or update from a selected workspace root
- **THEN** it verifies opening a saved profile updates the active workspace snapshot and settings state
- **THEN** it verifies marking a default profile affects startup root resolution
- **THEN** it verifies a fresh unprofiled state does not create workspace files implicitly

#### Scenario: Verify terminal behavior settings
- **WHEN** the scripted validation runs against terminal behavior settings
- **THEN** it verifies scrollback, copy-on-selection, and paste-confirmation controls persist through the settings update flow
- **THEN** it verifies terminal panel state receives the synchronized behavior settings without requiring a PTY restart

### Requirement: Internal alpha regression workflow
The repository SHALL document and script the internal-alpha regression workflow that combines renderer typechecking, retrieval-helper validation, and browser-driven panel-validation flows.

#### Scenario: Run the documented internal alpha regression workflow
- **WHEN** a developer follows the documented alpha regression workflow
- **THEN** the workflow includes the precheck and validation commands for retrieval-helper, workspace browsing, managed web capture, custom web panels, terminal panel configuration, terminal behavior settings, and workspace profiles
- **THEN** failures report missing entrypoints or stale validation prerequisites with actionable guidance

### Requirement: Regression validation documentation
The repository SHALL document how to execute the focused regression validation flows together with the required prechecks, including workspace inspection, managed web capture, retrieval-helper, managed-panel configuration, workspace profile, and terminal behavior settings coverage where applicable.

#### Scenario: Run documented validation workflow
- **WHEN** a developer follows the documented regression-validation workflow
- **THEN** the workflow includes renderer typechecking as a required precheck
- **THEN** the workflow includes the exact command path needed to execute each documented validation flow
- **THEN** the workflow distinguishes the workspace inspection, managed web capture resync, retrieval-helper, panel-configuration, workspace-profile, and terminal-behavior flows when they run as separate scripts
