import { BrowserWindow, WebContentsView } from 'electron'
import type { Event } from 'electron'
import { deriveWebContextLabel, normalizeCapturedMessages } from '@ai-workbench/core/desktop/capture'
import type { CustomWebPanelSettings } from '@ai-workbench/core/desktop/settings'
import {
  getWebPanelConfig,
  webPanelConfigs,
  type PanelBounds,
  type WebPanelConfig,
  type WebPanelNavigationAction,
  type WebPanelSnapshot
} from '@ai-workbench/core/desktop/web-panels'

const WEB_CAPTURE_DEBOUNCE_MS = 1_800
const WEB_CAPTURE_INTERVAL_MS = 15_000
const WEB_CAPTURE_MAX_TEXT = 32_000
const WEB_PENDING_INPUT_GRACE_MS = 8_000

const WEB_CONTEXT_SCRAPE_SCRIPT = `(() => {
  const host = location.hostname.toLowerCase()
  const metaDescription =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ??
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
    ''
  const heading = document.querySelector('h1, h2')?.textContent ?? ''

  const cleanText = (value) =>
    (value ?? '')
      .replace(/\\u00a0/g, ' ')
      .replace(/\\n{3,}/g, '\\n\\n')
      .replace(/[ \\t]{2,}/g, ' ')
      .trim()

  const isProbablySidebarNode = (element) => {
    const tokens = [
      element.tagName ?? '',
      element.getAttribute('role') ?? '',
      element.getAttribute('aria-label') ?? '',
      element.className ?? '',
      element.id ?? ''
    ]
      .join(' ')
      .toLowerCase()

    return /sidebar|history|nav|menu|drawer|aside|left-panel|right-panel|conversation-list|chat-list/.test(tokens)
  }

  const cloneAndStripNonContent = () => {
    const root = document.body?.cloneNode(true)
    if (!root) return ''

    const noisySelectors = [
      'nav',
      'aside',
      'header',
      'footer',
      '[role="navigation"]',
      '[aria-label*="history" i]',
      '[aria-label*="sidebar" i]',
      '[aria-label*="menu" i]',
      '[class*="sidebar"]',
      '[class*="history"]',
      '[class*="conversation-list"]',
      '[class*="chat-list"]'
    ]

    for (const selector of noisySelectors) {
      for (const node of root.querySelectorAll(selector)) {
        node.remove()
      }
    }

    for (const node of root.querySelectorAll('*')) {
      if (isProbablySidebarNode(node)) {
        node.remove()
      }
    }

    return cleanText(root.innerText).slice(0, ${WEB_CAPTURE_MAX_TEXT})
  }

  const roleFromElement = (element) => {
    const tokens = [
      element.getAttribute('data-role') ?? '',
      element.getAttribute('aria-label') ?? '',
      element.className ?? '',
      element.id ?? ''
    ]
      .join(' ')
      .toLowerCase()

    if (/user|human|prompt|question/.test(tokens)) return 'user'
    if (/assistant|bot|answer|response|model/.test(tokens)) return 'assistant'
    if (/system/.test(tokens)) return 'system'
    return 'unknown'
  }

  const chatRootCandidates = [
    '[data-testid*="conversation"]',
    '[data-testid*="chat"]',
    'main',
    '[role="main"]',
    '[class*="conversation"]',
    '[class*="chat-content"]',
    '[class*="chatContent"]',
    '[class*="thread"]'
  ]

  const chatRoot =
    chatRootCandidates
      .map((selector) => document.querySelector(selector))
      .find((node) => node instanceof HTMLElement && !isProbablySidebarNode(node)) ?? document.body

  const rawCandidates = [
    ...chatRoot.querySelectorAll('[data-message-id]'),
    ...chatRoot.querySelectorAll('[data-testid*="message"]'),
    ...chatRoot.querySelectorAll('[class*="message"], [class*="Message"]'),
    ...chatRoot.querySelectorAll('[data-role]'),
    ...chatRoot.querySelectorAll('[role="article"]'),
    ...chatRoot.querySelectorAll('article')
  ]

  const seen = new Set()
  const messages = []

  for (const element of rawCandidates) {
    if (!(element instanceof HTMLElement)) continue
    if (isProbablySidebarNode(element)) continue

    const text = cleanText(element.innerText)
    if (text.length < 12 || text.length > 6000) continue
    if (/^今天$|^昨天$|^7 天内$|^30 天内$/.test(text)) continue
    if (/开启新对话|new chat|最近活动|recent activity/i.test(text)) continue

    const key = text.slice(0, 240)
    if (seen.has(key)) continue
    seen.add(key)

    messages.push({
      id:
        element.getAttribute('data-message-id') ??
        element.getAttribute('id') ??
        'message-' + String(messages.length + 1).padStart(3, '0'),
      role: roleFromElement(element),
      text
    })

    if (messages.length >= 40) break
  }

  const bodyText =
    messages.length > 0
      ? messages.map((message) => message.text).join('\\n\\n').slice(0, ${WEB_CAPTURE_MAX_TEXT})
      : cloneAndStripNonContent()

  return {
    title: document.title ?? '',
    url: location.href,
    host,
    bodyText,
    metaDescription,
    heading,
    messages
  }
})()`

