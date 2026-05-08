## Why

`npm run dev` 后 Electron 窗口显示白屏，渲染进程未能正常挂载 React 应用。当前 typecheck、build、renderer-entrypoint 和 renderer-startup 验证均通过，说明问题可能出在 dev 模式特有的 Vite dev server 与 Electron 主进程的交互环节，或渲染进程入口的运行时错误静默失败。

## What Changes

- 排查并修复 Electron 主进程在 dev 模式下加载 `ELECTRON_RENDERER_URL` 时的渲染进程挂载失败
- 确保 `src/renderer/index.html` 中的 `<script type="module" src="./src/main.tsx">` 在 Vite dev server 中正确服务
- 确保 `window.workbenchShell` (preload 暴露的 API) 在渲染进程初始化时可用
- 添加渲染进程初始化错误边界，避免 React 渲染失败时静默白屏
- 验证 CSS (`styles.css`) 在 dev 模式下正确加载

## Capabilities

### New Capabilities

- `renderer-startup-guard`: 渲染进程启动守卫，确保 React 挂载失败时有可见的错误提示而非白屏

### Modified Capabilities

- `desktop-module-boundaries`: 确保 preload 和 renderer 之间的类型/API 边界在 dev 模式下一致

## Impact

- 受影响文件：`apps/desktop/src/renderer/src/main.tsx`, `apps/desktop/src/renderer/index.html`, `apps/desktop/electron.vite.config.ts`
- 不影响现有验证流程 (typecheck, build, renderer-entrypoint, renderer-startup)
- 不影响 web-panel-manager、terminal-manager、workspace-manager 等核心业务逻辑
