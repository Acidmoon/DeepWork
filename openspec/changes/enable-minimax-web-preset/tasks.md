## 1. Built-in Web Panel Defaults

- [x] 1.1 Update the built-in MiniMax web panel catalog entry to be enabled by default with a safe HTTPS home URL and persistent partition.
- [x] 1.2 Refresh navigation and panel copy so MiniMax reads as an available optional preset rather than a reserved placeholder.
- [x] 1.3 Ensure persisted user overrides for MiniMax enabled state, home URL, and partition still take precedence over defaults.

## 2. Runtime Integration

- [x] 2.1 Verify the main-process web panel manager mounts MiniMax through the same managed `WebContentsView` path as other enabled web panels.
- [x] 2.2 Confirm disabling MiniMax from the configuration surface returns it to the explicit reserved snapshot behavior.
- [x] 2.3 Confirm browser-like navigation in MiniMax does not overwrite saved home URL unless configuration is explicitly saved.

## 3. Validation

- [x] 3.1 Add focused validation coverage for opening, navigating, disabling, re-enabling, and restoring the MiniMax built-in panel.
- [x] 3.2 Run `npm run validate:custom-web-panels` or the updated web-panel validation command.
- [x] 3.3 Run `npm run typecheck` and `npx openspec validate --all --strict`.
