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
      title: '项目首页',
      group: '工作台',
      summary: '先选择当前工作区位置，再从网页、CLI 和工作区检查面继续工作。',
      nextStep: '工作区路径会持久保存，网页捕获、CLI 会话和工件索引都会写入这里。',
      delivery: '首页承接工作区选择、当前工作区状态和档案入口。',
      signal: '工作区在线'
    },
    'deepseek-web': {
      title: 'DeepSeek 网页',
      group: '网页应用',
      summary: 'DeepSeek 现已通过独立 WebContentsView 接入，并使用 persist partition 保持登录态。',
      nextStep: '网页会话可通过工作区同步保存，并与当前线程和范围元数据关联。',
      delivery: '托管网页面板：安全导航、持久分区、捕获同步与配置恢复。',
      signal: '持久网页会话'
    },
    'minimax-web': {
      title: 'MiniMax 网页',
      group: '网页应用',
      summary: 'MiniMax 作为内置网页预设接入托管 WebContentsView，并使用 persist partition 保持登录态。',
      nextStep: '需要固定 MiniMax 入口时直接打开，也可以通过配置面板禁用或调整主页。',
      delivery: '托管网页面板：内置 MiniMax 预设、持久分区、安全导航与配置覆盖。',
      signal: '持久网页会话'
    },
    'codex-cli': {
      title: 'Codex CLI',
      group: 'CLI 智能体',
      summary: 'Codex CLI 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
      nextStep: 'CLI 会话会携带当前工作区与线程身份，按设置优先检索相关上下文。',
      delivery: '托管终端面板：PTY 会话、配置持久化、终端行为设置与检索审计。',
      signal: 'Codex 终端在线'
    },
    'claude-code': {
      title: 'Claude Code',
      group: 'CLI 智能体',
      summary: 'Claude Code 已通过 PowerShell + node-pty + xterm.js 接入为真实常驻终端面板。',
      nextStep: 'CLI 会话会携带当前工作区与线程身份，按设置优先检索相关上下文。',
      delivery: '托管终端面板：PTY 会话、配置持久化、终端行为设置与检索审计。',
      signal: 'Claude 终端在线'
    },
    artifacts: {
      title: '工件',
      group: '工作区',
      summary: '工作区清单、线程、搜索、筛选、多选和工件预览已接入检查面。',
      nextStep: '用这里检查保存的手动、网页、终端和检索审计记录。',
      delivery: '工作区检查面：索引、线程、范围、工件预览和修复入口。',
      signal: '清单在线'
    },
    logs: {
      title: '日志',
      group: '工作区',
      summary: '工作区日志检查面可按 logs/ 桶位查看终端转录、检索审计和其他日志类记录。',
      nextStep: '用这里筛选、搜索和预览归档到 logs/ 的审计或排障材料。',
      delivery: '工作区日志检查面：日志桶筛选、元数据列表和文本预览。',
      signal: '日志检查在线'
    },
    settings: {
      title: '设置',
      group: '系统',
      summary: '设置面板承接应用级偏好项，当前版本已支持工作区档案、语言、主题、CLI 前置命令、终端行为与跨会话连续性设置。',
      nextStep: '继续根据真实使用补充更细粒度的应用偏好。',
      delivery: '设置面板：工作区档案、外观、终端行为、跨会话连续性和 CLI 检索默认值。',
      signal: '偏好设置在线'
    }
  },
  'en-US': {
    home: {
      title: 'Project Home',
      group: 'Workbench',
      summary: 'Choose the current workspace location first, then continue from web, CLI, and Workspace inspection surfaces.',
      nextStep: 'The workspace path is persisted, and web captures, CLI sessions, and artifact indexes are written there.',
      delivery: 'Home owns workspace selection, current workspace status, and profile entry points.',
      signal: 'Workspace live'
    },
    'deepseek-web': {
      title: 'DeepSeek Web',
      group: 'Web Apps',
      summary: 'DeepSeek now runs through an isolated WebContentsView with a persist partition for login retention.',
      nextStep: 'Web sessions can be saved through Workspace Sync and linked with the current thread and scope metadata.',
      delivery: 'Managed web panels: safe navigation, persist partitions, capture sync, and configuration restore.',
      signal: 'Persistent web session'
    },
    'minimax-web': {
      title: 'MiniMax Web',
      group: 'Web Apps',
      summary: 'MiniMax is available as a built-in managed WebContentsView preset with a persist partition for login retention.',
      nextStep: 'Open MiniMax directly when you want a fixed entry, or disable and adjust its home page from configuration.',
      delivery: 'Managed web panel: built-in MiniMax preset, persist partition, safe navigation, and configuration overrides.',
      signal: 'Persistent web session'
    },
    'codex-cli': {
      title: 'Codex CLI',
      group: 'CLI Agents',
      summary: 'Codex CLI is connected as a live persistent terminal through PowerShell, node-pty, and xterm.js.',
      nextStep: 'CLI sessions carry the current workspace and thread identity, then use settings to prefer relevant context.',
      delivery: 'Managed terminal panels: PTY sessions, persisted configuration, terminal behavior settings, and retrieval audit.',
      signal: 'Codex terminal live'
    },
    'claude-code': {
      title: 'Claude Code',
      group: 'CLI Agents',
      summary: 'Claude Code is connected as a live persistent terminal through PowerShell, node-pty, and xterm.js.',
      nextStep: 'CLI sessions carry the current workspace and thread identity, then use settings to prefer relevant context.',
      delivery: 'Managed terminal panels: PTY sessions, persisted configuration, terminal behavior settings, and retrieval audit.',
      signal: 'Claude terminal live'
    },
    artifacts: {
      title: 'Artifacts',
      group: 'Workspace',
      summary: 'Workspace manifests, threads, search, filtering, multi-select, and artifact preview are available in the inspector.',
      nextStep: 'Use this surface to inspect saved manual, web, terminal, and retrieval-audit records.',
      delivery: 'Workspace inspector: indexes, threads, scopes, artifact preview, and repair entry points.',
      signal: 'Manifest live'
    },
    logs: {
      title: 'Logs',
      group: 'Workspace',
      summary: 'The Workspace Logs inspector shows terminal transcripts, retrieval audits, and other records stored under logs/.',
      nextStep: 'Use this surface to filter, search, and preview audit or debugging material archived under logs/.',
      delivery: 'Workspace Logs inspector: log-bucket filtering, metadata rows, and text preview.',
      signal: 'Logs inspector live'
    },
    settings: {
      title: 'Settings',
      group: 'System',
      summary: 'The settings panel owns app-level preferences for workspace profiles, language, theme, CLI prelude commands, terminal behavior, and cross-session continuity defaults.',
      nextStep: 'Continue adding narrower app preferences as real usage calls for them.',
      delivery: 'Settings panel: workspace profiles plus appearance, terminal behavior, and continuity defaults.',
      signal: 'Preferences live'
    }
  }
}

