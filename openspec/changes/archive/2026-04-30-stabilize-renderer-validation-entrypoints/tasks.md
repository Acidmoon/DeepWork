## 1. Introduce a shared renderer validation entrypoint

- [x] 1.1 Add a deterministic renderer validation build or output path while preserving explicit renderer URL override support for debugging
- [x] 1.2 Update browser-driven validation scripts to resolve the shared entrypoint instead of assuming a live localhost dev server

## 2. Define the internal alpha regression workflow

- [x] 2.1 Add or update scripts and documentation for the internal-alpha regression sequence across typecheck and all focused validation flows
- [x] 2.2 Make validation failures report missing entrypoints or stale prerequisites clearly

## 3. Verify deterministic validation behavior

- [x] 3.1 Re-run the focused validation set against the new deterministic entrypoint path
- [x] 3.2 Confirm deterministic fixtures and runtime stubs remain unchanged apart from entrypoint resolution
