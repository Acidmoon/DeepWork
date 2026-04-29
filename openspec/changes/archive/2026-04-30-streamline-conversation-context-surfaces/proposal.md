## Why

DeepWork already has the right backend ingredients for continuity: workspace-managed artifacts, thread-aware retrieval, retrieval audits, and managed web or CLI sessions. The current documentation gap is product direction. If the next UI step keeps pushing users into Workspace rows, preview panes, and artifact action buttons before they can continue a conversation, the system becomes more explicit and more fragile than the workflow we actually want.

The intended experience is simpler:

- users keep working from a web conversation or CLI conversation by default
- the system infers relevant context from active thread, session scope, and lightweight mentions
- Workspace remains available for inspection, debugging, and recovery, but does not become a control-heavy prerequisite

## What Changes

- Preserve lightweight continuity metadata for managed web and CLI panels using already indexed workspace metadata, without adding dedicated current-thread or current-session bars to those primary surfaces.
- Keep Workspace inspection available, but explicitly secondary to the active conversation surfaces.
- Standardize selected-scope detail ordering around conversation-first inspection instead of row-level action clutter.
- Align validation and product-facing copy with a dialogue-first continuity model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-workbench-panels`: keep managed web and CLI panels as the primary continuity surfaces while moving continuity handling into panel state instead of extra panel chrome.
- `workspace-context-management`: keep Workspace inspection secondary while preserving searchable, previewable audit access to saved artifacts and scopes.

## Impact

- Affected code: renderer continuity surfaces for managed web and CLI panels, workspace snapshot shaping, workspace copy, and any panel-state helpers that expose continuity metadata.
- Affected systems: workspace summary payloads, secondary inspection behavior, and focused renderer validation coverage.
- Validation impact: workspace regression fixtures and assertions should cover continuity-metadata plumbing, the absence of deprecated panel continuity chrome, and the continued separation between primary conversation flow and secondary Workspace inspection.
