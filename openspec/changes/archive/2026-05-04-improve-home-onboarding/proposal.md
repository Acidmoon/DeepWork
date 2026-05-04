## Why

The Home panel currently reports workspace status but does not give strong next-step guidance for first-run or return-to-work flows. Users with an active workspace or saved profiles still have to infer whether they should choose a workspace, continue current work, or reopen a saved environment.

## What Changes

- Add explicit onboarding states for no-workspace, active-workspace, and return-to-work flows on Home.
- Surface quick actions for choosing the current workspace and reopening a bounded set of saved workspace profiles.
- Keep profile administration in Settings rather than duplicating management flows on Home.
- Reuse existing workspace and settings state instead of introducing a separate onboarding data model.

## Capabilities

### New Capabilities

### Modified Capabilities

- `desktop-workbench-panels`: Home SHALL present actionable next steps for first-run and return-to-work states.
- `workspace-profile-management`: Home SHALL remain a lightweight quick-reentry surface while Settings stays the profile-administration surface.

## Impact

- Affects the Home panel renderer and the state it consumes from workspace and settings snapshots.
- May require focused renderer validation for no-workspace and quick-resume flows.