const sectionTexts: Record<SupportedLocale, Record<string, SectionText>> = {
  'zh-CN': {
    overview: {
      title: '工作台',
      caption: '当前工作台已接入真实网页、终端、工作区检查和设置同步能力。'
    },
    web: {
      title: '网页应用',
      caption: 'DeepSeek、MiniMax 与自定义网页共用同一套托管网页面板生命周期。'
    },
    agents: {
      title: 'CLI 智能体',
      caption: 'Codex CLI 与 Claude Code 现在都由主进程 PTY 托管，切换标签时会话不会丢。'
    },
    workspace: {
      title: '工作区',
      caption: '工作区已经落地到真实目录与 manifest，并支持工件、日志、预览、线程和自动检索检查。'
    },
    system: {
      title: '系统',
      caption: '应用级配置集中在这里，当前已支持工作区档案、终端行为与连续性设置。'
    }
  },
  'en-US': {
    overview: {
      title: 'Workbench',
      caption: 'The workbench has live web, terminal, Workspace inspection, and settings synchronization surfaces.'
    },
    web: {
      title: 'Web Apps',
      caption: 'DeepSeek, MiniMax, and custom webpages share one managed web-panel lifecycle.'
    },
    agents: {
      title: 'CLI Agents',
      caption: 'Codex CLI and Claude Code are both owned by the main-process PTY, so sessions survive tab switches.'
    },
    workspace: {
      title: 'Workspace',
      caption: 'The workspace exists on disk with manifests plus artifact, log, preview, thread, and automatic retrieval inspection.'
    },
    system: {
      title: 'System',
      caption: 'App-level configuration lives here, including workspace profiles, terminal behavior, and live continuity defaults.'
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
  'zh-CN': {},
  'en-US': {}
}

const uiText = {
  'zh-CN': {
    appTitle: 'DeepWork',
    appSubtitle: '原生网页与 CLI 工作台',
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
    save: '保存',
    cancel: '取消',
    deleteSession: '删除会话',
    deleteSessionConfirm: '确认删除这组会话及其在工作区中的所有记录吗？此操作不能撤销。',
    deleteSessionWarning: '删除后会移除这组会话在工作区中的所有已保存记录，此操作不能撤销。',
    deleteSessionDone: '已从工作区删除该会话。',
    confirmDelete: '确认删除',
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
    currentSessionThread: '当前会话线程',
    noActiveThread: '未选择线程',
    sessionThreadPending: '尚未绑定线程',
    sessionContextPending: '尚无上下文',
    sessionScope: '会话范围',
    sessionScopePending: '尚未保存范围',
    openInWorkspace: '检查工作区',
    continuityFresh: '新会话',
    continuityPending: '等待归档',
    continuityLinked: '已链接上下文',
    continuityFreshHint: '直接继续对话；首次保存后，工作区会自动接住这段上下文。',
    continuityPendingHint: '系统已经识别到当前会话，保存首个范围后会自动建立连续性。',
    continuityLinkedHint: '继续在这里对话即可；工作区只在检查、调试或修复时再打开。',
    threadContinuity: '上下文连续线程',
    threadList: '线程列表',
    threadCreate: '新建线程',
    threadCreateTitle: '新线程标题',
    threadCreatePlaceholder: '可留空自动生成标题',
    threadCreateSaved: '已在工作区中创建新线程。',
    threadCreatePrompt: '输入新线程标题（可留空自动生成）',
    threadContinue: '继续',
    threadRename: '重命名线程',
    threadRenameSaved: '线程标题已更新。',
    threadRenamePrompt: '输入线程的新标题',
    threadTitle: '线程标题',
    threadTitlePlaceholder: '输入线程标题',
    threadShowAll: '查看全部范围',
    threadEmptyHint: '还没有线程，先新建一个。',
    threadScopeCount: '个范围',
    threadArtifactCount: '条记录',
    threadDerived: '回填线程',
    threadExplicit: '显式线程',
    threadReassignSaved: '已将会话调整到目标线程。',
    threadMutationWorkspaceOnly: '仅可在工作区中修改线程',
    manageThreadsInWorkspace: '在工作区中管理线程',
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
    retrievalContext: '检索上下文',
    retrievalQuery: '查询',
    retrievalQueryUnknown: '未记录查询',
    retrievalMode: '检索模式',
    retrievalModeThreadLocal: '当前线程',
    retrievalModeGlobalFallback: '全局回退',
    retrievalModeGlobalPreferred: '全局优先',
    retrievalModeUnknown: '未知',
    retrievalOutcomeSelectedScope: '已选择范围',
    retrievalOutcomeGlobalFallback: '全局回退已选择',
    retrievalOutcomeGlobalPreferred: '全局优先已选择',
    retrievalOutcomeNoMatch: '未匹配',
    retrievalOutcomeSuperseded: '已被后续检索替换',
    retrievalSelectedScope: '选中范围',
    retrievalNoSelection: '未附加范围',
    retrievalCandidates: '候选数量',
    retrievalAudit: '审计引用',
    retrievalAuditUnavailable: '未记录审计',
    retrievalReason: '原因',
    retrievalInspectionHint: '这里只显示检索元数据；需要检查原始审计或记录时从 Workspace 日志面进入。',
    restartToApply: '重启以应用',
    terminalConfigApplyHint: '保存会立即更新已保存配置，但不会打断当前 PTY。新的配置会在下次启动或手动重启后生效。',
    builtInTerminalConfigHint:
      '内置 CLI 的 shell 和引导流程由应用托管。留空工作目录会继续使用当前工作区；留空启动命令会回退到内置默认命令。',
    workspaceLive: '工作区实时状态',
    workspaceIntro: '工作区是对话连续性的二级检查面。网页和 CLI 对话是主入口，只有在你需要确认、调试或修复时才来这里。',
    workspaceSimpleIntro: '这里会自动保存网页对话、CLI 会话和结构化消息索引。模型优先通过当前线程、会话范围和自然提及来感知上下文。',
    currentWorkspace: '当前工作区',
    homeWorkspaceTitle: '工作区位置',
    homeWorkspaceHint: '选择一个你自己管理的目录。网页捕获、CLI 会话、工件、日志和检索索引都会写入这个工作区。',
    homeWorkspaceNotSelected: '尚未选择工作区',
    homeWorkspaceContinuityHint: '普通工作流从网页或 CLI 面板继续；首页只负责确认当前写入位置，工作区面板用于检查和修复上下文。',
    savedContexts: '已保存上下文',
    savedItems: '已保存内容',
    workspaceSecondaryRole: '二级检查面',
    workspaceSecondaryHint: '继续在网页或 CLI 里对话即可；这里主要用于确认系统抓到了什么，或者修复线程组织。',
    workspaceManageContinuity: '线程与修复',
    workspaceManageContinuityHint: '只有在连续性有歧义时，才在这里新建线程、重命名线程或把范围重挂到别的线程。',
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
    cliCommandMaintenanceScan: '扫描工作区维护诊断',
    cliCommandMaintenanceRebuild: '检查维护诊断并准备派生索引重建',
    workspaceMaintenance: '工作区维护',
    workspaceMaintenanceHint: '维护工具只用于检查和修复索引漂移；普通对话和预览流程不需要打开这里。',
    workspaceMaintenanceUnavailable: '选择工作区后才能运行维护操作。',
    maintenanceScan: '扫描',
    maintenanceRebuild: '重建索引',
    maintenanceRepair: '安全修复',
    maintenanceRepairArm: '准备安全修复',
    maintenanceNoReport: '尚未运行维护扫描。',
    maintenanceNoFindings: '未发现维护问题。',
    maintenanceFindings: '维护发现',
    maintenanceActions: '维护动作',
    maintenanceChangedFiles: '变更文件',
    maintenanceRepairable: '可安全修复',
    maintenanceFollowUp: '需人工跟进',
    maintenanceFindingUninitialized: '未初始化工作区',
    maintenanceFindingMissingFile: '缺失文件',
    maintenanceFindingOrphanedRecord: '孤立记录',
    maintenanceFindingStaleIndex: '派生索引过期',
    maintenanceFindingDuplicateId: '重复 ID',
    maintenanceFindingUnsafePath: '不安全路径',
    bucket: '桶位',
    projectId: '项目 ID',
    workspaceRoot: '工作区根目录',
    contextIndex: '上下文索引',
    threadIndex: '线程索引',
    threadManifests: '线程清单目录',
    sourceOrigins: '来源索引',
    sessionList: '会话列表',
    currentSelectionSummary: '当前上下文摘要',
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
    latestArtifact: '最新工件',
    contextSelectionHint: 'CLI 正常工作时应自动按需检索；这里的来源选择主要用于人工检查或排障。',
    artifactSelection: '工件选择',
    selectedCount: '已选数量',
    previewArtifact: '预览',
    selectedArtifacts: '已选工件',
    selectedArtifactsEmpty: '还没有选中任何工件。',
    artifactPreview: '工件预览',
    artifactPreviewHint: '先选择一条工件。',
    artifactPreviewEmpty: '等待选择要预览的工件。',
    artifactPreviewLoading: '正在加载工件预览...',
    artifactPreviewUnavailable: '未能读取这条工件，可能已被删除或暂时不可用。',
    artifactPreviewUnsupported: '该工件类型暂不支持文本预览。',
    logSources: '日志来源',
    logRecords: '日志记录',
    logPreview: '日志预览',
    logInspectionHint: '日志面用于检查终端转录、检索审计和排障记录，不会把内容发送给 CLI。',
    logsEmptyHint: '当前工作区还没有保存日志记录。',
    noLogsForFilter: '当前筛选条件下还没有可选日志。',
    cliSelfSearch: 'CLI 自动工作区检索',
    cliSelfSearchHint: 'CLI 现在会默认进入当前工作区，并在你提到某个会话或来源时优先自动查索引；下面这些命令主要用于显式检查或排障。',
    defaultContextLabel: '默认上下文',
    noArtifactsForFilter: '当前筛选条件下还没有可选工件。',
    manifest: '清单文件',
    artifactsIndexed: '已索引工件',
    artifactsBucket: '工件桶',
    outputsBucket: '输出桶',
    logsBucket: '日志桶',
    workspaceInitialized: '工作区已初始化',
    workspaceInitializationPending: '工作区初始化中',
    rules: '规则文件',
    rulesPathPending: '初始化完成后显示规则路径',
    lastSaved: '最近保存',
    error: '错误',
    recentArtifacts: '最近工件',
    shownCount: '已显示',
    saveClipboardHint: '使用“保存剪贴板”创建第一条受追踪的工件。',
    applicationSettings: '应用设置',
    settingsIntro: '这里可以配置应用级偏好项。当前版本已支持工作区档案、语言、浅色/深色/跟随系统、CLI 启动前置命令、终端行为，以及跨会话连续性设置。',
    workspaceProfiles: '工作区档案',
    workspaceProfilesHint: '保存常用工作区，按项目切换，并指定下次启动时自动恢复的工作区。',
    activeWorkspace: '当前工作区',
    addWorkspaceProfile: '保存当前工作区',
    updateWorkspaceProfile: '更新档案',
    openWorkspaceProfile: '打开',
    setDefaultWorkspaceProfile: '设为启动默认',
    defaultWorkspaceProfile: '启动默认',
    removeWorkspaceProfile: '移除档案',
    workspaceProfileName: '档案名称',
    workspaceProfileNamePlaceholder: '例如：DeepWork 默认项目',
    workspaceProfilesEmpty: '还没有保存的工作区档案。',
    workspaceProfileCurrent: '当前',
    workspaceProfileUnavailable: '工作区路径不可用。',
    workspaceProfileSaved: '工作区档案已保存。',
    workspaceProfileRemoved: '工作区档案已移除。',
    workspaceProfileDefaultSaved: '启动默认工作区已更新。',
    workspaceProfileOpened: '工作区档案已打开。',
    workspaceProfileNeedsRoot: '请先选择一个工作区。',
    workspaceProfileNeedsName: '请输入档案名称。',
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
    continuitySettingsNote: '只影响后续新会话或新捕获，不会改写已有工件的线程归属。',
    cliRetrievalPreference: 'CLI 检索偏好',
    cliRetrievalPreferenceHint: '决定受管 CLI 在需要历史上下文时，是先查当前线程还是直接全局检索。',
    retrievalActiveThreadFirst: '先查当前线程',
    retrievalGlobalFirst: '直接全局检索',
    retrievalSettingsNote: '设置会在后续检索中生效，并保留在检索审计记录里。',
    terminalBehavior: '终端行为',
    terminalBehaviorHint: '控制所有受管终端的滚动缓冲和剪贴板交互，不会重启正在运行的 PTY。',
    terminalScrollbackLines: '滚动缓冲行数',
    copyOnSelection: '选中文本时自动复制',
    copyOnSelectionHint: '开启后，在终端中选中文本会自动写入剪贴板。',
    confirmMultilinePaste: '多行粘贴前确认',
    confirmMultilinePasteHint: '开启后，多行内容写入终端前会先请求确认。',
    confirmMultilinePastePrompt: '将多行内容粘贴到终端？',
    cliStartupPrelude: 'CLI 启动前置命令',
    cliStartupPreludeHint: '这些命令会在启动 Codex / Claude 之前依次执行。',
    cliStartupPreludePlaceholder: '每行一条命令，例如：\nproxy_on',
    languageSwitchNote: '设置会立即生效，并在重启应用后继续保留。',
    upcomingPreferences: '后续设置项',
    scaffoldedPlaceholders: '已搭建的占位能力',
    notes: '备注',
    freeFormPlaceholder: '自由文本占位',
    settingsRoadmapNotes: '设置路线备注',
    phaseSnapshot: '状态快照',
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
    homeChecklistShell: 'Electron Shell 已就绪',
    homeChecklistWeb: '网页面板管理器已就绪',
    homeChecklistTerminal: '终端管理器已就绪',
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
    save: 'Save',
    cancel: 'Cancel',
    deleteSession: 'Delete Session',
    deleteSessionConfirm: 'Delete this session and all of its records from the workspace? This cannot be undone.',
    deleteSessionWarning: 'Deleting this session removes all saved workspace records for it and cannot be undone.',
    deleteSessionDone: 'The session was removed from Workspace.',
    confirmDelete: 'Confirm Delete',
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
    currentSessionThread: 'Current Session Thread',
    noActiveThread: 'No thread selected',
    sessionThreadPending: 'No linked thread yet',
    sessionContextPending: 'No linked context yet',
    sessionScope: 'Session Scope',
    sessionScopePending: 'Scope not saved yet',
    openInWorkspace: 'Open In Workspace',
    continuityFresh: 'Fresh Session',
    continuityPending: 'Awaiting Save',
    continuityLinked: 'Linked Context',
    continuityFreshHint: 'Keep talking here. Workspace will attach the first saved scope automatically.',
    continuityPendingHint: 'The app has identified this session and will link continuity after the first saved scope.',
    continuityLinkedHint: 'Keep talking here. Open Workspace only when you want to inspect, debug, or repair continuity.',
    threadContinuity: 'Context Threads',
    threadList: 'Threads',
    threadCreate: 'New Thread',
    threadCreateTitle: 'New Thread Title',
    threadCreatePlaceholder: 'Leave blank to auto-name the thread',
    threadCreateSaved: 'A new thread was created in Workspace.',
    threadCreatePrompt: 'Enter a title for the new thread (leave blank to auto-name it)',
    threadContinue: 'Continue',
    threadRename: 'Rename Thread',
    threadRenameSaved: 'The thread title was updated.',
    threadRenamePrompt: 'Enter a new title for this thread',
    threadTitle: 'Thread Title',
    threadTitlePlaceholder: 'Enter a thread title',
    threadShowAll: 'Show All Scopes',
    threadEmptyHint: 'No threads yet. Create one first.',
    threadScopeCount: 'scopes',
    threadArtifactCount: 'artifacts',
    threadDerived: 'Backfilled',
    threadExplicit: 'Explicit',
    threadReassignSaved: 'The session moved to the selected thread.',
    threadMutationWorkspaceOnly: 'Thread edits stay in Workspace',
    manageThreadsInWorkspace: 'Manage Threads In Workspace',
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
    retrievalContext: 'Retrieval Context',
    retrievalQuery: 'Query',
    retrievalQueryUnknown: 'Query not recorded',
    retrievalMode: 'Retrieval Mode',
    retrievalModeThreadLocal: 'Thread local',
    retrievalModeGlobalFallback: 'Global fallback',
    retrievalModeGlobalPreferred: 'Global preferred',
    retrievalModeUnknown: 'Unknown',
    retrievalOutcomeSelectedScope: 'Selected scope',
    retrievalOutcomeGlobalFallback: 'Global fallback selected',
    retrievalOutcomeGlobalPreferred: 'Global preferred selected',
    retrievalOutcomeNoMatch: 'No match',
    retrievalOutcomeSuperseded: 'Superseded',
    retrievalSelectedScope: 'Selected Scope',
    retrievalNoSelection: 'No scope attached',
    retrievalCandidates: 'Candidates',
    retrievalAudit: 'Audit Reference',
    retrievalAuditUnavailable: 'No audit recorded',
    retrievalReason: 'Reason',
    retrievalInspectionHint: 'Only retrieval metadata is shown here. Inspect raw audit records from Workspace logs.',
    restartToApply: 'Restart To Apply',
    terminalConfigApplyHint:
      'Saving updates the persisted launch configuration immediately, but the current PTY keeps running until you start or restart the panel explicitly.',
    builtInTerminalConfigHint:
      'Built-in CLI shell ownership and bootstrap stay managed by the app. Leave the working directory blank to keep using the workspace root, and leave the startup command blank to fall back to the managed default.',
    workspaceLive: 'Workspace Live',
    workspaceIntro: 'Workspace is the secondary inspection surface for continuity. Web and CLI conversations stay primary; open this area only when you need to inspect, debug, or repair.',
    workspaceSimpleIntro: 'This area automatically saves web conversations, CLI sessions, and structured message indexes. Models should mainly infer continuity from the active thread, session scope, and lightweight mentions.',
    currentWorkspace: 'Current Workspace',
    homeWorkspaceTitle: 'Workspace Location',
    homeWorkspaceHint: 'Choose a directory you control. Web captures, CLI sessions, artifacts, logs, and retrieval indexes are written into this workspace.',
    homeWorkspaceNotSelected: 'No workspace selected',
    homeWorkspaceContinuityHint: 'Normal work continues from web or CLI panels. Home confirms the current write location, while Workspace is for inspection and repair.',
    savedContexts: 'Saved Contexts',
    savedItems: 'Saved Items',
    workspaceSecondaryRole: 'Secondary Inspection',
    workspaceSecondaryHint: 'Keep working from the web or CLI conversation. Use this surface when you need to confirm what was captured or repair thread organization.',
    workspaceManageContinuity: 'Thread Repair',
    workspaceManageContinuityHint: 'Create, rename, or reassign threads here only when continuity becomes ambiguous.',
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
    cliCommandMaintenanceScan: 'scan workspace maintenance diagnostics',
    cliCommandMaintenanceRebuild: 'check maintenance diagnostics before derived-index rebuild',
    workspaceMaintenance: 'Workspace Maintenance',
    workspaceMaintenanceHint: 'Maintenance tools are for inspecting and repairing index drift. Normal conversation and preview flows do not need this section.',
    workspaceMaintenanceUnavailable: 'Select a workspace before running maintenance operations.',
    maintenanceScan: 'Scan',
    maintenanceRebuild: 'Rebuild Indexes',
    maintenanceRepair: 'Safe Repair',
    maintenanceRepairArm: 'Prepare Safe Repair',
    maintenanceNoReport: 'No maintenance scan has run yet.',
    maintenanceNoFindings: 'No maintenance issues found.',
    maintenanceFindings: 'Maintenance Findings',
    maintenanceActions: 'Maintenance Actions',
    maintenanceChangedFiles: 'Changed Files',
    maintenanceRepairable: 'Safe repair',
    maintenanceFollowUp: 'Manual follow-up',
    maintenanceFindingUninitialized: 'Uninitialized workspace',
    maintenanceFindingMissingFile: 'Missing file',
    maintenanceFindingOrphanedRecord: 'Orphaned record',
    maintenanceFindingStaleIndex: 'Stale derived index',
    maintenanceFindingDuplicateId: 'Duplicate ID',
    maintenanceFindingUnsafePath: 'Unsafe path',
    bucket: 'Bucket',
    projectId: 'Project ID',
    workspaceRoot: 'Workspace Root',
    contextIndex: 'Context Index',
    threadIndex: 'Thread Index',
    threadManifests: 'Thread Manifests',
    sourceOrigins: 'Source Index',
    sessionList: 'Sessions',
    currentSelectionSummary: 'Selected Context Summary',
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
    logSources: 'Log Sources',
    logRecords: 'Log Records',
    logPreview: 'Log Preview',
    logInspectionHint: 'Logs are for inspecting terminal transcripts, retrieval audits, and debugging records; browsing does not send content to the CLI.',
    logsEmptyHint: 'No log records have been saved in this workspace yet.',
    noLogsForFilter: 'There are no selectable logs for the current filter.',
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
    applicationSettings: 'Application Settings',
    settingsIntro: 'Configure app-level preferences here. This version supports workspace profiles, language, light/dark/system appearance, CLI startup prelude commands, terminal behavior, and cross-session continuity defaults.',
    workspaceProfiles: 'Workspace Profiles',
    workspaceProfilesHint: 'Save common workspaces, switch by project, and choose which workspace should reopen on startup.',
    activeWorkspace: 'Active Workspace',
    addWorkspaceProfile: 'Save Current Workspace',
    updateWorkspaceProfile: 'Update Profile',
    openWorkspaceProfile: 'Open',
    setDefaultWorkspaceProfile: 'Set Startup Default',
    defaultWorkspaceProfile: 'Startup Default',
    removeWorkspaceProfile: 'Remove Profile',
    workspaceProfileName: 'Profile Name',
    workspaceProfileNamePlaceholder: 'For example: DeepWork default project',
    workspaceProfilesEmpty: 'No workspace profiles saved yet.',
    workspaceProfileCurrent: 'Current',
    workspaceProfileUnavailable: 'Workspace path is unavailable.',
    workspaceProfileSaved: 'Workspace profile saved.',
    workspaceProfileRemoved: 'Workspace profile removed.',
    workspaceProfileDefaultSaved: 'Startup default workspace updated.',
    workspaceProfileOpened: 'Workspace profile opened.',
    workspaceProfileNeedsRoot: 'Choose a workspace first.',
    workspaceProfileNeedsName: 'Enter a profile name.',
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
    terminalBehavior: 'Terminal Behavior',
    terminalBehaviorHint: 'Controls scrollback and clipboard interaction across managed terminals without restarting running PTYs.',
    terminalScrollbackLines: 'Scrollback Lines',
    copyOnSelection: 'Copy On Selection',
    copyOnSelectionHint: 'When enabled, selecting terminal text writes it to the clipboard automatically.',
    confirmMultilinePaste: 'Confirm Multi-line Paste',
    confirmMultilinePasteHint: 'When enabled, multi-line text asks for confirmation before it is written to the terminal.',
    confirmMultilinePastePrompt: 'Paste multi-line text into this terminal?',
    cliStartupPrelude: 'CLI Startup Prelude',
    cliStartupPreludeHint: 'These commands run before Codex or Claude starts.',
    cliStartupPreludePlaceholder: 'One command per line, for example:\nproxy_on',
    languageSwitchNote: 'The setting applies immediately and stays persisted after restart.',
    upcomingPreferences: 'Upcoming Preferences',
    scaffoldedPlaceholders: 'Scaffolded placeholders',
    notes: 'Notes',
    freeFormPlaceholder: 'Free-form placeholder',
    settingsRoadmapNotes: 'Settings Roadmap Notes',
    phaseSnapshot: 'Status Snapshot',
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
    case 'settings':
      return ui.panelKindSettings
  }
}
