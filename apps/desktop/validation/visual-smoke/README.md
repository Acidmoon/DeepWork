# Visual Smoke Validation

This flow protects the modern minimal renderer redesign from blank primary surfaces, overlapping controls, clipped workbench chrome, and theme regressions.

It boots the deterministic renderer entrypoint with mocked shell APIs, opens representative Web, Terminal, Workspace, and Settings surfaces, toggles dark mode through Settings, and repeats Web inspector checks at a constrained viewport. Screenshots are written to `artifacts/` for review:

- `web-light.png`
- `web-inspector-light.png`
- `terminal-inspector-light.png`
- `workspace-light.png`
- `settings-dark.png`
- `web-constrained-dark.png`
- `settings-dark-zh.png`

Run it after refreshing the deterministic renderer build:

```powershell
npm run build -w @ai-workbench/desktop
npm run validate:visual-smoke -w @ai-workbench/desktop
```
