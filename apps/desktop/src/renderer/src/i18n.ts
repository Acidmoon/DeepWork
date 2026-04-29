import type { NavigationSection, PanelDefinition, PanelKind, PanelState, SettingsOptionPlaceholder } from '@ai-workbench/core/desktop/panels'
import type { TerminalPanelStatus } from '@ai-workbench/core/desktop/terminal-panels'
import type {
  CliRetrievalPreference,
  ThemePreference,
  ThreadContinuationPreference
} from '@ai-workbench/core/desktop/settings'

export type SupportedLocale = 'zh-CN' | 'en-US'
export type LanguagePreference = 'system' | SupportedLocale

type PanelText = Pick<PanelDefinition, 'title' | 'group' | 'summary' | 'nextStep' | 'delivery' | 'signal'>
type SectionText = Pick<NavigationSection, 'title' | 'caption'>

const panelTexts: Record<SupportedLocale, Record<string, PanelText>> = {
  'zh-CN': {
    home: {
      title: 'Project Home',
      group: 'Workbench',
      summary: '工作台壳层、真实 Web Panel、真实 Terminal Panel 与首版公共 Workspace 已经接入到正式应用。',
      nextStep: '继续推进 Phase 5，把 Artifact List 与 Preview 从当前基础索引升级为真正可操作视图。',
      delivery: 'Phase 4 交付物：公共 Workspace 已完成初始化并能保存剪贴板 Artifact。',
      signal: 'Workspace live'
    },
    'deepseek-web': {
      title: 'DeepSeek Web',
      group: 'Web Apps',
      summary: 'DeepSeek 现已通过独立 WebContentsView 接入，并使用 persist partition 保持登录态。',
      nextStep: '后续在 Artifact 阶段增加网页内容捕获与工作区索引联动能力。',
      delivery: 'Phase 2 交付物：真实网页面板可导航、可保活。',
      signal: 'Persistent web session'
    },
    'minimax-web': {
      title: 'MiniMax Web',
      group: 'Web Apps',
      summary: '作为可选预设网页目标保留，并沿用与自定义网页相同的配置驱动打开能力。',
      nextStep: '需要固定入口时可直接启用，或者在 Web Apps 中新增任意自定义网页。',
      delivery: '可选网页预设。',
      signal: 'Optional preset'
    },
    'codex-cli': {
      title: 'Codex CLI',
      group: 'CLI Agents',
      summary: 'Codex CLI 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
      nextStep: '继续强化自动工作区检索，让 CLI 在提到某个会话时直接定位相关上下文。',
      delivery: 'Phase 3 交付物：Codex 终端面板已可启动与保活。',
      signal: 'Codex terminal live'
    },
    'claude-code': {
      title: 'Claude Code',
      group: 'CLI Agents',
      summary: 'Claude Code 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
      nextStep: '继续强化自动工作区检索，让 CLI 在提到某个会话时直接定位相关上下文。',
      delivery: 'Phase 3 交付物：Claude Code 终端面板已可启动与保活。',
      signal: 'Claude terminal live'
    },
    artifacts: {
      title: 'Artifacts',
      group: 'Workspace',
      summary: '工作区目录、manifest 和剪贴板保存入口已落地，当前展示基础索引与最近 Artifact。',
      nextStep: '在 Phase 5 里接更完整的 Artifact List、选中态和预览入口。',
      delivery: 'Phase 4 交付物：Workspace + artifacts.json 第一版。',
      signal: 'Manifest live'
    },
    logs: {
      title: 'Logs',
      group: 'Workspace',
      summary: '公共 Workspace 已建立 logs 桶位，后续 CLI 与渲染日志会统一归档到这里。',
      nextStep: '在后续阶段补充真实日志索引、筛选和打开路径能力。',
      delivery: 'Phase 4 交付物：日志目录结构已落地。',
      signal: 'Log bucket ready'
    },
    'html-preview': {
      title: 'HTML Preview',
      group: 'Tools',
      summary: '后续会承接 HTML Artifact 的预览与导出入口。',
      nextStep: '在 Phase 7 接 Playwright 渲染和结果回写 manifest。',
      delivery: '预留工具视图。',
      signal: 'Render service pending'
    },
    settings: {
      title: 'Settings',
      group: 'System',
      summary: '设置面板已经开始承接应用级偏好项，当前版本已支持语言、主题、CLI 前置命令与跨会话连续性设置。',
      nextStep: '继续把默认工作区和更细粒度的终端行为扩展成可配置项。',
      delivery: '设置面板：基础外观配置 + 跨会话连续性设置。',
      signal: 'Preferences live'
    }
  },
  'en-US': {
    home: {
      title: 'Project Home',
      group: 'Workbench',
      summary: 'The workbench shell, live web panels, live terminal panels, and the first shared workspace are now wired into the desktop app.',
      nextStep: 'Continue with Phase 5 and turn the current artifact index into a real Artifact List and Preview workflow.',
      delivery: 'Phase 4 deliverable: the shared workspace is initialized and can save clipboard artifacts.',
      signal: 'Workspace live'
    },
    'deepseek-web': {
      title: 'DeepSeek Web',
      group: 'Web Apps',
      summary: 'DeepSeek now runs through an isolated WebContentsView with a persist partition for login retention.',
      nextStep: 'Add page capture and workspace-index integration in the Artifact phase.',
      delivery: 'Phase 2 deliverable: the live web panel can navigate and stay alive.',
      signal: 'Persistent web session'
    },
    'minimax-web': {
      title: 'MiniMax Web',
      group: 'Web Apps',
      summary: 'Kept as an optional preset target and opened through the same configuration-driven flow as custom web pages.',
      nextStep: 'Enable it when you want a fixed MiniMax entry, or add any custom webpage from Web Apps.',
      delivery: 'Optional web preset.',
      signal: 'Optional preset'
    },
    'codex-cli': {
      title: 'Codex CLI',
      group: 'CLI Agents',
      summary: 'Codex CLI is connected as a live persistent terminal through PowerShell, node-pty, and xterm.js.',
      nextStep: 'Keep strengthening automatic workspace retrieval so the CLI can locate the right context when you mention a prior session.',
      delivery: 'Phase 3 deliverable: the Codex terminal panel can start and stay alive.',
      signal: 'Codex terminal live'
    },
    'claude-code': {
      title: 'Claude Code',
      group: 'CLI Agents',
      summary: 'Claude Code is connected as a live persistent terminal through PowerShell, node-pty, and xterm.js.',
      nextStep: 'Keep strengthening automatic workspace retrieval so the CLI can locate the right context when you mention a prior session.',
      delivery: 'Phase 3 deliverable: the Claude terminal panel can start and stay alive.',
      signal: 'Claude terminal live'
    },
    artifacts: {
      title: 'Artifacts',
      group: 'Workspace',
      summary: 'The workspace directory, manifest, and clipboard save entry are live, with the current UI showing a basic index and recent artifacts.',
      nextStep: 'Build a fuller Artifact List, selection state, and preview entry in Phase 5.',
      delivery: 'Phase 4 deliverable: first version of Workspace + artifacts.json.',
      signal: 'Manifest live'
    },
    logs: {
      title: 'Logs',
      group: 'Workspace',
      summary: 'The shared workspace already contains a logs bucket for future CLI and renderer log archiving.',
      nextStep: 'Add real log indexing, filtering, and open-path actions in a later phase.',
      delivery: 'Phase 4 deliverable: log directory structure is in place.',
      signal: 'Log bucket ready'
    },
    'html-preview': {
      title: 'HTML Preview',
      group: 'Tools',
      summary: 'This will later handle HTML artifact preview and export.',
      nextStep: 'Integrate Playwright rendering and manifest writeback in Phase 7.',
      delivery: 'Reserved tool view.',
      signal: 'Render service pending'
    },
    settings: {
      title: 'Settings',
      group: 'System',
      summary: 'The settings panel now owns app-level preferences for language, theme, CLI prelude commands, and cross-session continuity defaults.',
      nextStep: 'Continue wiring default workspace selection and deeper terminal behavior into real settings.',
      delivery: 'Settings panel: baseline appearance controls plus continuity defaults.',
      signal: 'Preferences live'
    }
  }
}

