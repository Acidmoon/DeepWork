## Why

The project has accumulated several completed OpenSpec changes in the active change directory, and the desktop shell still exposes broad preload/IPC capabilities plus native browser prompts in core panel-management flows. Tightening these areas now reduces release-readiness ambiguity, narrows renderer-to-main attack surface, and makes custom panel management feel consistent with the rest of the app.

## What Changes

- Move fully completed OpenSpec changes out of the active change set through the normal archive flow so active changes represent only planned or in-progress work.
- Add runtime validation at preload/main IPC boundaries for high-impact desktop operations, including terminal writes, workspace mutations, web-panel navigation/configuration, settings updates, and clipboard saves.
- Review the main-window preload sandbox posture and either enable sandboxing or document and validate the remaining blocker with a focused security guardrail.
- Replace native `window.prompt` and destructive `window.confirm` panel-management flows with in-app controls that support explicit validation, cancel, save, and error states.
- Extend focused validation so security-boundary and renderer flows cover malformed IPC payloads and the new in-app custom panel create/delete flows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repo-configuration`: Active OpenSpec change directories must stay limited to genuinely active work, with completed changes archived through the normal workflow.
- `defensive-input-normalization`: Renderer-originated IPC payloads for desktop shell capabilities must be validated at runtime before they reach managers or filesystem/PTY operations.
- `settings-and-panel-extensibility`: Custom web and CLI panel creation, editing, and deletion must use in-app explicit management flows instead of native browser dialogs.
- `desktop-workbench-panels`: Workbench shell panel-management interactions must expose clear validation, cancel, save, and destructive-confirmation states in the renderer UI.
- `desktop-regression-validation`: Focused validation must cover OpenSpec active-change hygiene, IPC boundary rejection cases, and the replacement custom panel management flows.

## Impact

- OpenSpec artifacts under `openspec/changes/` and archived change locations.
- Main-process IPC handlers in `apps/desktop/src/main/index.ts` and manager-facing request shapes.
- Preload API exposed from `apps/desktop/src/preload/index.ts`.
- Renderer custom panel controls in `apps/desktop/src/renderer/src/App.tsx` and panel detail components.
- Security and renderer validation flows under `apps/desktop/validation/`.
