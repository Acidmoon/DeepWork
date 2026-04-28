# desktop-module-boundaries Specification

## Purpose
Define the module boundaries for large desktop renderer and workspace-management code so structural refactors can preserve current behavior while reducing ownership overlap and validation risk.
## Requirements
### Requirement: Panel content delegates by focused module boundary
The renderer SHALL keep `PanelContent` as the stable panel-kind dispatch entrypoint while moving panel-specific rendering and workspace-specific helper logic into focused sibling modules instead of one monolithic component file.

#### Scenario: Dispatch panel rendering through dedicated modules
- **WHEN** the renderer resolves a panel's `definition.kind`
- **THEN** `PanelContent` delegates rendering to a dedicated module for that panel kind
- **THEN** unrelated panel implementations are not inlined inside the dispatcher

#### Scenario: Keep workspace browsing helpers scoped to the workspace panel area
- **WHEN** the workspace panel needs query filtering, session summarization, preview parsing, or workspace-only formatting helpers
- **THEN** those concerns are owned by workspace-focused modules adjacent to the workspace panel
- **THEN** non-workspace panel modules do not depend on those workspace-specific helpers

### Requirement: Workspace manager remains a facade over focused helper modules
The main process SHALL keep `WorkspaceManager` as the stable orchestration facade for workspace operations while delegating deterministic helper responsibilities into focused modules for managed workspace content, clipboard detection, artifact persistence, context-index writing, retrieval-audit synchronization, and snapshot assembly.

#### Scenario: Preserve public workspace manager contracts during extraction
- **WHEN** the desktop app invokes existing `WorkspaceManager` public methods
- **THEN** those method signatures remain available through the `WorkspaceManager` facade
- **THEN** the extracted implementation preserves the current workspace snapshot and artifact content payload shapes

#### Scenario: Persist artifacts and indexes through extracted helpers
- **WHEN** the workspace manager saves clipboard, terminal, web, or retrieval-audit content
- **THEN** artifact persistence and context-index/origin-manifest updates flow through focused helper modules
- **THEN** the refactor does not require changing existing callers to understand the new internal file layout

### Requirement: Structural desktop refactors remain validation-backed
Large renderer and workspace-management module splits SHALL remain guarded by the existing desktop validation flows so structural extraction does not silently alter current behavior.

#### Scenario: Revalidate after module extraction
- **WHEN** a structural refactor changes the module layout behind `PanelContent` or `WorkspaceManager`
- **THEN** developers can rerun desktop typecheck and the relevant existing validation commands against the refactored code
- **THEN** the structural change is only considered complete when those checks still pass
