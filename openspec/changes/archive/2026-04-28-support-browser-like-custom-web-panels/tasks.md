## 1. Custom Web Creation Flow

- [x] 1.1 Update the renderer add-web flow so a user can create a custom web panel from any normalized HTTP or HTTPS URL and open it immediately.
- [x] 1.2 Align shared panel/settings state so custom web creation preserves a persisted `homeUrl` while keeping runtime browsing state separate.
- [x] 1.3 Surface invalid or unsafe custom web targets without persisting them as saved panel configuration.

## 2. Browser-Like Web Panel Behavior

- [x] 2.1 Update custom web panel UI so users can browse to arbitrary safe addresses without conflating address-bar navigation with saved home-page configuration.
- [x] 2.2 Ensure the main-process web panel manager loads arbitrary safe URLs, keeps snapshot navigation state in sync, and continues blocking unsafe targets.
- [x] 2.3 Preserve restart behavior so restored custom web panels reopen from their saved `homeUrl` rather than a transient browsing address.

## 3. Validation And Regression Coverage

- [x] 3.1 Add or update focused validation coverage for custom web panel creation, arbitrary safe navigation, and unsafe URL rejection.
- [x] 3.2 Re-run the relevant desktop checks and validation flows for custom web panels after implementation.
