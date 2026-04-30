# Terminal Behavior Validation

This flow checks the global terminal behavior settings exposed in Settings.

It verifies:

- scrollback, copy-on-selection, and multi-line paste confirmation preferences persist through settings IPC stubs
- terminal hosts receive synchronized behavior without starting or restarting the PTY
- copy-on-selection writes selected terminal text to the clipboard path
- canceling a confirmed multi-line paste prevents the write from reaching the managed PTY

Run from the repository root after a renderer build:

```powershell
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
npm run validate:terminal-behavior -w @ai-workbench/desktop
```
