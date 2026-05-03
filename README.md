# DeepWork

DeepWork 是一个基于 Electron + React 的本地桌面工作台，把网页 AI、CLI Agent 和共享 Workspace 放进同一个应用里。

当前产品方向已经明确收敛为：

- Web 和 CLI 对话面是主入口
- Workspace 负责持久化、索引、检索和审计
- 模型优先自动感知上下文，用户只在需要时做轻量提及或进入 Workspace 检查
- 不再把主流程设计成“先去 Workspace 选 Artifact、点很多按钮、再回到对话”

## 1. 使用原则

日常使用建议只有四条：

1. 直接在网页或 CLI 里继续对话。
2. 需要引用之前内容时，优先自然语言提及线程、来源、会话、文件或任务。
3. Workspace 主要用于检查系统到底保存了什么、检索为什么命中了某个范围、以及必要的整理修复。
4. PowerShell helper 主要用于显式 inspection 和 debugging，不是日常必经步骤。

## 2. 你需要什么

建议环境：

1. Windows 10/11
2. Node.js 22+
3. npm 11+
4. PowerShell

可先确认版本：

```powershell
node -v
npm -v
```

## 3. 第一次启动前怎么准备

在项目根目录 `E:\vibecoding\DeepWork` 打开 PowerShell，然后执行：

```powershell
npm install
```

安装完成后，建议先做一次静态检查：

```powershell
npm run typecheck
```

默认安装只包含桌面应用本体依赖。

不会默认下载这些大体积验证资源：

1. Playwright 浏览器运行时
2. `tech-validation` 目录下的独立验证依赖
3. 本地 npm 缓存

## 4. 如何打开应用

最直接、最推荐的打开方式：

```powershell
npm run dev
```

执行后会启动 Electron 开发模式，并弹出桌面应用窗口。

## 5. 日常启动步骤

以后每次重新打开项目，只需要：

```powershell
cd E:\vibecoding\DeepWork
npm run dev
```

## 6. 当前界面怎么理解

从当前代码结构看，桌面应用主要由三类表面组成：

1. `Managed Web Panels`
   用来承载 DeepSeek 等网页 AI，会保留独立网页登录态和浏览状态。
2. `Managed CLI Panels`
   用来承载 Codex CLI、Claude Code 等终端型 Agent，会保留会话、线程和日志状态。
3. `Workspace`
   用来保存 Artifact、线程、scope、检索审计和索引结果。

这里最重要的理解是：

```text
Workspace 是系统底座，不是主操作台。
Web / CLI 对话面才是主操作面。
```

## 7. Workspace 文件会写到哪里

首次启动时，Workspace 不会自动写入某个默认目录。你需要先在 Home 里选择一个工作区根目录，或者在 Settings 里打开已经保存的 Workspace Profile。

其中会自动生成：

```text
artifacts/
outputs/
manifests/
rules/
logs/
```

关键索引通常包括：

```text
manifests/artifacts.json
manifests/context-index.json
manifests/threads.json
manifests/origins/<scopeId>.json
```

默认目录不是固定死的，你也可以在应用内切换到自己的 Workspace 根目录。

如果某个工作区经常使用，可以在 Settings 里把当前工作区保存为 Workspace Profile。Profile 只保存名称、路径和最近使用信息，不会接管或删除目录本身。你也可以把某个 Profile 设为启动默认；后续打开应用时会优先恢复这个 Profile 指向的工作区。如果没有设置启动默认，也没有已保存的当前工作区，应用会保持未选择工作区状态，直到你手动选择。

## 8. CLI 如何自动感知上下文

现在 `Codex CLI` / `Claude Code` 启动后会默认进入当前 Workspace，并自动获得工作区检索能力。

正常使用时，你不需要手动整理 prompt，也不需要先去 Workspace 里打包上下文。

更推荐的使用方式是直接自然语言描述任务，比如提到：

1. 某个之前的 CLI 会话
2. 某次网页对话
3. 某个线程、来源或上下文标签
4. 某个已经保存的文件或结果

在这种情况下，CLI 应该先根据工作区索引按需定位相关 scope 或 thread，再决定是否读取具体 Artifact。

## 9. PowerShell helper 有什么作用

CLI 侧的 PowerShell helper 仍然可用，但它们主要用于：

1. 显式检查当前索引
2. 调试检索行为
3. 在模型或开发者需要时提供结构化辅助

可用命令包括：

```powershell
aw-workspace
aw-origins
aw-suggest "<natural-language query>"
aw-origin <scopeId>
aw-artifact <id>
```

也就是说，这套命令更像自动上下文感知的底层检索面，而不是要求你手工做上下文交接的操作界面。

