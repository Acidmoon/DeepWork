## Context

DeepWork 桌面应用使用 `electron-vite` 构建，dev 模式下 Electron 主进程通过 `ELECTRON_RENDERER_URL` 环境变量加载 Vite dev server 提供的渲染页面。用户报告 `npm run dev` 后 Electron 窗口白屏。

当前验证流程 (typecheck → build → renderer-entrypoint → renderer-startup) 全部通过，说明确定性构建产物 (`out/renderer/index.html`) 没有问题。白屏问题可能出在 dev 模式特有的链路：

1. **Vite dev server 就绪时序**：Electron 可能在 dev server 完全就绪前就尝试加载页面
2. **渲染进程入口错误静默失败**：React 挂载失败时只有白屏，没有可见的错误提示
3. **preload 暴露的 API 在 dev 模式下不可用**：`window.workbenchShell` 在 dev server 的 HMR 重载时可能丢失
4. **CSS 在 dev 模式下未正确注入**：Vite 将 CSS 作为 JS 模块处理，HMR 更新可能遗漏初始加载

## Goals / Non-Goals

**Goals:**
- 诊断并修复 `npm run dev` 后白屏的根因
- 添加渲染进程初始化错误边界，确保 React 挂载失败时显示可见错误提示而非白屏
- 确保 `window.workbenchShell` API 在渲染进程任何重载时机都可用

**Non-Goals:**
- 不修改 web-panel-manager、terminal-manager、workspace-manager 等核心业务逻辑
- 不改变确定性构建产物 (out/) 的结构
- 不引入新的外部依赖

## Decisions

### 1. 添加渲染进程 Root Error Boundary

在 `main.tsx` 的 `createRoot` 调用外层添加 try-catch 和 React Error Boundary。

**理由**：当前 `main.tsx` 中直接调用 `ReactDOM.createRoot(...).render(<App />)`，如果 App 组件或其依赖在初始化时抛出异常，渲染进程会静默失败，用户看到的只有白屏。添加错误边界后，异常会被捕获并显示在页面上，便于定位问题。

### 2. 添加 preload API 可用性检查

在 `main.tsx` 中，React 渲染前检查 `window.workbenchShell` 是否存在。如果不存在，显示明确提示而非让 App 组件在 useEffect 中失败。

**理由**：`App.tsx` 的 `useEffect` hooks 直接访问 `window.workbenchShell.webPanels.onStateChanged(...)` 等方法，如果 preload 未正确加载（这在 dev 模式下可能因为 Vite HMR 导致），会抛出 `TypeError: Cannot read properties of undefined`。

### 3. 检查 electron-vite dev server 配置

验证 `electron.vite.config.ts` 中 renderer 的 Vite 配置是否正确，特别是：
- HMR 配置是否与 Electron 的 `contextIsolation: true` 兼容
- CSS 处理是否正确

**替代方案考虑**：使用 `electron-vite` 的 `renderer.build` 模式替代 dev server，但这会失去 HMR，开发体验大幅下降。不采用。

## Risks / Trade-offs

- [风险] Error Boundary 可能掩盖某些异步错误 → 缓解：Error Boundary 仅捕获渲染阶段的同步错误，不拦截 useEffect 中的异步错误
- [风险] preload 可用性检查可能误报 → 缓解：仅检查 `window.workbenchShell` 存在性，不做深度验证
