## 1. Settings And Model Updates

- [x] 1.1 Add persisted built-in terminal override types, defaults, and settings-manager normalization for supported built-in CLI fields.
- [x] 1.2 Update core terminal/panel models and renderer hydration so built-in and custom terminal configuration state can be synchronized from persisted settings.

## 2. Terminal Panel Configuration Delivery

- [x] 2.1 Replace the terminal panel's read-only details drawer with an editable configuration surface for built-in and custom CLI panels.
- [x] 2.2 Persist built-in CLI override saves and custom CLI configuration saves through the existing settings IPC flow and synchronize them into `TerminalManager`.
- [x] 2.3 Keep running PTY sessions stable after a save while making restart/apply behavior explicit for the updated terminal configuration.

## 3. Verification

- [x] 3.1 Add or refresh focused validation coverage for terminal panel configuration persistence and restart behavior.
- [x] 3.2 Run desktop typecheck and the relevant terminal/desktop validation flows after implementation.
