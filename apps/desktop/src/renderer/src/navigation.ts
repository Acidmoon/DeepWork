import type { NavigationSection, PanelDefinition } from './types'

export const panelRegistry: PanelDefinition[] = [
  {
    id: 'home',
    title: 'Project Home',
    sectionId: 'overview',
    group: 'Workbench',
    kind: 'home',
    state: 'scaffolded',
    summary: '工作台壳层、真实 Web Panel、真实 Terminal Panel 与首版公共 Workspace 已经接入到正式应用。',
    nextStep: '继续推进 Phase 5，把 Artifact List 与 Preview 从当前基础索引升级为真正可操作视图。',
    delivery: 'Phase 4 交付物：公共 Workspace 已完成初始化并能保存剪贴板 Artifact。',
    signal: 'Workspace live',
    pinned: true,
    defaultVisible: true
  },
  {
    id: 'deepseek-web',
    title: 'DeepSeek Web',
    sectionId: 'web',
    group: 'Web Apps',
    kind: 'web',
    state: 'validated',
    summary: 'DeepSeek 现已通过独立 WebContentsView 接入，并使用 persist partition 保持登录态。',
    nextStep: '后续在 Artifact 阶段增加网页内容捕获与发送动作。',
    delivery: 'Phase 2 交付物：真实网页面板可导航、可保活。',
    signal: 'Persistent web session'
  },
  {
    id: 'minimax-web',
    title: 'MiniMax Web',
    sectionId: 'web',
    group: 'Web Apps',
    kind: 'web',
    state: 'planned',
    summary: '保留为配置驱动的预留网页入口，当前版本不创建真实浏览器实例。',
    nextStep: '后续只需把配置切到 enabled，即可挂载真实 Web Panel。',
    delivery: '保留扩展位。',
    signal: 'Reserved config'
  },
  {
    id: 'codex-cli',
    title: 'Codex CLI',
    sectionId: 'agents',
    group: 'CLI Agents',
    kind: 'terminal',
    state: 'validated',
    summary: 'Codex CLI 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
    nextStep: '后续与 Workspace / Send to Agent 串联，把标准提示词直接写入终端。',
    delivery: 'Phase 3 交付物：Codex 终端面板已可启动与保活。',
    signal: 'Codex terminal live'
  },
  {
    id: 'claude-code',
    title: 'Claude Code',
    sectionId: 'agents',
    group: 'CLI Agents',
    kind: 'terminal',
    state: 'validated',
    summary: 'Claude Code 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
    nextStep: '后续与 Artifact 路径协议串联，补齐发送 prompt 的标准动作。',
    delivery: 'Phase 3 交付物：Claude Code 终端面板已可启动与保活。',
    signal: 'Claude terminal live'
  },
  {
    id: 'artifacts',
    title: 'Artifacts',
    sectionId: 'workspace',
    group: 'Workspace',
    kind: 'workspace',
    state: 'validated',
    summary: '工作区目录、manifest 和剪贴板保存入口已落地，当前展示基础索引与最近 Artifact。',
    nextStep: '在 Phase 5 里接更完整的 Artifact List、选中态和预览入口。',
    delivery: 'Phase 4 交付物：Workspace + artifacts.json 第一版。',
    signal: 'Manifest live'
  },
  {
    id: 'logs',
    title: 'Logs',
    sectionId: 'workspace',
    group: 'Workspace',
    kind: 'workspace',
    state: 'scaffolded',
    summary: '公共 Workspace 已建立 logs 桶位，后续 CLI 与渲染日志会统一归档到这里。',
    nextStep: '在后续阶段补充真实日志索引、筛选和打开路径能力。',
    delivery: 'Phase 4 交付物：日志目录结构已落地。',
    signal: 'Log bucket ready'
  },
  {
    id: 'html-preview',
    title: 'HTML Preview',
    sectionId: 'tools',
    group: 'Tools',
    kind: 'tool',
    state: 'planned',
    summary: '后续会承接 HTML Artifact 的预览与导出入口。',
    nextStep: '在 Phase 7 接 Playwright 渲染和结果回写 manifest。',
    delivery: '预留工具视图。',
    signal: 'Render service pending'
  },
  {
    id: 'settings',
    title: 'Settings',
    sectionId: 'system',
    group: 'System',
    kind: 'settings',
    state: 'scaffolded',
    summary: '设置面板开始承接应用级偏好项，当前先落地语言选项与后续能力的占位配置。',
    nextStep: '继续把 CLI prompt 模板、默认工作区、终端启动策略等接入可配置项。',
    delivery: '首版设置面板：语言切换入口 + 可扩展占位。',
    signal: 'Preferences scaffolded'
  }
]

export const navigationSections: NavigationSection[] = [
  {
    id: 'overview',
    title: 'Workbench',
    caption: '当前工作台已接入真实网页和终端面板，下一步进入公共工作区能力。',
    panelIds: ['home']
  },
  {
    id: 'web',
    title: 'Web Apps',
    caption: 'DeepSeek 已正式接入，MiniMax 仍按配置保留为后续扩展位。',
    panelIds: ['deepseek-web', 'minimax-web']
  },
  {
    id: 'agents',
    title: 'CLI Agents',
    caption: 'Codex CLI 与 Claude Code 现在都由主进程 PTY 托管，切换标签时会话不会丢。',
    panelIds: ['codex-cli', 'claude-code']
  },
  {
    id: 'workspace',
    title: 'Workspace',
    caption: '工作区已经落地到真实目录与 manifest，后续会继续把列表、预览和发送流程接进来。',
    panelIds: ['artifacts', 'logs']
  },
  {
    id: 'tools',
    title: 'Tools',
    caption: '本地工具面板负责预览和导出，不直接承载编辑逻辑。',
    panelIds: ['html-preview']
  },
  {
    id: 'system',
    title: 'System',
    caption: '应用级配置集中在这里，当前先提供语言与后续功能占位。',
    panelIds: ['settings']
  }
]