interface ManagedWebPanel {
  view: WebContentsView
  snapshot: WebPanelSnapshot
  hasLoaded: boolean
  bounds: PanelBounds | null
  transcriptArtifactId: string | null
  messagesArtifactId: string | null
  captureContextLabel: string | null
  captureUnlocked: boolean
  pendingConversationUnlock: boolean
  pendingUserMessageBaseline: number
  pendingContentBaselineSignature: string | null
  lastObservedUserMessageCount: number
  lastObservedContentSignature: string | null
  lastMeaningfulInputAt: number | null
  lastPersistedCaptureSignature: string | null
  captureTimer: NodeJS.Timeout | null
  captureInterval: NodeJS.Timeout | null
}

interface CaptureCurrentContextOptions {
  force?: boolean
}

interface PersistWebContextPayload {
  transcriptArtifactId: string | null
  messagesArtifactId: string | null
  panelId: string
  title: string
  url: string
  contextLabel: string
  content: string
  metaDescription?: string | null
  messages?: Array<{
    id: string
    role: string
    text: string
  }>
}

function toBounds(bounds: PanelBounds): PanelBounds {
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(0, Math.round(bounds.width)),
    height: Math.max(0, Math.round(bounds.height))
  }
}

function isSafeNavigationTarget(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function isMeaningfulWebInput(input: { type?: string; key?: string; isAutoRepeat?: boolean }): boolean {
  if (input.type !== 'keyDown' || input.isAutoRepeat) {
    return false
  }

  const key = input.key?.trim() ?? ''
  return key === 'Enter' || key === 'Backspace' || key === 'Delete' || key.length === 1
}

function hasRecentPendingWebInput(panel: ManagedWebPanel): boolean {
  return (
    panel.pendingConversationUnlock &&
    panel.lastMeaningfulInputAt !== null &&
    Date.now() - panel.lastMeaningfulInputAt <= WEB_PENDING_INPUT_GRACE_MS
  )
}

function createCaptureSignature(input: { url: string; title: string; rawText: string; messages: Array<{ role: string; text: string }> }): string {
  const normalizedText = input.rawText.replace(/\s+/g, ' ').trim().slice(0, 4000)
  const normalizedMessages = input.messages
    .map((message) => `${message.role}:${message.text.replace(/\s+/g, ' ').trim()}`)
    .join('\n')
    .slice(0, 4000)

  return JSON.stringify({
    url: input.url.trim(),
    title: input.title.trim(),
    rawText: normalizedText,
    messages: normalizedMessages
  })
}

export class WebPanelManager {
  private readonly panels = new Map<string, ManagedWebPanel>()
  private readonly configs = new Map<string, WebPanelConfig>()
  private readonly builtInIds = new Set(webPanelConfigs.map((config) => config.id))
  private activePanelId: string | null = null

  constructor(
    private readonly window: BrowserWindow,
    overrides: Record<string, Pick<WebPanelConfig, 'homeUrl' | 'partition' | 'enabled'>> = {},
    customPanels: CustomWebPanelSettings[] = [],
    private readonly persistWebContext?: (
      payload: PersistWebContextPayload
    ) => { transcriptArtifactId: string | null; messagesArtifactId: string | null } | null
  ) {
    for (const config of webPanelConfigs) {
      const resolvedConfig: WebPanelConfig = {
        ...config,
        ...overrides[config.id]
      }

      this.configs.set(config.id, resolvedConfig)
      if (!resolvedConfig.enabled) {
        continue
      }

      this.panels.set(config.id, this.createManagedPanel(resolvedConfig))
    }

    for (const config of customPanels) {
      this.upsertCustomConfig(config)
    }
  }

  getSnapshot(panelId: string): WebPanelSnapshot | null {
    const config = this.configs.get(panelId) ?? getWebPanelConfig(panelId)
    if (!config) {
      return null
    }

    if (!config.enabled) {
      return {
        panelId: config.id,
        title: config.title,
        homeUrl: config.homeUrl,
        currentUrl: config.homeUrl,
        partition: config.partition,
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        enabled: false,
        lastError: 'Disabled until enabled'
      }
    }

    return this.panels.get(panelId)?.snapshot ?? null
  }

  updateConfig(panelId: string, update: Pick<WebPanelConfig, 'homeUrl' | 'partition' | 'enabled'>): WebPanelSnapshot | null {
    const current = this.configs.get(panelId) ?? getWebPanelConfig(panelId)
    if (!current) {
      return null
    }

    const nextConfig: WebPanelConfig = {
      ...current,
      ...update
    }

    this.configs.set(panelId, nextConfig)
    this.disposeManagedPanel(panelId)

    if (nextConfig.enabled) {
      this.panels.set(panelId, this.createManagedPanel(nextConfig))
    }

    const snapshot = this.getSnapshot(panelId)
    if (snapshot) {
      this.publish(snapshot)
    }

    return snapshot
  }

  syncCustomPanels(customPanels: CustomWebPanelSettings[]): void {
    const nextConfigs = new Map(customPanels.map((panel) => [panel.id, panel]))

    for (const panelId of [...this.configs.keys()]) {
      if (this.builtInIds.has(panelId)) {
        continue
      }

      const nextConfig = nextConfigs.get(panelId)
      if (!nextConfig) {
        this.disposeManagedPanel(panelId)
        this.configs.delete(panelId)
        continue
      }

      this.upsertCustomConfig(nextConfig)
      nextConfigs.delete(panelId)
    }

    for (const panel of nextConfigs.values()) {
      this.upsertCustomConfig(panel)
    }
  }

  async showPanel(panelId: string, bounds: PanelBounds): Promise<WebPanelSnapshot | null> {
    const panel = this.panels.get(panelId)
    if (!panel) {
      return this.getSnapshot(panelId)
    }

    if (this.activePanelId && this.activePanelId !== panelId) {
      this.hidePanel(this.activePanelId)
    }

    if (!panel.hasLoaded) {
      panel.hasLoaded = true
      await panel.view.webContents.loadURL(panel.snapshot.homeUrl)
    }

    panel.bounds = toBounds(bounds)
    panel.view.setBounds(panel.bounds)
    panel.view.setVisible(true)
    panel.view.webContents.focus()
    this.activePanelId = panelId
    this.startCaptureLoop(panel)
    this.scheduleContextCapture(panel, 2_800)
    this.syncNavigationState(panel)
    this.publish(panel.snapshot)
    return panel.snapshot
  }

  hidePanel(panelId: string): void {
    const panel = this.panels.get(panelId)
    if (!panel) {
      return
    }

    void this.captureCurrentContext(panel, { force: true })
    panel.view.setVisible(false)
    this.stopCaptureLoop(panel)
    if (this.activePanelId === panelId) {
      this.activePanelId = null
    }
  }

  async capturePersistedContexts(panelId?: string): Promise<void> {
    if (panelId) {
      const panel = this.panels.get(panelId)
      if (!panel) {
        return
      }

      await this.captureCurrentContext(panel, { force: true })
      return
    }

    for (const panel of this.panels.values()) {
      if (!panel.hasLoaded) {
        continue
      }

      await this.captureCurrentContext(panel, { force: true })
    }
  }

  updateBounds(panelId: string, bounds: PanelBounds): void {
    const panel = this.panels.get(panelId)
    if (!panel) {
      return
    }

    panel.bounds = toBounds(bounds)
    panel.view.setBounds(panel.bounds)
  }

  async navigate(
    panelId: string,
    action: WebPanelNavigationAction,
    url?: string
  ): Promise<WebPanelSnapshot | null> {
    const panel = this.panels.get(panelId)
    if (!panel) {
      return this.getSnapshot(panelId)
    }

    const { webContents } = panel.view

    switch (action) {
      case 'back':
        if (webContents.navigationHistory.canGoBack()) {
          webContents.goBack()
        }
        break
      case 'forward':
        if (webContents.navigationHistory.canGoForward()) {
          webContents.goForward()
        }
        break
      case 'reload':
        webContents.reload()
        break
      case 'home':
        await webContents.loadURL(panel.snapshot.homeUrl)
        break
      case 'load-url':
        if (!url || !isSafeNavigationTarget(url)) {
          panel.snapshot = {
            ...panel.snapshot,
            lastError: 'Blocked unsafe URL'
          }
          this.publish(panel.snapshot)
          return panel.snapshot
        }

        await webContents.loadURL(url)
        break
    }

    this.syncNavigationState(panel)
    this.publish(panel.snapshot)
    return panel.snapshot
  }

  dispose(): void {
    for (const panelId of [...this.panels.keys()]) {
      this.disposeManagedPanel(panelId)
    }
  }

  private createManagedPanel(config: WebPanelConfig): ManagedWebPanel {
    const view = new WebContentsView({
      webPreferences: {
        partition: config.partition,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    view.setVisible(false)
    view.setBackgroundColor('#0b1322')
    this.window.contentView.addChildView(view)

    const managedPanel: ManagedWebPanel = {
      view,
      hasLoaded: false,
      bounds: null,
      transcriptArtifactId: null,
      messagesArtifactId: null,
      captureContextLabel: null,
      captureUnlocked: false,
      pendingConversationUnlock: false,
      pendingUserMessageBaseline: 0,
      pendingContentBaselineSignature: null,
      lastObservedUserMessageCount: 0,
      lastObservedContentSignature: null,
      lastMeaningfulInputAt: null,
      lastPersistedCaptureSignature: null,
      captureTimer: null,
      captureInterval: null,
      snapshot: {
        panelId: config.id,
        title: config.title,
        homeUrl: config.homeUrl,
        currentUrl: config.homeUrl,
        partition: config.partition,
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        enabled: true,
        lastError: null
      }
    }

    this.attachListeners(managedPanel)
    return managedPanel
  }

  private disposeManagedPanel(panelId: string): void {
    const panel = this.panels.get(panelId)
    if (!panel) {
      return
    }

    if (this.activePanelId === panelId) {
      this.activePanelId = null
    }

    this.stopCaptureLoop(panel)

    if (!panel.view.webContents.isDestroyed()) {
      panel.view.webContents.close({ waitForBeforeUnload: false })
    }

    this.panels.delete(panelId)
  }

  private attachListeners(panel: ManagedWebPanel): void {
    const { view } = panel
    const config = this.configs.get(panel.snapshot.panelId) ?? getWebPanelConfig(panel.snapshot.panelId)
    if (!config) {
      return
    }

    view.webContents.setWindowOpenHandler(() => ({
      action: config.allowPopups ? 'allow' : 'deny'
    }))

    view.webContents.on('did-start-loading', () => {
      panel.snapshot = {
        ...panel.snapshot,
        isLoading: true,
        lastError: null
      }
      this.scheduleContextCapture(panel, WEB_CAPTURE_DEBOUNCE_MS)
      this.syncNavigationState(panel)
      this.publish(panel.snapshot)
    })

    view.webContents.on('did-stop-loading', () => {
      panel.snapshot = {
        ...panel.snapshot,
        isLoading: false
      }
      this.scheduleContextCapture(panel)
      this.syncNavigationState(panel)
      this.publish(panel.snapshot)
    })

    view.webContents.on('page-title-updated', (event, title) => {
      event.preventDefault()
      panel.snapshot = {
        ...panel.snapshot,
        title: title || config.title
      }
      this.scheduleContextCapture(panel)
      this.publish(panel.snapshot)
    })

    view.webContents.on('before-input-event', (_event, input) => {
      if (!isMeaningfulWebInput(input)) {
        return
      }

      panel.pendingConversationUnlock = true
      panel.pendingUserMessageBaseline = panel.lastObservedUserMessageCount
      panel.pendingContentBaselineSignature = panel.lastObservedContentSignature
      panel.lastMeaningfulInputAt = Date.now()
      this.scheduleContextCapture(panel, 900)
    })

    view.webContents.on('did-navigate', (_event, url) => {
      if (!hasRecentPendingWebInput(panel)) {
        this.resetConversationCapture(panel)
      }

      panel.snapshot = {
        ...panel.snapshot,
        currentUrl: url,
        lastError: null
      }
      this.scheduleContextCapture(panel)
      this.syncNavigationState(panel)
      this.publish(panel.snapshot)
    })

    view.webContents.on('did-navigate-in-page', (_event, url) => {
      if (!hasRecentPendingWebInput(panel)) {
        this.resetConversationCapture(panel)
      }

      panel.snapshot = {
        ...panel.snapshot,
        currentUrl: url,
        lastError: null
      }
      this.scheduleContextCapture(panel)
      this.syncNavigationState(panel)
      this.publish(panel.snapshot)
    })

    view.webContents.on(
      'did-fail-load',
      (
        _event: Event,
        errorCode: number,
        errorDescription: string,
        validatedURL: string,
        isMainFrame: boolean
      ) => {
        if (!isMainFrame || errorCode === -3) {
          return
        }

        panel.snapshot = {
          ...panel.snapshot,
          currentUrl: validatedURL || panel.snapshot.currentUrl,
          isLoading: false,
          lastError: `${errorCode}: ${errorDescription}`
        }
        this.syncNavigationState(panel)
        this.publish(panel.snapshot)
      }
    )

    view.webContents.on('render-process-gone', (_event, details) => {
      panel.snapshot = {
        ...panel.snapshot,
        isLoading: false,
        lastError: `Renderer exited: ${details.reason}`
      }
      this.stopCaptureLoop(panel)
      this.publish(panel.snapshot)
    })

    view.webContents.on('will-navigate', (event, url) => {
      if (isSafeNavigationTarget(url)) {
        return
      }

      event.preventDefault()
      panel.snapshot = {
        ...panel.snapshot,
        lastError: `Blocked navigation: ${url}`
      }
      this.publish(panel.snapshot)
    })
  }

  private syncNavigationState(panel: ManagedWebPanel): void {
    const { webContents } = panel.view
    const history = webContents.navigationHistory
    panel.snapshot = {
      ...panel.snapshot,
      currentUrl: webContents.getURL() || panel.snapshot.currentUrl,
      canGoBack: history.canGoBack(),
      canGoForward: history.canGoForward()
    }
  }

  private publish(snapshot: WebPanelSnapshot): void {
    if (this.window.isDestroyed()) {
      return
    }

    this.window.webContents.send('web-panel:state-changed', snapshot)
  }

  private startCaptureLoop(panel: ManagedWebPanel): void {
    if (!this.persistWebContext || panel.captureInterval) {
      return
    }

    panel.captureInterval = setInterval(() => {
      this.scheduleContextCapture(panel, 0)
    }, WEB_CAPTURE_INTERVAL_MS)
  }

  private stopCaptureLoop(panel: ManagedWebPanel): void {
    if (panel.captureTimer) {
      clearTimeout(panel.captureTimer)
      panel.captureTimer = null
    }

    if (panel.captureInterval) {
      clearInterval(panel.captureInterval)
      panel.captureInterval = null
    }
  }

  private scheduleContextCapture(panel: ManagedWebPanel, delay = WEB_CAPTURE_DEBOUNCE_MS): void {
    if (!this.persistWebContext) {
      return
    }

    if (panel.captureTimer) {
      clearTimeout(panel.captureTimer)
    }

    panel.captureTimer = setTimeout(() => {
      panel.captureTimer = null
      void this.captureCurrentContext(panel)
    }, delay)
  }

  private resetConversationCapture(panel: ManagedWebPanel): void {
    panel.transcriptArtifactId = null
    panel.messagesArtifactId = null
    panel.captureContextLabel = null
    panel.captureUnlocked = false
    panel.pendingConversationUnlock = false
    panel.pendingUserMessageBaseline = 0
    panel.pendingContentBaselineSignature = null
    panel.lastObservedUserMessageCount = 0
    panel.lastObservedContentSignature = null
    panel.lastMeaningfulInputAt = null
    panel.lastPersistedCaptureSignature = null
  }

  private async captureCurrentContext(
    panel: ManagedWebPanel,
    options: CaptureCurrentContextOptions = {}
  ): Promise<void> {
    const force = options.force === true
    if (
      !this.persistWebContext ||
      panel.snapshot.isLoading ||
      (!force && this.activePanelId !== panel.snapshot.panelId)
    ) {
      return
    }

    const { webContents } = panel.view
    if (webContents.isDestroyed() || webContents.getURL().length === 0) {
      return
    }

    try {
      const result = (await webContents.executeJavaScript(WEB_CONTEXT_SCRAPE_SCRIPT, true)) as
        | {
            title?: string
            url?: string
            host?: string
            bodyText?: string
            metaDescription?: string
            heading?: string
            messages?: Array<{
              id?: string
              role?: string
              text?: string
            }>
          }
        | null

      const url = result?.url?.trim() || panel.snapshot.currentUrl
      const host = result?.host?.trim().toLowerCase() || ''
      const title = result?.title?.trim() || panel.snapshot.title
      const rawText = [result?.heading?.trim(), result?.bodyText?.trim()].filter(Boolean).join('\n\n').trim()
      const messages = normalizeCapturedMessages(result?.messages)
      const userMessages = messages.filter((message) => message.role === 'user')
      const assistantMessages = messages.filter((message) => message.role === 'assistant')
      const conversationLikeContent =
        messages.length >= 2 ||
        (userMessages.length > 0 && assistantMessages.length > 0) ||
        (/chatgpt|claude|gemini|deepseek|doubao|kimi|yuanbao|tongyi|copilot/.test(host) &&
          rawText.length >= 120)
      const currentCaptureSignature = createCaptureSignature({
        url,
        title,
        rawText,
        messages
      })
      const contentChangedSinceInput =
        Boolean(panel.pendingContentBaselineSignature) && currentCaptureSignature !== panel.pendingContentBaselineSignature

      if (
        panel.pendingConversationUnlock &&
        (
          userMessages.length > panel.pendingUserMessageBaseline ||
          (hasRecentPendingWebInput(panel) && rawText.length >= 120 && contentChangedSinceInput)
        )
      ) {
        panel.captureUnlocked = true
        panel.pendingConversationUnlock = false
        panel.pendingUserMessageBaseline = userMessages.length
        panel.pendingContentBaselineSignature = currentCaptureSignature
      }

      panel.lastObservedUserMessageCount = userMessages.length
      panel.lastObservedContentSignature = currentCaptureSignature

      if (force && !panel.captureUnlocked && conversationLikeContent) {
        panel.captureUnlocked = true
        panel.pendingConversationUnlock = false
      }

      if (!url || !panel.captureUnlocked) {
        return
      }

      if (userMessages.length === 0 && rawText.length < 120) {
        return
      }

      const contextLabel = deriveWebContextLabel(url, title, messages)
      if (panel.captureContextLabel !== contextLabel) {
        panel.transcriptArtifactId = null
        panel.messagesArtifactId = null
        panel.lastPersistedCaptureSignature = null
      }
      panel.captureContextLabel = contextLabel

      if (panel.lastPersistedCaptureSignature === currentCaptureSignature) {
        return
      }

      const persisted = this.persistWebContext({
          transcriptArtifactId: panel.transcriptArtifactId,
          messagesArtifactId: panel.messagesArtifactId,
          panelId: panel.snapshot.panelId,
          title,
          url,
          contextLabel,
          content: rawText,
          metaDescription: result?.metaDescription?.trim() || null,
          messages
        })

      panel.transcriptArtifactId = persisted?.transcriptArtifactId ?? panel.transcriptArtifactId
      panel.messagesArtifactId = persisted?.messagesArtifactId ?? panel.messagesArtifactId
      panel.lastPersistedCaptureSignature = currentCaptureSignature
    } catch {
      // Ignore transient script failures while remote apps are hydrating.
    }
  }

  private upsertCustomConfig(config: CustomWebPanelSettings): void {
    const resolvedConfig: WebPanelConfig = {
      id: config.id,
      title: config.title,
      homeUrl: config.homeUrl,
      partition: config.partition,
      enabled: config.enabled
    }
    const previousConfig = this.configs.get(config.id)
    const hasChanged =
      !previousConfig ||
      previousConfig.title !== resolvedConfig.title ||
      previousConfig.homeUrl !== resolvedConfig.homeUrl ||
      previousConfig.partition !== resolvedConfig.partition ||
      previousConfig.enabled !== resolvedConfig.enabled

    this.configs.set(config.id, resolvedConfig)

    if (!hasChanged) {
      return
    }

    this.disposeManagedPanel(config.id)

    if (resolvedConfig.enabled) {
      this.panels.set(config.id, this.createManagedPanel(resolvedConfig))
    }

    const snapshot = this.getSnapshot(config.id)
    if (snapshot) {
      this.publish(snapshot)
    }
  }
}
