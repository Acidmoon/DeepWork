## 1. Core Domain Extraction

- [x] 1.1 Add dedicated `packages/core` desktop modules and exports for workspace continuity planning and managed workspace content templates.
- [x] 1.2 Define plain-data planner/template interfaces so the extracted core slice can be consumed without Electron, filesystem, or PTY dependencies.

## 2. Desktop Adapter Rewire

- [x] 2.1 Update `WorkspaceManager` to compose the extracted continuity planners while keeping manifest I/O, thread-record writes, and snapshot emission in `apps/desktop`.
- [x] 2.2 Update managed workspace content synchronization to consume core-owned protocol/instruction templates while keeping file-path selection and writes in the desktop shell.
- [x] 2.3 Preserve existing public desktop method signatures and runtime behavior while removing duplicated continuity-specific logic from desktop-only modules.

## 3. Validation

- [x] 3.1 Refresh any affected validation fixtures or checks so the structural extraction still exercises continuity and retrieval flows.
- [x] 3.2 Run desktop typecheck and the relevant workspace/retrieval validations after the extraction.
