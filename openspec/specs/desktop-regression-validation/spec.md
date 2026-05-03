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

### Requirement: Visual smoke validation for redesigned renderer surfaces
The repository SHALL provide validation guidance or checks that protect the modern minimal renderer redesign from blank surfaces, overlapping controls, clipped text, and broken primary work-surface framing.

#### Scenario: Validate representative desktop surfaces
- **WHEN** developers run the focused renderer validation set after the UI redesign
- **THEN** validation covers representative Web, Terminal, Workspace, and Settings surfaces against the deterministic renderer entrypoint
- **THEN** the checks confirm the primary canvas is nonblank and key toolbar/sidebar controls are visible

#### Scenario: Validate constrained viewport layout
- **WHEN** developers inspect or automate the redesigned renderer at constrained viewport widths
- **THEN** navigation, toolbar, forms, lists, drawers, and preview areas do not overlap or clip important text
- **THEN** validation evidence is captured through screenshots, DOM checks, or documented manual acceptance steps

### Requirement: Security and resource boundary validation
The repository SHALL provide repeatable validation coverage for workspace path confinement, main-process web-panel settings validation, malformed custom panel settings, and bounded terminal transcript persistence.

#### Scenario: Validate unsafe workspace artifact paths
- **WHEN** the focused validation runs with a workspace manifest containing artifact paths that escape the workspace root
- **THEN** read, overwrite, and delete operations do not access files outside the workspace root
- **THEN** valid in-workspace artifacts remain readable and indexable

#### Scenario: Validate unsafe web-panel settings
- **WHEN** the focused validation submits persisted or IPC-provided web-panel settings with unsupported URL schemes
- **THEN** unsafe web-panel targets are rejected or normalized out before a managed web panel can load them
- **THEN** valid HTTP and HTTPS panel settings continue to synchronize

#### Scenario: Validate malformed custom web-panel settings
- **WHEN** the focused validation loads malformed, duplicate, or built-in-colliding custom web-panel settings
- **THEN** settings normalization produces a deterministic safe snapshot
- **THEN** renderer and runtime panel synchronization do not crash

#### Scenario: Validate long terminal transcript behavior
- **WHEN** the focused validation simulates a long-running managed terminal session with repeated output and transcript flushes
- **THEN** transcript persistence remains bounded or chunked according to the implemented resource limit
- **THEN** terminal state, visible buffer behavior, and persisted transcript metadata remain consistent

### Requirement: Workspace session deselection regression validation
The repository SHALL provide repeatable validation coverage for clearing Workspace and Logs session selections through repeated row clicks.

#### Scenario: Validate repeated click deselection in artifact inspection
- **WHEN** the workspace regression validation selects the same session row twice in the artifact inspection flow
- **THEN** it verifies the second click clears the selected-source summary back to the unselected inspection state
- **THEN** it verifies any existing preview target remains available after the source selection is cleared

#### Scenario: Validate repeated click deselection in log inspection
- **WHEN** the workspace regression validation selects the same log-source row twice in the log inspection flow
- **THEN** it verifies the second click returns the log inspection source filter to the current all-sources state
- **THEN** it verifies the log list and preview behavior continue to work after deselection

### Requirement: Workspace and Logs hierarchy regression validation
The repository SHALL provide repeatable validation coverage for the clarified Workspace and Logs inspection hierarchy so semantic layout regressions are detectable before release.

#### Scenario: Validate Workspace inspection reading flow
- **WHEN** the workspace regression validation opens the Workspace inspection flow with deterministic fixture data
- **THEN** it verifies the flow distinguishes active filters, selected source detail, related records, and preview behavior through stable headings or state markers
- **THEN** it verifies the Workspace surface continues to prioritize conversation-oriented detail over lower-priority record browsing

#### Scenario: Validate Logs inspection reading flow
- **WHEN** the same regression validation opens the Logs inspection flow with deterministic fixture data
- **THEN** it verifies Logs exposes log-oriented headings, list states, and preview behavior distinct from conversation-first Workspace inspection
- **THEN** it verifies log browsing still supports deterministic source selection and preview assertions