const sectionTexts: Record<SupportedLocale, Record<string, SectionText>> = {
  'zh-CN': {
    overview: {
      title: 'Workbench',
      caption: '当前工作台已接入真实网页和终端面板，下一步进入公共工作区能力。'
    },
    web: {
      title: 'Web Apps',
      caption: '内置站点与自定义网页共用同一套 Web Panel 生命周期，可按需新增、启用和保活。'
    },
    agents: {
      title: 'CLI Agents',
      caption: 'Codex CLI 与 Claude Code 现在都由主进程 PTY 托管，切换标签时会话不会丢。'
    },
    workspace: {
      title: 'Workspace',
      caption: '工作区已经落地到真实目录与 manifest，后续会继续把列表、预览和自动检索支撑接进来。'
    },
    tools: {
      title: 'Tools',
      caption: '本地工具面板负责预览和导出，不直接承载编辑逻辑。'
    },
    system: {
      title: 'System',
      caption: '应用级配置集中在这里，当前已支持连续性设置，并保留后续偏好扩展位。'
    }
  },
  'en-US': {
    overview: {
      title: 'Workbench',
      caption: 'The workbench already has live web and terminal panels; the next step is shared workspace capability.'
    },
    web: {
      title: 'Web Apps',
      caption: 'Built-in sites and custom webpages share one managed web-panel lifecycle for add, enable, and restore flows.'
    },
    agents: {
      title: 'CLI Agents',
      caption: 'Codex CLI and Claude Code are both owned by the main-process PTY, so sessions survive tab switches.'
    },
    workspace: {
      title: 'Workspace',
      caption: 'The workspace now exists on disk with a manifest, and list, preview, and automatic retrieval support will continue from here.'
    },
    tools: {
      title: 'Tools',
      caption: 'Local tool panels handle preview and export rather than direct editing.'
    },
    system: {
      title: 'System',
      caption: 'App-level configuration lives here, including live continuity defaults and placeholder space for later preferences.'
    }
  }
}

const stateLabels: Record<SupportedLocale, Record<PanelState, string>> = {
  'zh-CN': {
    scaffolded: '已搭建',
    planned: '已规划',
    validated: '已验证'
  },
  'en-US': {
    scaffolded: 'Scaffolded',
    planned: 'Planned',
    validated: 'Validated'
  }
}

