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

## 6. 工作区文件会写到哪里

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

## 7. CLI 如何自助检索工作区

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

## 8. 常见问题

### 8.1 `npm run dev` 前就报依赖缺失

通常是还没安装依赖，重新执行：

```powershell
npm install
```

### 8.2 `node-pty` 相关原生模块报错

项目里 Terminal Panel 依赖 `node-pty`。如果你更换了 Node / Electron 环境，或者本机原生模块 ABI 不匹配，可以尝试：

```powershell
npm run rebuild:native
```

### 8.3 `npm run rebuild:native` 失败，提示 `MSB8040`

这不是仓库代码问题，而是本机 Visual Studio C++ 组件缺失。

需要补装这个组件：

```text
MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs
```

装完后再执行：

```powershell
npm run rebuild:native
```

### 8.4 应用能构建，但终端面板打不开

先按顺序检查：

1. 是否运行在 Windows 下
2. 是否使用了 `npm run dev`
3. 是否已经执行过 `npm install`
4. 终端里是否出现 `node-pty` 相关错误
5. 如果有原生模块错误，再执行 `npm run rebuild:native`

## 9. 当前可用命令

在项目根目录执行：

```powershell
npm run dev
npm run typecheck
npm run build
npm run rebuild:native
```

## 10. 当前最短打开路径

如果你只想最快把应用跑起来，只做下面两步：

```powershell
npm install
npm run dev
```
