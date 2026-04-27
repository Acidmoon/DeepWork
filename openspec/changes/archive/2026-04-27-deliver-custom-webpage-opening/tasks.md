## 1. Reframe the web-panel entry flow

- [x] 1.1 Update desktop web-panel copy, summaries, and reserved-state messaging so generic custom webpage opening is the primary delivered capability and MiniMax is treated as an optional target.
- [x] 1.2 Review built-in web panel defaults and navigation metadata to remove MiniMax-only rollout assumptions that conflict with the generic custom-web workflow.

## 2. Complete the custom web-panel lifecycle

- [x] 2.1 Ensure the add-web flow persists normalized custom web panel definitions with title, section, URL, partition, and enabled state, then opens the new panel immediately from navigation.
- [x] 2.2 Align renderer store hydration and main-process synchronization so custom web panels are restored from settings on startup and stay consistent through rename, delete, and settings updates.
- [x] 2.3 Ensure custom web panels follow the managed web-panel contract for enable, disable, reserved snapshots, persisted partitions, and safe navigation handling.

## 3. Validate the delivered custom webpage behavior

- [x] 3.1 Verify the in-panel configuration flow correctly saves edited custom web URLs, partition values, and enabled state without breaking reopen behavior.
- [x] 3.2 Add or update regression coverage or manual validation notes for creating, opening, restarting, disabling, re-enabling, and deleting custom web panels.
