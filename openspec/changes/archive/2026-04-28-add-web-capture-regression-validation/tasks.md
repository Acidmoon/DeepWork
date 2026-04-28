## 1. Validation Harness

- [x] 1.1 Review the existing desktop validation assets and choose the smallest reusable harness for a managed web capture regression flow.
- [x] 1.2 Add deterministic validation inputs for conversation-like web content and the expected persisted workspace outcomes without depending on a live third-party site.
- [x] 1.3 Wire a scripted validation path that exercises the real Workspace Sync or `workspace:resync` entry and waits for workspace snapshot changes.

## 2. Coverage Assertions

- [x] 2.1 Assert that the validation flow persists conversation-like web content into workspace-managed artifacts after resync.
- [x] 2.2 Assert that the refreshed workspace snapshot exposes the captured context through normal workspace browsing metadata.
- [x] 2.3 Keep the validation scope explicit by checking the managed web capture and manual resync path without broad provider-specific compatibility assertions.

## 3. Documentation And Verification

- [x] 3.1 Document how to run the managed web capture regression validation, including required prechecks and the exact command path.
- [x] 3.2 Update any validation index or README content so developers can distinguish the existing workspace browsing regression flow from the new web capture resync flow.
- [x] 3.3 Run the required typecheck and the new validation flow, then record any follow-up fixes needed to keep the change apply-ready.
