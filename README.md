# DeepWork

这是一个基于 Electron + React 的本地桌面工作台，用来把网页 AI、CLI Agent 和公共 Artifact Workspace 放到同一个应用里。

当前仓库里已经可以直接打开桌面应用进行开发运行。

## 1. 你需要什么

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

## 2. 第一次启动前怎么准备

在项目根目录 `E:\vibecoding\DeepWork` 打开 PowerShell，然后执行：

```powershell
npm install
```

安装完成后，建议先做一次静态检查：

```powershell
npm run typecheck
```

这里的默认安装只包含桌面应用本体依赖。

不会默认下载这些大体积验证资源：

1. Playwright 浏览器运行时
2. `tech-validation` 目录下的独立验证依赖
3. 本地 npm 缓存

这几类都改成了按需准备，不属于普通用户的首次启动路径。

## 3. 如何打开应用

这是当前最直接、最推荐的打开方式：

```powershell
npm run dev
```

执行后会启动 Electron 开发模式，并弹出桌面应用窗口。

如果窗口没有立刻出现，先看终端里是否有报错输出。

## 4. 日常启动步骤

以后每次重新打开项目，只需要：

```powershell
cd E:\vibecoding\DeepWork
npm run dev
```

## 5. 如果你只想确认代码能构建

可以运行：

```powershell
npm run build
```

这会生成 Electron 构建产物，但它不是安装包流程。当前仓库主要还是按开发模式启动。

## 6. 可选的技术验证依赖

`tech-validation/` 是开发验证工具目录，不是应用运行必需项。

只有在你要验证以下能力时，才需要单独安装：

1. Electron Web 验证
2. PTY 终端验证
3. Playwright HTML/PDF 渲染验证

按需安装方式：

```powershell
cd E:\vibecoding\DeepWork\tech-validation
npm install
```

如果你还需要 Playwright 浏览器，再额外安装：

```powershell
npx playwright install chromium
```

说明：

1. 这一步会下载较大的浏览器二进制文件。
2. 下载内容会进入 `tech-validation/.playwright-browsers/`。
3. 这些文件已经加入 `.gitignore`，不会作为仓库内容提交。
4. 普通使用 `DeepWork` 不需要做这一步。

## 7. 工作区文件会写到哪里

应用启动后，Workspace 会自动初始化到用户文档目录下：

```text
Documents/AI-Workspace/projects/default
```

其中会自动生成：

```text
artifacts/
outputs/
manifests/
rules/
logs/
```

`artifacts.json` 位于：

```text
Documents/AI-Workspace/projects/default/manifests/artifacts.json
```

现在这个默认目录不是固定死的，你也可以在应用内的 `Workspace` 面板里使用 `选择工作区` 改成你自己的文件夹。改完后会持久化，下次启动仍会继续使用该目录。

## 8. CLI 如何自助检索工作区

现在 `Codex CLI` / `Claude Code` 启动后会默认进入当前工作区根目录，并自动获得一组 PowerShell 检索命令。

工作区里当前会维护这些核心索引文件：

```text
manifests/artifacts.json
manifests/context-index.json
manifests/origins/<scopeId>.json
```

其中：

1. `artifacts.json` 是总索引。
2. `context-index.json` 是按 `origin + contextLabel` 聚合后的上下文索引。
3. `manifests/origins/<scopeId>.json` 是某一个具体来源/上下文的独立索引。

在 CLI 面板里可以直接使用：

```powershell
aw-workspace
aw-origins
aw-origin <scopeId>
aw-artifact <id>
```

这些命令的作用分别是：

1. `aw-workspace`：查看当前工作区和核心 manifest 路径。
2. `aw-origins`：列出所有来源/上下文索引。
3. `aw-origin <scopeId>`：打开某个具体来源/上下文索引。
4. `aw-artifact <id>`：查看某个具体 Artifact 的完整记录。

## 9. 常见问题

### 9.1 `npm run dev` 前就报依赖缺失

通常是还没安装依赖，重新执行：

```powershell
npm install
```

### 9.2 `node-pty` 相关原生模块报错

项目里 Terminal Panel 依赖 `node-pty`。如果你更换了 Node / Electron 环境，或者本机原生模块 ABI 不匹配，可以尝试：

```powershell
npm run rebuild:native
```

### 9.3 `npm run rebuild:native` 失败，提示 `MSB8040`

这不是仓库代码问题，而是本机 Visual Studio C++ 组件缺失。

需要补装这个组件：

```text
MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs
```

装完后再执行：

```powershell
npm run rebuild:native
```

### 9.4 应用能构建，但终端面板打不开

先按顺序检查：

1. 是否运行在 Windows 下
2. 是否使用了 `npm run dev`
3. 是否已经执行过 `npm install`
4. 终端里是否出现 `node-pty` 相关错误
5. 如果有原生模块错误，再执行 `npm run rebuild:native`

### 9.5 为什么仓库本地会很大

如果你发现本地目录接近 `1GB+`，通常不是源码本身，而是下面这些内容在占空间：

1. 根目录 `node_modules/`
2. 根目录 `.npm-cache/`
3. `tech-validation/.playwright-browsers/`
4. `tech-validation/.npm-cache/`

其中最大的通常是：

1. Electron 运行时
2. Playwright 下载的 Chromium
3. npm 缓存

源码本身只占很小一部分。

## 10. 当前可用命令

在项目根目录执行：

```powershell
npm run dev
npm run typecheck
npm run build
npm run rebuild:native
```

如果你要做可选验证，还可以在 `tech-validation/` 下运行：

```powershell
npm run validate:web
npm run validate:pty
npm run validate:render
```

注意：这些命令需要你先单独安装 `tech-validation` 依赖；`validate:render` 还需要先安装 Playwright Chromium。

## 11. 当前最短打开路径

如果你只想最快把应用跑起来，只做下面两步：

```powershell
npm install
npm run dev
```
