## 1. Settings Model And Normalization

- [x] 1.1 Add typed global terminal behavior settings, defaults, update shape, and normalization helpers in the shared settings model.
- [x] 1.2 Update settings load/update paths so persisted terminal behavior is normalized and synchronized with renderer settings snapshots.
- [x] 1.3 Extend panel view-state defaults so Settings and Terminal panels receive the normalized terminal behavior state.

## 2. Settings UI

- [x] 2.1 Replace the `Terminal Behavior` placeholder with implemented Settings controls for scrollback, copy-on-selection, and multi-line paste confirmation.
- [x] 2.2 Add localized labels, descriptions, and validation/error copy for terminal behavior controls.
- [x] 2.3 Preserve existing panel-level terminal configuration in Terminal details and avoid duplicating shell/startup fields in Settings.

## 3. Terminal Runtime Behavior

- [x] 3.1 Apply scrollback settings to mounted xterm instances and update terminal options when settings change.
- [x] 3.2 Implement copy-on-selection handling through the renderer clipboard path with safe fallback behavior.
- [x] 3.3 Implement multi-line paste confirmation so canceled paste events do not write text to the managed PTY session.
- [x] 3.4 Ensure settings changes do not restart or recreate running PTY sessions.

## 4. Validation And Documentation

- [x] 4.1 Add focused renderer validation for terminal behavior settings persistence and terminal panel synchronization.
- [x] 4.2 Update validation scripts, package commands, README, and internal alpha documentation so terminal behavior coverage is discoverable.
- [x] 4.3 Run `npm run typecheck`, relevant terminal validation flows, and `openspec validate --all --strict --json`.
