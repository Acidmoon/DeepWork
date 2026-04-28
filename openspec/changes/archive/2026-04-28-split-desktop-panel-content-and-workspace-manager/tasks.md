## 1. Extract renderer panel modules

- [x] 1.1 Create a renderer module layout that keeps `src/renderer/src/panel-content.tsx` as the stable dispatcher entrypoint while adding focused sibling modules for panel implementations.
- [x] 1.2 Extract the `home`, `web`, `terminal`, `tool`, and `settings` panel renderers into dedicated modules without changing their current UI behavior or store interactions.
- [x] 1.3 Extract the workspace panel into its own module and move workspace-only search/filter, session summary, preview parsing, and presentation helpers into adjacent workspace-focused modules.

## 2. Extract workspace manager helper modules

- [x] 2.1 Move managed workspace/rules document content and related instruction-file synchronization helpers out of `src/main/workspace-manager.ts` into focused helper modules.
- [x] 2.2 Move clipboard payload detection, markdown/html classification, and other deterministic artifact-content helpers into focused helper modules.
- [x] 2.3 Move artifact persistence, snapshot assembly, context-index/origin-manifest writing, and retrieval-audit synchronization logic into focused helper modules while keeping `WorkspaceManager` as the public facade.

## 3. Rewire facades and preserve contracts

- [x] 3.1 Trim `panel-content.tsx` so it only dispatches by panel kind and delegates to the extracted modules.
- [x] 3.2 Trim `workspace-manager.ts` so it coordinates workspace-root state, last-saved/error tracking, and public method flow through the extracted helper modules.
- [x] 3.3 Confirm that renderer imports, preload call sites, `WorkspaceManager` public methods, workspace snapshot shapes, and persisted artifact/index formats remain unchanged after the split.

## 4. Validate the structural refactor

- [x] 4.1 Run `npm run typecheck`.
- [x] 4.2 Run `npm run validate:workspace-retrieval`.
- [x] 4.3 Run `npm run validate:workspace-regression`.
- [x] 4.4 Run `npm run validate:workspace-web-capture`.
- [x] 4.5 Run `npm run validate:custom-web-panels`.