const settingsPlaceholderTexts: Record<SupportedLocale, Record<string, Pick<SettingsOptionPlaceholder, 'label' | 'description'>>> = {
  'zh-CN': {
    'cli-prompt-template': {
      label: 'CLI Workspace Retrieval',
      description: '后续允许为 Codex / Claude 配置默认检索策略、会话提示偏好与自动索引行为。'
    },
    'default-workspace': {
      label: 'Default Workspace',
      description: '后续允许指定默认项目目录、Artifact 桶和启动时加载的工作区。'
    },
    'terminal-behavior': {
      label: 'Terminal Behavior',
      description: '后续允许自定义 shell、启动命令、复制策略和终端交互偏好。'
    }
  },
  'en-US': {
    'cli-prompt-template': {
      label: 'CLI Workspace Retrieval',
      description: 'Later this will allow retrieval defaults, session disambiguation hints, and automatic indexing behavior for Codex and Claude.'
    },
    'default-workspace': {
      label: 'Default Workspace',
      description: 'Later this will allow a preferred project directory, artifact bucket, and startup workspace selection.'
    },
    'terminal-behavior': {
      label: 'Terminal Behavior',
      description: 'Later this will allow custom shell, startup command, copy policy, and terminal interaction preferences.'
    }
  }
}

const uiText = {
  'zh-CN': {
    appTitle: 'DeepWork',
    appSubtitle: '原生 Web 与 CLI 工作台',
    searchTools: '搜索工具...',
    workbenchNavigation: '工作台导航',
    openPanels: '打开的面板',
    open: '打开',
    closePanel: '关闭面板',
    openHomePanel: '打开首页面板',
    addWeb: '添加网页',
    addCli: '添加 CLI',
    customWebTitle: '网页',
    customWebUrlPrompt: '输入要打开的网址（支持 HTTP/HTTPS）',
    webUrlEmpty: '请输入要打开的网址。',
    webUrlInvalid: '请输入有效的网址。',
    webUrlUnsupportedProtocol: '只支持 HTTP 或 HTTPS 网址。',
    customCliTitle: 'CLI',
    rename: '重命名',
    delete: '删除',
    deleteSession: '删除会话',
    deleteSessionConfirm: '确认删除这组会话及其在工作区中的所有记录吗？此操作不能撤销。',
    renamePanelPrompt: '输入新的面板名称',
    terminalLabel: '终端',
    sync: '同步',
    connected: '已连接',
    standby: '待命',
    workspaceDefault: '工作区：默认',
    lastSync: '上次同步',
    back: '返回',
    forward: '前进',
    reload: '刷新',
    home: '首页',
    start: '启动',
    restart: '重启',
    saveClipboard: '保存剪贴板',
    chooseWorkspace: '选择工作区',
    activeThread: '当前线程',
    noActiveThread: '未选择线程',
    threadContinuity: '上下文连续线程',
    threadList: '线程列表',
    threadCreate: '新建线程',
    threadCreatePrompt: '输入新线程标题（可留空自动生成）',
    threadContinue: '继续',
    threadRename: '重命名线程',
    threadRenamePrompt: '输入线程的新标题',
    threadShowAll: '查看全部范围',
    threadEmptyHint: '还没有线程，先新建一个。',
    threadScopeCount: '个范围',
    threadArtifactCount: '条记录',
    threadDerived: '回填线程',
    threadExplicit: '显式线程',
    reassignScopeThread: '调整到其他线程',
    targetThread: '目标线程',
    address: '地址',
    go: '前往',
    followSystem: '跟随系统',
    currentMode: '当前模式',
    note: '说明',
    showDetails: '显示详情',
    hideDetails: '隐藏详情',
    persistent: '持久会话',
    ephemeral: '临时会话',
    loadingCurrentPage: '正在加载当前页面...',
    liveSessionAttached: '实时会话已挂载',
    reservedWebPanel: '未启用网页面板',
    reservedWebMessage: '当前未挂载真实浏览器实例。配置会保留，启用后即可重新打开。',
    reserved: '预留',
    navigation: '导航',
    historyReady: '历史可用',
    initialPage: '初始页面',
    session: '会话',
    persisted: '已持久化',
    inProgress: '进行中',
    idle: '空闲',
    loading: '加载',
    terminalRuntimeActive: '终端运行时已激活',
    sessionWaitingOrExited: '会话等待启动或已退出',
    shell: 'Shell',
    shellArguments: 'Shell 参数',
    shellArgumentsPlaceholder: '每行一个参数，例如：\n-NoLogo\n-ExecutionPolicy\nBypass',
    startupCommand: '启动命令',
    launchCount: '启动次数',
    status: '状态',
    pid: 'PID',
    notRunning: '未运行',
    workingDirectory: '工作目录',
    bufferSize: '缓冲区大小',
    lastExit: '上次退出',
    active: '活跃中',
    restartToApply: '重启以应用',
    terminalConfigApplyHint: '保存会立即更新已保存配置，但不会打断当前 PTY。新的配置会在下次启动或手动重启后生效。',
    builtInTerminalConfigHint:
      '内置 CLI 的 shell 和引导流程由应用托管。留空工作目录会继续使用当前工作区；留空启动命令会回退到内置默认命令。',
    workspaceLive: 'Workspace 实时状态',
    workspaceIntro: '公共工作区已由主进程初始化，并开始维护 artifacts.json。本阶段先打通目录、规则文件和剪贴板保存入口。',
    workspaceSimpleIntro: '这里会自动保存网页对话、CLI 会话和结构化消息索引。CLI 后续会先来这里检索，再决定读取哪些上下文。',
    currentWorkspace: '当前工作区',
    savedContexts: '已保存上下文',
    savedItems: '已保存内容',
    workspaceHowItWorks: '工作区在做什么',
    workspaceGuideCaptureTitle: '1. 自动接住上下文',
    workspaceGuideCaptureBody: '网页对话、CLI 会话和你手动保存的内容，都会持续进入这里。',
    workspaceGuideIndexTitle: '2. 自动分组建索引',
    workspaceGuideIndexBody: '系统会按来源和会话分组，避免把所有历史记录混在一起。',
    workspaceGuideRetrieveTitle: '3. CLI 按需检索',
    workspaceGuideRetrieveBody: '当你的问题需要历史上下文时，CLI 会先查索引，再只读取相关那一组。',
    findContext: '查找上下文',
    findContextHint: '先选择一个来源或会话。',
    workspaceSearch: '搜索查询',
    workspaceSearchPlaceholder: '搜索 ID、摘要、标签或路径',
    searchResultsCount: '搜索结果',
    contextType: '内容类型',
    bucketArtifacts: '对话与上下文',
    bucketOutputs: '模型输出',
    bucketLogs: '运行日志',
    currentSelection: '当前选中',
    workspaceEmptyHint: '还没有保存内容。',
    advancedWorkspaceTools: '高级功能与技术信息',
    technicalPaths: '技术路径',
    cliCommandWorkspace: '查看当前工作区和索引路径',
    cliCommandOrigins: '列出所有可检索的来源或会话',
    cliCommandOrigin: '打开某一组会话索引',
    cliCommandArtifact: '查看某条具体记录',
    cliCommandThreads: '列出当前工作区中的线程摘要',
    cliCommandThread: '查看某个线程的成员范围与摘要',
    bucket: '桶位',
    projectId: '项目 ID',
    workspaceRoot: '工作区根目录',
    contextIndex: '上下文索引',
    threadIndex: '线程索引',
    threadManifests: '线程清单目录',
    sourceOrigins: '来源索引',
    sessionList: '会话列表',
    sessionPreview: '会话预览',
    sessionPreviewHint: '先选择一个会话。',
    sessionPreviewUnavailable: '当前会话还没有可直接预览的结构化内容。',
    sessionPreviewEmpty: '等待选择会话',
    sessionMessagesCount: '条消息',
    sessionLogPreview: '终端片段',
    currentSessionContent: '当前会话内容',
    selectedOrigin: '上下文来源',
    contextLabel: '上下文标签',
    allSources: '全部来源',
    latestArtifact: '最新 Artifact',
    contextSelectionHint: 'CLI 正常工作时应自动按需检索；这里的来源选择主要用于人工检查或排障。',
    artifactSelection: 'Artifact 选择',
    selectedCount: '已选数量',
    previewArtifact: '预览',
    selectedArtifacts: '已选 Artifact',
    selectedArtifactsEmpty: '还没有选中任何 Artifact。',
    artifactPreview: 'Artifact 预览',
    artifactPreviewHint: '先选择一条 Artifact。',
    artifactPreviewEmpty: '等待选择要预览的 Artifact。',
    artifactPreviewLoading: '正在加载 Artifact 预览...',
    artifactPreviewUnavailable: '未能读取这条 Artifact，可能已被删除或暂时不可用。',
    artifactPreviewUnsupported: '该 Artifact 类型暂不支持文本预览。',
    cliSelfSearch: 'CLI 自动工作区检索',
    cliSelfSearchHint: 'CLI 现在会默认进入当前工作区，并在你提到某个会话或来源时优先自动查索引；下面这些命令主要用于显式检查或排障。',
    defaultContextLabel: '默认上下文',
    noArtifactsForFilter: '当前筛选条件下还没有可选 Artifact。',
    manifest: '清单文件',
    artifactsIndexed: '已索引 Artifact',
    artifactsBucket: 'Artifacts 桶',
    outputsBucket: 'Outputs 桶',
    logsBucket: 'Logs 桶',
    workspaceInitialized: '工作区已初始化',
    workspaceInitializationPending: '工作区初始化中',
    rules: '规则文件',
    rulesPathPending: '初始化完成后显示规则路径',
    lastSaved: '最近保存',
    error: '错误',
    recentArtifacts: '最近 Artifact',
    shownCount: '已显示',
    saveClipboardHint: '使用“保存剪贴板”创建第一条受追踪的 Artifact。',
    toolPlaceholder: '工具占位',
    toolIntro: '导出参数会先保存在面板状态里，后续接渲染服务只需要接管动作按钮。',
    outputFormat: '输出格式',
    lastArtifact: '最近 Artifact',
    renderNotes: '渲染备注',
    applicationSettings: '应用设置',
    settingsIntro: '这里可以配置应用级偏好项。当前版本已支持语言、浅色/深色/跟随系统、CLI 启动前置命令，以及跨会话连续性设置。',
    language: '语言',
    uiLocalePreference: '界面语言偏好',
    displayLanguage: '显示语言',
    theme: '主题',
    themePreference: '界面主题偏好',
    displayTheme: '显示模式',
    lightMode: '浅色模式',
    darkMode: '深色模式',
    sessionContinuityDefaults: '会话连续性默认值',
    sessionContinuityHint: '决定新的网页、CLI 和手动保存内容在未显式指定线程时如何归属。',
    defaultThreadContinuation: '默认线程延续',
    continueActiveThread: '继续当前线程',
    startNewThreadPerScope: '新范围新线程',
    continuitySettingsNote: '只影响后续新会话或新捕获，不会改写已有 Artifact 的线程归属。',
    cliRetrievalPreference: 'CLI 检索偏好',
    cliRetrievalPreferenceHint: '决定受管 CLI 在需要历史上下文时，是先查当前线程还是直接全局检索。',
    retrievalActiveThreadFirst: '先查当前线程',
    retrievalGlobalFirst: '直接全局检索',
    retrievalSettingsNote: '设置会在后续检索中生效，并保留在 retrieval audit 记录里。',
    cliStartupPrelude: 'CLI 启动前置命令',
    cliStartupPreludeHint: '这些命令会在启动 Codex / Claude 之前依次执行。',
    cliStartupPreludePlaceholder: '每行一条命令，例如：\nproxy_on',
    languageSwitchNote: '设置会立即生效，并在重启应用后继续保留。',
    upcomingPreferences: '后续设置项',
    scaffoldedPlaceholders: '已搭建的占位能力',
    notes: '备注',
    freeFormPlaceholder: '自由文本占位',
    settingsRoadmapNotes: '设置路线备注',
    phaseSnapshot: '阶段快照',
    panelType: '面板类型',
    activationCount: '激活次数',
    lastStatusCheck: '最近状态检查',
    checkpoint: '检查点',
    homeUrl: '主页 URL',
    partition: '分区',
    saveConfig: '保存配置',
    enablePanel: '启用面板',
    disablePanel: '停用面板',
    panelAvailability: '面板可用性',
    enabledState: '已启用',
    reservedState: '预留',
    homeChecklistShell: 'Electron shell 已就绪',
    homeChecklistWeb: 'Web panel manager 已就绪',
    homeChecklistTerminal: 'Terminal manager 已就绪',
    placeholderStatusPlanned: '已规划',
    placeholderStatusPlaceholder: '占位中',
    terminalStatusIdle: '空闲',
    terminalStatusStarting: '启动中',
    terminalStatusRunning: '运行中',
    terminalStatusExited: '已退出',
    terminalStatusError: '错误',
    panelKindHome: '首页',
    panelKindWeb: '网页',
    panelKindTerminal: '终端',
    panelKindWorkspace: '工作区',
    panelKindTool: '工具',
    panelKindSettings: '设置'
  },
  'en-US': {
    appTitle: 'DeepWork',
    appSubtitle: 'Native web and CLI workspace',
    searchTools: 'Search tools...',
    workbenchNavigation: 'Workbench navigation',
    openPanels: 'Open panels',
    open: 'Open',
    closePanel: 'Close panel',
    openHomePanel: 'Open home panel',
    addWeb: 'Add Web',
    addCli: 'Add CLI',
    customWebTitle: 'Web',
    customWebUrlPrompt: 'Enter the URL to open (HTTP/HTTPS supported)',
    webUrlEmpty: 'Enter a URL to open.',
    webUrlInvalid: 'Enter a valid URL.',
    webUrlUnsupportedProtocol: 'Only HTTP and HTTPS URLs are supported.',
    customCliTitle: 'CLI',
    rename: 'Rename',
    delete: 'Delete',
    deleteSession: 'Delete Session',
    deleteSessionConfirm: 'Delete this session and all of its records from the workspace? This cannot be undone.',
    renamePanelPrompt: 'Enter a new panel name',
    terminalLabel: 'Terminal',
    sync: 'Sync',
    connected: 'Connected',
    standby: 'Standby',
    workspaceDefault: 'Workspace: Default',
    lastSync: 'Last sync',
    back: 'Back',
    forward: 'Forward',
    reload: 'Reload',
    home: 'Home',
    start: 'Start',
    restart: 'Restart',
    saveClipboard: 'Save Clipboard',
    chooseWorkspace: 'Choose Workspace',
    activeThread: 'Active Thread',
    noActiveThread: 'No thread selected',
    threadContinuity: 'Context Threads',
    threadList: 'Threads',
    threadCreate: 'New Thread',
    threadCreatePrompt: 'Enter a title for the new thread (leave blank to auto-name it)',
    threadContinue: 'Continue',
    threadRename: 'Rename Thread',
    threadRenamePrompt: 'Enter a new title for this thread',
    threadShowAll: 'Show All Scopes',
    threadEmptyHint: 'No threads yet. Create one first.',
    threadScopeCount: 'scopes',
    threadArtifactCount: 'artifacts',
    threadDerived: 'Backfilled',
    threadExplicit: 'Explicit',
    reassignScopeThread: 'Move To Thread',
    targetThread: 'Target Thread',
    address: 'Address',
    go: 'Go',
    followSystem: 'Follow System',
    currentMode: 'Current Mode',
    note: 'Note',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    persistent: 'Persistent Session',
    ephemeral: 'Ephemeral Session',
    loadingCurrentPage: 'Loading current page...',
    liveSessionAttached: 'Live session attached',
    reservedWebPanel: 'Disabled Web Panel',
    reservedWebMessage: 'No live browser is mounted right now. The configuration is kept and can be reopened by enabling the panel.',
    reserved: 'Reserved',
    navigation: 'Navigation',
    historyReady: 'History Ready',
    initialPage: 'Initial Page',
    session: 'Session',
    persisted: 'Persisted',
    inProgress: 'In Progress',
    idle: 'Idle',
    loading: 'Loading',
    terminalRuntimeActive: 'Terminal runtime active',
    sessionWaitingOrExited: 'Session waiting or exited',
    shell: 'Shell',
    shellArguments: 'Shell Arguments',
    shellArgumentsPlaceholder: 'One argument per line, for example:\n-NoLogo\n-ExecutionPolicy\nBypass',
    startupCommand: 'Startup Command',
    launchCount: 'Launch Count',
    status: 'Status',
    pid: 'PID',
    notRunning: 'Not running',
    workingDirectory: 'Working Directory',
    bufferSize: 'Buffer Size',
    lastExit: 'Last Exit',
    active: 'Active',
    restartToApply: 'Restart To Apply',
    terminalConfigApplyHint:
      'Saving updates the persisted launch configuration immediately, but the current PTY keeps running until you start or restart the panel explicitly.',
    builtInTerminalConfigHint:
      'Built-in CLI shell ownership and bootstrap stay managed by the app. Leave the working directory blank to keep using the workspace root, and leave the startup command blank to fall back to the managed default.',
    workspaceLive: 'Workspace Live',
    workspaceIntro: 'The shared workspace is initialized by the main process and now maintains artifacts.json. This phase focuses on the directory, rules file, and clipboard save entry.',
    workspaceSimpleIntro: 'This area automatically saves web conversations, CLI sessions, and structured message indexes. The CLI can search here first, then read only the context it actually needs.',
    currentWorkspace: 'Current Workspace',
    savedContexts: 'Saved Contexts',
    savedItems: 'Saved Items',
    workspaceHowItWorks: 'How Workspace Works',
    workspaceGuideCaptureTitle: '1. Capture context automatically',
    workspaceGuideCaptureBody: 'Web conversations, CLI sessions, and anything you save manually all land here.',
    workspaceGuideIndexTitle: '2. Group and index it',
    workspaceGuideIndexBody: 'The app groups records by source and session so unrelated history does not get mixed together.',
    workspaceGuideRetrieveTitle: '3. Let the CLI retrieve on demand',
    workspaceGuideRetrieveBody: 'When your request needs prior context, the CLI can inspect the index first and only open the relevant group.',
    findContext: 'Find Context',
    findContextHint: 'Choose a source or session first.',
    workspaceSearch: 'Search Query',
    workspaceSearchPlaceholder: 'Search by ID, summary, tags, or path',
    searchResultsCount: 'results',
    contextType: 'Content Type',
    bucketArtifacts: 'Conversations & Context',
    bucketOutputs: 'Model Outputs',
    bucketLogs: 'Runtime Logs',
    currentSelection: 'Current Selection',
    workspaceEmptyHint: 'Nothing has been saved yet.',
    advancedWorkspaceTools: 'Advanced Tools and Technical Info',
    technicalPaths: 'Technical Paths',
    cliCommandWorkspace: 'show the current workspace and index paths',
    cliCommandOrigins: 'list every searchable source or session',
    cliCommandOrigin: 'open one session or source index',
    cliCommandArtifact: 'inspect one specific record',
    cliCommandThreads: 'list thread summaries from the current workspace',
    cliCommandThread: 'inspect one thread before opening any artifact',
    bucket: 'Bucket',
    projectId: 'Project ID',
    workspaceRoot: 'Workspace Root',
    contextIndex: 'Context Index',
    threadIndex: 'Thread Index',
    threadManifests: 'Thread Manifests',
    sourceOrigins: 'Source Index',
    sessionList: 'Sessions',
    sessionPreview: 'Session Preview',
    sessionPreviewHint: 'Select a session first.',
    sessionPreviewUnavailable: 'This session does not have structured preview content yet.',
    sessionPreviewEmpty: 'Waiting for a session',
    sessionMessagesCount: 'messages',
    sessionLogPreview: 'terminal excerpt',
    currentSessionContent: 'Current Session Content',
    selectedOrigin: 'Context Origin',
    contextLabel: 'Context Label',
    allSources: 'All Sources',
    latestArtifact: 'Latest Artifact',
    contextSelectionHint: 'Normal CLI use should rely on automatic workspace retrieval; this source picker is mainly for manual inspection or debugging.',
    artifactSelection: 'Artifact Selection',
    selectedCount: 'Selected Count',
    previewArtifact: 'Preview',
    selectedArtifacts: 'Selected Artifacts',
    selectedArtifactsEmpty: 'No artifacts selected.',
    artifactPreview: 'Artifact Preview',
    artifactPreviewHint: 'Select an artifact first.',
    artifactPreviewEmpty: 'Waiting for an artifact to preview.',
    artifactPreviewLoading: 'Loading artifact preview...',
    artifactPreviewUnavailable: 'This artifact could not be read. It may have been removed or is temporarily unavailable.',
    artifactPreviewUnsupported: 'This artifact type does not support text preview yet.',
    cliSelfSearch: 'Automatic CLI Workspace Retrieval',
    cliSelfSearchHint: 'Managed CLI sessions enter the current workspace automatically and should consult indexes when you mention a prior session or source. These commands are mainly for explicit inspection and debugging.',
    defaultContextLabel: 'default-context',
    noArtifactsForFilter: 'There are no selectable artifacts for the current filter.',
    manifest: 'Manifest',
    artifactsIndexed: 'Artifacts Indexed',
    artifactsBucket: 'Artifacts Bucket',
    outputsBucket: 'Outputs Bucket',
    logsBucket: 'Logs Bucket',
    workspaceInitialized: 'Workspace initialized',
    workspaceInitializationPending: 'Workspace initialization pending',
    rules: 'Rules',
    rulesPathPending: 'Rules path will appear after initialization',
    lastSaved: 'Last Saved',
    error: 'Error',
    recentArtifacts: 'Recent Artifacts',
    shownCount: 'shown',
    saveClipboardHint: 'Use Save Clipboard to create the first tracked artifact.',
    toolPlaceholder: 'Tool Placeholder',
    toolIntro: 'Export parameters are stored in panel state first, and the rendering service can later take over the action buttons.',
    outputFormat: 'Output Format',
    lastArtifact: 'Last Artifact',
    renderNotes: 'Render Notes',
    applicationSettings: 'Application Settings',
    settingsIntro: 'Configure app-level preferences here. This version already supports language, light/dark/system appearance, CLI startup prelude commands, and cross-session continuity defaults.',
    language: 'Language',
    uiLocalePreference: 'UI locale preference',
    displayLanguage: 'Display Language',
    theme: 'Theme',
    themePreference: 'Appearance preference',
    displayTheme: 'Display Theme',
    lightMode: 'Light',
    darkMode: 'Dark',
    sessionContinuityDefaults: 'Session Continuity Defaults',
    sessionContinuityHint: 'Choose how new web, CLI, and manual captures attach to threads when no thread is selected explicitly.',
    defaultThreadContinuation: 'Default Thread Continuation',
    continueActiveThread: 'Continue Active Thread',
    startNewThreadPerScope: 'New Thread Per Scope',
    continuitySettingsNote: 'This only affects future sessions and captures. Existing artifact thread assignments stay unchanged.',
    cliRetrievalPreference: 'CLI Retrieval Preference',
    cliRetrievalPreferenceHint: 'Choose whether managed CLI retrieval should search the active thread first or rank the whole workspace immediately.',
    retrievalActiveThreadFirst: 'Active Thread First',
    retrievalGlobalFirst: 'Whole Workspace First',
    retrievalSettingsNote: 'The selected mode applies to later retrievals and remains visible in retrieval audit records.',
    cliStartupPrelude: 'CLI Startup Prelude',
    cliStartupPreludeHint: 'These commands run before Codex or Claude starts.',
    cliStartupPreludePlaceholder: 'One command per line, for example:\nproxy_on',
    languageSwitchNote: 'The setting applies immediately and stays persisted after restart.',
    upcomingPreferences: 'Upcoming Preferences',
    scaffoldedPlaceholders: 'Scaffolded placeholders',
    notes: 'Notes',
    freeFormPlaceholder: 'Free-form placeholder',
    settingsRoadmapNotes: 'Settings Roadmap Notes',
    phaseSnapshot: 'Phase Snapshot',
    panelType: 'Panel Type',
    activationCount: 'Activation Count',
    lastStatusCheck: 'Last Status Check',
    checkpoint: 'Checkpoint',
    homeUrl: 'Home URL',
    partition: 'Partition',
    saveConfig: 'Save Config',
    enablePanel: 'Enable Panel',
    disablePanel: 'Disable Panel',
    panelAvailability: 'Panel Availability',
    enabledState: 'Enabled',
    reservedState: 'Reserved',
    homeChecklistShell: 'Electron shell live',
    homeChecklistWeb: 'Web panel manager live',
    homeChecklistTerminal: 'Terminal manager live',
    placeholderStatusPlanned: 'Planned',
    placeholderStatusPlaceholder: 'Placeholder',
    terminalStatusIdle: 'Idle',
    terminalStatusStarting: 'Starting',
    terminalStatusRunning: 'Running',
    terminalStatusExited: 'Exited',
    terminalStatusError: 'Error',
    panelKindHome: 'Home',
    panelKindWeb: 'Web',
    panelKindTerminal: 'Terminal',
    panelKindWorkspace: 'Workspace',
    panelKindTool: 'Tool',
    panelKindSettings: 'Settings'
  }
} as const

