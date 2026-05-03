## Why

The current Workspace and Logs surfaces expose the right underlying data, but the information hierarchy is still hard to scan. Users have to infer the primary reading path from repeated summaries, shared layouts, and mode names that do not clearly distinguish conversational inspection from raw log inspection.

## What Changes

- Restructure Workspace inspection so the primary reading path is explicit: filter context first, then source/session list, then selected detail, then preview.
- Give Logs its own clearer inspection framing so log-oriented browsing no longer feels like a lightly relabeled Workspace screen.
- Reduce duplicate summaries and demote repair or technical sections so the main inspection surfaces stay focused on audit and recovery tasks.
- Strengthen selected-state, labels, and empty-state copy so users can immediately tell what is selected, what pane they are reading, and what action is expected next.
- Extend regression coverage to protect the revised hierarchy, mode distinction, and preview behavior.

## Capabilities

### New Capabilities

### Modified Capabilities
- `desktop-workbench-panels`: Secondary Workspace and Logs surfaces need clearer hierarchy, mode framing, and reduced competition from advanced controls.
- `workspace-context-management`: Workspace inspection requirements need to distinguish source selection, conversation detail, artifact inventory, and log inspection semantics more explicitly.
- `desktop-regression-validation`: Renderer validation needs to cover the clarified Workspace versus Logs layouts and the revised inspection reading flow.

## Impact

- Affects renderer Workspace panel structure, labels, and state presentation for both Workspace and Logs views.
- Affects shared styling for inspection grids, list rows, selected states, and preview surfaces.
- Affects workspace regression fixtures and assertions, but does not change workspace persistence formats, APIs, or retrieval rules.