## 10. 如果你只想确认代码能构建

可以运行：

```powershell
npm run build
```

## 11. 验证怎么跑

桌面应用当前把验证拆成几个 focused flows，不再假设一个超大的全量 E2E 套件能覆盖所有东西。

常用命令：

```powershell
npm run typecheck -w @ai-workbench/desktop
npm run validate:workspace-retrieval -w @ai-workbench/desktop
npm run build -w @ai-workbench/desktop
npm run validate:renderer-entrypoint -w @ai-workbench/desktop
npm run validate:workspace-regression -w @ai-workbench/desktop
npm run validate:workspace-web-capture -w @ai-workbench/desktop
npm run validate:custom-web-panels -w @ai-workbench/desktop
npm run validate:terminal-panel-configuration -w @ai-workbench/desktop
npm run validate:terminal-behavior -w @ai-workbench/desktop
npm run validate:workspace-profiles -w @ai-workbench/desktop
```

内部 alpha 回归可以直接跑完整序列：

```powershell
npm run validate:internal-alpha
```

浏览器驱动的 renderer 验证默认使用仓库构建产物 `apps/desktop/out/renderer/index.html`，不需要单独启动 `localhost:5173`。如果只是为了调试某个 live dev server，可以显式设置：

```powershell
$env:AI_WORKBENCH_VALIDATION_RENDERER_URL='http://localhost:5174'
```

如果你的改动涉及 renderer browser flow，再看 [apps/desktop/validation/README.md](</E:/vibecoding/DeepWork/apps/desktop/validation/README.md>)。

## 12. Windows alpha 打包

内部 alpha 的 Windows 打包使用 `electron-builder`，当前产物是未签名的 unpacked 目录包，面向本机或小范围手动验证，不包含自动更新或代码签名。

打包前建议确认：

1. Windows 10/11
2. Node.js 22+ 和 npm 11+
3. Electron native module 构建工具可用
4. 已安装项目依赖

常用命令：

```powershell
npm run package:win
```

该命令会先执行桌面构建，再生成：

```text
release/windows-alpha/win-unpacked/DeepWork.exe
```

生成目录 `release/` 是本地输出目录，不应提交到源码仓库。打包配置会只包含运行时需要的 Electron 输出、依赖和 native module unpack 内容，并排除源码验证 fixture、Playwright 临时文件、验证截图、日志和本机 Workspace 数据。

准备给别人试用前，跑完整 preflight：

```powershell
npm run release:win-alpha
```

它会按顺序执行：

1. `npm run validate:internal-alpha`
2. `npm run package:win`
3. `npm run validate:package-win`

打包命令不会强制重编译 native module；它会把 `node-pty` 的运行时文件 unpack 到 asar 外。更换 Node、Electron 或 Visual Studio build tools 后，如果 `node-pty` 或其他 native module 在开发、打包 smoke 或启动时异常，先运行：

```powershell
npm run rebuild:native
```

`validate:internal-alpha` 用于确认源码构建和 focused flows；`package:win` 用于生成 Windows alpha 目录包；`validate:package-win` 会确认 packaged app 存在，并用隔离的 userData/documents 启动，验证首次打开能进入 renderer shell 且不会隐式创建 Workspace。

未签名 alpha 在 Windows 上可能出现 SmartScreen 或安全提示，这是当前阶段的预期限制。当前目录包会跳过 Windows executable signing/resource edit，避免内部 alpha 机器必须具备代码签名工具链；正式分发前再处理签名、安装器、图标资源和发布通道。

## 13. 常见问题

### 13.1 `npm run dev` 前就报依赖缺失

通常是还没安装依赖，重新执行：

```powershell
npm install
```

### 13.2 `node-pty` 相关原生模块报错

项目里的 Terminal Panel 依赖 `node-pty`。如果你更换了 Node / Electron 环境，或者本机原生模块 ABI 不匹配，可以尝试：

```powershell
npm run rebuild:native
```

### 13.3 `npm run rebuild:native` 失败，提示 `MSB8040`

这通常不是仓库代码问题，而是本机 Visual Studio C++ 组件缺失。

需要补装这个组件：

```text
MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs
```

### 13.4 为什么本地目录会很大

如果你发现本地目录接近 `1GB+`，通常不是源码本身，而是这些内容在占空间：

1. 根目录 `node_modules/`
2. 根目录 `.npm-cache/`
3. `tech-validation/.playwright-browsers/`
4. `tech-validation/.npm-cache/`

## 14. 当前最短打开路径

如果你只想最快把应用跑起来，只做下面两步：

```powershell
npm install
npm run dev
```