export function resolveLocale(preference: LanguagePreference, systemLanguage?: string): SupportedLocale {
  if (preference === 'zh-CN' || preference === 'en-US') {
    return preference
  }

  const detected = (systemLanguage ?? navigator.language).toLowerCase()
  return detected.startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function localizePanelDefinition(definition: PanelDefinition, locale: SupportedLocale): PanelDefinition {
  const text = panelTexts[locale][definition.id]
  if (!text) {
    if (definition.userDefined && definition.kind === 'web') {
      return {
        ...definition,
        group: localizeSection(
          {
            id: definition.sectionId,
            title: definition.group,
            caption: '',
            panelIds: []
          },
          locale
        ).title,
        summary:
          locale === 'zh-CN'
            ? '用户自定义网页面板，可在工作台内打开任意 HTTP/HTTPS 页面并持续保存配置。'
            : 'User-defined web panel for opening any HTTP/HTTPS page inside the workbench with persisted configuration.',
        nextStep:
          locale === 'zh-CN'
            ? '直接在面板中修改地址、分区和启用状态，决定是否挂载为真实网页实例。'
            : 'Edit the address, partition, and enabled state directly in the panel to control the live web instance.',
        delivery: locale === 'zh-CN' ? '自定义网页配置。' : 'Custom webpage configuration.',
        signal: locale === 'zh-CN' ? '自定义网页' : 'Custom webpage'
      }
    }

    if (definition.userDefined && definition.kind === 'terminal') {
      return {
        ...definition,
        group: localizeSection(
          {
            id: definition.sectionId,
            title: definition.group,
            caption: '',
            panelIds: []
          },
          locale
        ).title,
        summary:
          locale === 'zh-CN'
            ? '用户自定义 CLI 面板，可作为独立终端会话接入任意命令行工具。'
            : 'User-defined CLI panel. Use it as a dedicated terminal session for any command-line workflow.',
        nextStep:
          locale === 'zh-CN'
            ? '可通过右键菜单重命名或删除，后续再继续补更细的 CLI 配置。'
            : 'You can rename or delete it from the context menu, and add deeper CLI settings later.',
        delivery: locale === 'zh-CN' ? '自定义 CLI 配置。' : 'Custom CLI configuration.',
        signal: locale === 'zh-CN' ? '自定义 CLI' : 'Custom CLI'
      }
    }

    return definition
  }

  return {
    ...definition,
    ...text
  }
}

export function localizeSection(section: NavigationSection, locale: SupportedLocale): NavigationSection {
  const text = sectionTexts[locale][section.id]
  if (!text) {
    return section
  }

  return {
    ...section,
    ...text
  }
}

export function localizeSettingsPlaceholder(
  item: SettingsOptionPlaceholder,
  locale: SupportedLocale
): SettingsOptionPlaceholder {
  const text = settingsPlaceholderTexts[locale][item.id]
  if (!text) {
    return item
  }

  return {
    ...item,
    ...text
  }
}

export function getStateLabel(state: PanelState, locale: SupportedLocale): string {
  return stateLabels[locale][state]
}

export function getUiText(locale: SupportedLocale) {
  return uiText[locale]
}

export function getLanguageLabel(preference: LanguagePreference, locale: SupportedLocale): string {
  if (preference === 'system') {
    return uiText[locale].followSystem
  }

  if (preference === 'zh-CN') {
    return '简体中文'
  }

  return 'English'
}

export function getThemeLabel(preference: ThemePreference, locale: SupportedLocale): string {
  const ui = uiText[locale]

  switch (preference) {
    case 'system':
      return ui.followSystem
    case 'light':
      return ui.lightMode
    case 'dark':
      return ui.darkMode
  }
}

export function getThreadContinuationLabel(preference: ThreadContinuationPreference, locale: SupportedLocale): string {
  const ui = uiText[locale]

  switch (preference) {
    case 'continue-active-thread':
      return ui.continueActiveThread
    case 'start-new-thread-per-scope':
      return ui.startNewThreadPerScope
  }
}

export function getCliRetrievalPreferenceLabel(preference: CliRetrievalPreference, locale: SupportedLocale): string {
  const ui = uiText[locale]

  switch (preference) {
    case 'thread-first':
      return ui.retrievalActiveThreadFirst
    case 'global-first':
      return ui.retrievalGlobalFirst
  }
}

export function getLocalizedChecklist(locale: SupportedLocale): string[] {
  const ui = uiText[locale]

  return [ui.homeChecklistShell, ui.homeChecklistWeb, ui.homeChecklistTerminal]
}

export function getPlaceholderStatusLabel(status: SettingsOptionPlaceholder['status'], locale: SupportedLocale): string {
  const ui = uiText[locale]
  return status === 'planned' ? ui.placeholderStatusPlanned : ui.placeholderStatusPlaceholder
}

export function getTerminalStatusLabel(status: TerminalPanelStatus, locale: SupportedLocale): string {
  const ui = uiText[locale]

  switch (status) {
    case 'idle':
      return ui.terminalStatusIdle
    case 'starting':
      return ui.terminalStatusStarting
    case 'running':
      return ui.terminalStatusRunning
    case 'exited':
      return ui.terminalStatusExited
    case 'error':
      return ui.terminalStatusError
  }
}

export function getPanelKindLabel(kind: PanelKind, locale: SupportedLocale): string {
  const ui = uiText[locale]

  switch (kind) {
    case 'home':
      return ui.panelKindHome
    case 'web':
      return ui.panelKindWeb
    case 'terminal':
      return ui.panelKindTerminal
    case 'workspace':
      return ui.panelKindWorkspace
    case 'tool':
      return ui.panelKindTool
    case 'settings':
      return ui.panelKindSettings
  }
}
