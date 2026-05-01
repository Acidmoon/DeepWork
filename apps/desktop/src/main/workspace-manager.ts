import { basename, join } from 'node:path'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import {
  buildManagedWorkspaceInstructionBlocks,
  buildManagedWorkspaceRuleTemplates,
  type ManagedWorkspaceInstructionBlockKey,
  type ManagedWorkspaceRuleTemplateKey
} from '@ai-workbench/core/desktop/managed-workspace-content'
import type { ThreadContinuationPreference } from '@ai-workbench/core/desktop/settings'
import { planImplicitThreadContinuation } from '@ai-workbench/core/desktop/workspace-continuity'
import {
  buildManagedSessionContinuitySummary,
  getArtifactScopeId,
  getArtifactThreadId,
  sanitizeOrigin,
  type ArtifactContentPayload,
  type ArtifactManifest,
  type ContextThreadSummary,
  type ManagedSessionContinuityInput,
  type ManagedSessionContinuitySummary,
  type SaveClipboardOptions,
  type SaveClipboardResult,
  type WorkspaceSnapshot
} from '@ai-workbench/core/desktop/workspace'
import { syncManagedInstructionFile } from './workspace-manager/managed-workspace-file-sync'
import {
  buildPreviewTextSnippet,
  createThreadId,
  deriveThreadTitleFromSeed,
  detectClipboardPayload,
  ensureDirectory,
  nowIso,
  resolveWorkspaceRelativePath,
  safeReadContextIndex,
  safeReadManifest,
  safeReadThreadIndex
} from './workspace-manager/workspace-artifact-helpers'
import { syncRetrievalAuditArtifactsFromLogs } from './workspace-manager/retrieval-audit-sync'
import { saveTextArtifactToWorkspace } from './workspace-manager/workspace-artifact-store'
import { type WorkspaceManifestContext, type WorkspaceSnapshotContext } from './workspace-manager/workspace-context'
import { writeContextIndexFiles } from './workspace-manager/workspace-index'
import { buildWorkspaceSnapshot } from './workspace-manager/workspace-snapshot'

interface SaveWebContextOptions {
  transcriptArtifactId?: string | null
  messagesArtifactId?: string | null
  panelId: string
  title: string
  threadId?: string | null
  threadTitle?: string | null
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

const MANAGED_WORKSPACE_RULE_FILENAMES: Record<ManagedWorkspaceRuleTemplateKey, string> = {
  'workspace-protocol': 'WORKSPACE_PROTOCOL.md',
  'codex-instructions': 'CODEX_INSTRUCTIONS.md',
  'claude-instructions': 'CLAUDE_INSTRUCTIONS.md',
  'workbench-tools': 'WORKBENCH_TOOLS.ps1'
}

const MANAGED_WORKSPACE_ROOT_FILENAMES: Record<ManagedWorkspaceInstructionBlockKey, string> = {
  'agents-md': 'AGENTS.md',
  'claude-md': 'CLAUDE.md'
}

const WORKSPACE_NOT_SELECTED_ERROR = 'Choose a workspace before saving context.'

export class WorkspaceManager {
  private projectId = 'default'
  private workspaceRoot: string
  private threadContinuationPreference: ThreadContinuationPreference
  private manifestPath: string
  private contextIndexPath: string
  private originManifestsPath: string
  private threadIndexPath: string
  private threadManifestsPath: string
  private rulesPath: string
  private lastSavedArtifactId: string | null = null
  private lastError: string | null = null

  constructor(
    _basePath: string,
    configuredRoot: string | null = null,
    threadContinuationPreference: ThreadContinuationPreference = 'continue-active-thread',
    private readonly onSnapshotChanged?: (snapshot: WorkspaceSnapshot) => void
  ) {
    this.workspaceRoot = ''
    this.threadContinuationPreference = threadContinuationPreference
    this.manifestPath = ''
    this.contextIndexPath = ''
    this.originManifestsPath = ''
    this.threadIndexPath = ''
    this.threadManifestsPath = ''
    this.rulesPath = ''
    this.applyWorkspaceRoot(configuredRoot?.trim() ? configuredRoot.trim() : '')
  }

  getSnapshot(): WorkspaceSnapshot {
    if (!this.hasWorkspaceRoot()) {
      return buildWorkspaceSnapshot(this.getSnapshotContext(), this.createEmptyManifest(), this.lastSavedArtifactId, this.lastError)
    }

    const synced = syncRetrievalAuditArtifactsFromLogs(this.getManifestContext(), null, this.lastSavedArtifactId)
    this.lastSavedArtifactId = synced.lastSavedArtifactId
    return buildWorkspaceSnapshot(this.getSnapshotContext(), synced.manifest, this.lastSavedArtifactId, this.lastError)
  }

  setWorkspaceRoot(root: string | null | undefined): WorkspaceSnapshot {
    this.applyWorkspaceRoot(root?.trim() ? root.trim() : '')
    if (this.hasWorkspaceRoot()) {
      this.ensureInitialized()
    }
    this.lastError = null
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  saveClipboardAsArtifact(options: SaveClipboardOptions): SaveClipboardResult {
    const unavailableSnapshot = this.requireWorkspaceSnapshot()
    if (unavailableSnapshot) {
      return {
        snapshot: unavailableSnapshot,
        artifact: null
      }
    }

    this.ensureInitialized()

    const payload = detectClipboardPayload()
    if (!payload) {
      this.lastError = 'Clipboard does not contain supported HTML, markdown, or text content.'
      return {
        snapshot: this.getSnapshot(),
        artifact: null
      }
    }

    const thread = options.threadId?.trim()
      ? this.ensureThreadSelection(options.threadId, options.contextLabel || options.origin || 'manual')
      : this.resolveImplicitThread(options.origin || 'manual', options.contextLabel, options.contextLabel || options.origin || 'manual')
    const result = saveTextArtifactToWorkspace(this.getManifestContext(), {
      type: payload.type,
      content: payload.content,
      origin: options.origin || 'manual',
      summary: payload.summary,
      tags: [payload.type],
      contextLabel: options.contextLabel,
      threadId: thread.threadId,
      metadata: {
        captureMode: 'manual-save',
        panelId: options.origin || 'manual',
        previewText: buildPreviewTextSnippet(payload.content),
        clipboardFormats: payload.formats
      }
    })
    this.lastSavedArtifactId = result.lastSavedArtifactId
    this.lastError = null
    this.emitSnapshot()

    return {
      snapshot: this.getSnapshot(),
      artifact: result.artifact
    }
  }

  readArtifactContent(artifactId: string): ArtifactContentPayload | null {
    if (!this.hasWorkspaceRoot()) {
      return null
    }

    this.ensureInitialized()
    const synced = syncRetrievalAuditArtifactsFromLogs(this.getManifestContext(), null, this.lastSavedArtifactId)
    this.lastSavedArtifactId = synced.lastSavedArtifactId

    const artifact = synced.manifest.artifacts.find((item) => item.id === artifactId)
    const absolutePath = artifact ? resolveWorkspaceRelativePath(this.workspaceRoot, artifact.path) : null
    if (!artifact || !absolutePath || !existsSync(absolutePath)) {
      return null
    }

    return {
      artifact,
      content: readFileSync(absolutePath, 'utf8')
    }
  }

  createThread(title?: string | null, activate = true): WorkspaceSnapshot {
    const unavailableSnapshot = this.requireWorkspaceSnapshot()
    if (unavailableSnapshot) {
      return unavailableSnapshot
    }

    this.ensureInitialized()
    this.createThreadRecord(title, activate)
    this.lastError = null
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  selectThread(threadId: string | null): WorkspaceSnapshot {
    const unavailableSnapshot = this.requireWorkspaceSnapshot()
    if (unavailableSnapshot) {
      return unavailableSnapshot
    }

    this.ensureInitialized()
    this.writeActiveThreadSelection(threadId)
    this.lastError = null
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  renameThread(threadId: string, title: string): WorkspaceSnapshot {
    const unavailableSnapshot = this.requireWorkspaceSnapshot()
    if (unavailableSnapshot) {
      return unavailableSnapshot
    }

    this.ensureInitialized()

    const normalizedThreadId = sanitizeOrigin(threadId)
    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const threadIndex = safeReadThreadIndex(this.threadIndexPath, this.workspaceRoot)
    const nextTitle = deriveThreadTitleFromSeed(title, normalizedThreadId)
    const nextThreads = threadIndex.threads.map((thread) =>
      thread.threadId === normalizedThreadId
        ? {
            ...thread,
            title: nextTitle,
            derived: false
          }
        : thread
    )

    writeFileSync(
      this.threadIndexPath,
      JSON.stringify(
        {
          ...threadIndex,
          workspaceRoot: this.workspaceRoot,
          threads: nextThreads
        },
        null,
        2
      ),
      'utf8'
    )

    writeContextIndexFiles(this.getManifestContext(), manifest.artifacts, { activeThreadId: threadIndex.activeThreadId })
    this.lastError = null
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  reassignScopeToThread(scopeId: string, threadId: string): WorkspaceSnapshot {
    const unavailableSnapshot = this.requireWorkspaceSnapshot()
    if (unavailableSnapshot) {
      return unavailableSnapshot
    }

    this.ensureInitialized()

    const normalizedThreadId = sanitizeOrigin(threadId)
    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const nextArtifacts = manifest.artifacts.map((artifact) =>
      getArtifactScopeId(artifact) === scopeId
        ? {
            ...artifact,
            metadata: {
              ...(artifact.metadata ?? {}),
              threadId: normalizedThreadId
            }
          }
        : artifact
    )
    const nextManifest: ArtifactManifest = {
      ...manifest,
      workspaceRoot: this.workspaceRoot,
      projectId: this.projectId,
      artifacts: nextArtifacts
    }

    writeFileSync(this.manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
    writeContextIndexFiles(this.getManifestContext(), nextManifest.artifacts, { activeThreadId: normalizedThreadId })
    this.lastError = null
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  ensureThreadForSession(panelId: string, title: string, contextLabel?: string | null): { threadId: string; title: string } | null {
    if (!this.hasWorkspaceRoot()) {
      return null
    }

    this.ensureInitialized()
    const thread = this.resolveImplicitThread(panelId, contextLabel, title || panelId)
    return {
      threadId: thread.threadId,
      title: thread.title
    }
  }

  syncThreadContinuationPreference(preference: ThreadContinuationPreference): void {
    this.threadContinuationPreference = preference
  }

  getContinuitySummary(input: Omit<ManagedSessionContinuityInput, 'contextEntries' | 'threads'>): ManagedSessionContinuitySummary {
    if (!this.hasWorkspaceRoot()) {
      return buildManagedSessionContinuitySummary({
        ...input,
        contextEntries: [],
        threads: []
      })
    }

    this.ensureInitialized()
    const contextIndex = safeReadContextIndex(this.contextIndexPath, this.workspaceRoot)
    const threadIndex = safeReadThreadIndex(this.threadIndexPath, this.workspaceRoot)

    return buildManagedSessionContinuitySummary({
      ...input,
      contextEntries: contextIndex.origins,
      threads: threadIndex.threads
    })
  }

  deleteScope(scopeId: string): WorkspaceSnapshot {
    const unavailableSnapshot = this.requireWorkspaceSnapshot()
    if (unavailableSnapshot) {
      return unavailableSnapshot
    }

    this.ensureInitialized()

    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const nextArtifacts = manifest.artifacts.filter((artifact) => getArtifactScopeId(artifact) !== scopeId)
    const removedArtifacts = manifest.artifacts.filter((artifact) => getArtifactScopeId(artifact) === scopeId)

    for (const artifact of removedArtifacts) {
      const absolutePath = resolveWorkspaceRelativePath(this.workspaceRoot, artifact.path)
      if (absolutePath && existsSync(absolutePath)) {
        rmSync(absolutePath, { force: true })
      }
    }

    const nextManifest: ArtifactManifest = {
      ...manifest,
      workspaceRoot: this.workspaceRoot,
      projectId: this.projectId,
      artifacts: nextArtifacts
    }

    writeFileSync(this.manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
    writeContextIndexFiles(this.getManifestContext(), nextManifest.artifacts)

    if (this.lastSavedArtifactId && removedArtifacts.some((artifact) => artifact.id === this.lastSavedArtifactId)) {
      this.lastSavedArtifactId = null
    }

    this.lastError = null
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  upsertTerminalTranscript(input: {
    artifactId?: string | null
    panelId: string
    title: string
    launchCount: number
    contextLabel: string
    threadId?: string | null
    content: string
    transcriptTruncated?: boolean
    transcriptLimit?: number
  }): string | null {
    if (!this.hasWorkspaceRoot()) {
      return null
    }

    const thread = input.threadId?.trim()
      ? this.ensureThreadSelection(input.threadId, input.title)
      : this.resolveImplicitThread(input.panelId, input.contextLabel, input.title)
    const result = saveTextArtifactToWorkspace(this.getManifestContext(), {
      artifactId: input.artifactId,
      type: 'log',
      content: input.content,
      origin: input.panelId,
      summary: `${input.title} transcript captured from session ${input.launchCount}.`,
      tags: ['terminal', 'session', input.panelId],
      contextLabel: input.contextLabel,
      threadId: thread.threadId,
      metadata: {
        captureMode: 'auto-terminal-transcript',
        panelId: input.panelId,
        sessionTitle: input.title,
        launchCount: input.launchCount,
        contextLabel: input.contextLabel,
        threadId: thread.threadId,
        previewText: buildPreviewTextSnippet(input.content),
        transcriptTruncated: input.transcriptTruncated === true,
        transcriptLimit: input.transcriptLimit ?? null
      }
    })
    this.lastSavedArtifactId = result.lastSavedArtifactId
    this.lastError = null
    this.emitSnapshot()

    return result.artifact?.id ?? null
  }

  upsertWebContext(input: SaveWebContextOptions): {
    transcriptArtifactId: string | null
    messagesArtifactId: string | null
    contextLabel: string | null
    sessionScopeId: string | null
    threadId: string | null
    threadTitle: string | null
  } {
    if (!this.hasWorkspaceRoot()) {
      return {
        transcriptArtifactId: null,
        messagesArtifactId: input.messagesArtifactId ?? null,
        contextLabel: null,
        sessionScopeId: null,
        threadId: null,
        threadTitle: null
      }
    }

    const thread = input.threadId?.trim()
      ? this.ensureThreadSelection(input.threadId, input.threadTitle || input.title || input.url)
      : this.resolveImplicitThread(
          input.panelId,
          input.contextLabel,
          input.threadTitle || input.title || input.url
        )
    const messagePreview = input.messages?.find((message) => message.role === 'user' || message.role === 'assistant')?.text
      ?.replace(/\s+/g, ' ')
      .slice(0, 120)
    const contentPreview = messagePreview || buildPreviewTextSnippet(input.content)
    const transcriptArtifact = saveTextArtifactToWorkspace(this.getManifestContext(), {
      artifactId: input.transcriptArtifactId,
      type: 'markdown',
      origin: input.panelId,
      summary:
        input.messages && input.messages.length > 0
          ? `Auto-captured web session from ${input.title || input.url} with ${input.messages.length} structured messages.${messagePreview ? ` Preview: ${messagePreview}` : ''}`
          : `Auto-captured web context from ${input.title || input.url}.`,
      tags: ['web', 'context', 'auto-capture', input.panelId],
      contextLabel: input.contextLabel,
      threadId: thread.threadId,
      content: [
        `# ${input.title || input.url}`,
        '',
        `- URL: ${input.url}`,
        `- Captured At: ${nowIso()}`,
        input.metaDescription ? `- Description: ${input.metaDescription}` : null,
        '',
        '## Visible Content',
        '',
        input.content.trim()
      ]
        .filter(Boolean)
        .join('\n'),
      metadata: {
        captureMode: 'auto-web-context',
        panelId: input.panelId,
        sourceUrl: input.url,
        pageTitle: input.title,
        messageCount: input.messages?.length ?? 0,
        previewText: contentPreview,
        contextLabel: input.contextLabel,
        threadId: thread.threadId
      }
    })
    this.lastSavedArtifactId = transcriptArtifact.lastSavedArtifactId
    this.lastError = null
    this.emitSnapshot()

    const messagesArtifact =
      input.messages && input.messages.length > 0
        ? saveTextArtifactToWorkspace(this.getManifestContext(), {
            artifactId: input.messagesArtifactId,
            type: 'json',
            origin: input.panelId,
            summary: `Structured message index for ${input.title || input.url}.${messagePreview ? ` Preview: ${messagePreview}` : ''}`,
            tags: ['web', 'messages', 'session-index', input.panelId],
            contextLabel: input.contextLabel,
            threadId: thread.threadId,
            content: JSON.stringify(
              {
                version: '1.0',
              panelId: input.panelId,
              title: input.title,
              url: input.url,
              contextLabel: input.contextLabel,
              threadId: thread.threadId,
                capturedAt: nowIso(),
                messageCount: input.messages.length,
                messages: input.messages
              },
              null,
              2
            ),
            metadata: {
              captureMode: 'auto-web-messages',
              panelId: input.panelId,
              sourceUrl: input.url,
              pageTitle: input.title,
              messageCount: input.messages.length,
              previewText: contentPreview,
              contextLabel: input.contextLabel,
              threadId: thread.threadId
            }
          })
        : null

    if (messagesArtifact) {
      this.lastSavedArtifactId = messagesArtifact.lastSavedArtifactId
      this.lastError = null
      this.emitSnapshot()
    }

    const persistedContextLabel =
      typeof transcriptArtifact.artifact?.metadata?.contextLabel === 'string'
        ? transcriptArtifact.artifact.metadata.contextLabel
        : input.contextLabel

    return {
      transcriptArtifactId: transcriptArtifact.artifact?.id ?? null,
      messagesArtifactId: messagesArtifact?.artifact?.id ?? input.messagesArtifactId ?? null,
      contextLabel: persistedContextLabel,
      sessionScopeId: transcriptArtifact.artifact ? getArtifactScopeId(transcriptArtifact.artifact) : null,
      threadId: thread.threadId,
      threadTitle: thread.title
    }
  }

  syncRetrievalAuditArtifacts(options: { sessionScopeId?: string | null; emitSnapshot?: boolean } = {}): WorkspaceSnapshot {
    const unavailableSnapshot = this.requireWorkspaceSnapshot()
    if (unavailableSnapshot) {
      return unavailableSnapshot
    }

    this.ensureInitialized()

    const synced = syncRetrievalAuditArtifactsFromLogs(
      this.getManifestContext(),
      options.sessionScopeId ?? null,
      this.lastSavedArtifactId
    )
    this.lastSavedArtifactId = synced.lastSavedArtifactId
    const snapshot = buildWorkspaceSnapshot(this.getSnapshotContext(), synced.manifest, this.lastSavedArtifactId, this.lastError)

    if (options.emitSnapshot ?? true) {
      this.emitSnapshot(snapshot)
    }

    return snapshot
  }

  private applyWorkspaceRoot(root: string): void {
    this.workspaceRoot = root
    this.projectId = basename(root) || 'default'
    this.manifestPath = root ? join(root, 'manifests', 'artifacts.json') : ''
    this.contextIndexPath = root ? join(root, 'manifests', 'context-index.json') : ''
    this.originManifestsPath = root ? join(root, 'manifests', 'origins') : ''
    this.threadIndexPath = root ? join(root, 'manifests', 'thread-index.json') : ''
    this.threadManifestsPath = root ? join(root, 'manifests', 'threads') : ''
    this.rulesPath = root ? join(root, 'rules') : ''
  }

  private hasWorkspaceRoot(): boolean {
    return this.workspaceRoot.trim().length > 0
  }

  private createEmptyManifest(): ArtifactManifest {
    return {
      version: '1.0',
      projectId: this.projectId,
      workspaceRoot: this.workspaceRoot,
      artifacts: []
    }
  }

  private requireWorkspaceSnapshot(): WorkspaceSnapshot | null {
    if (this.hasWorkspaceRoot()) {
      return null
    }

    this.lastError = WORKSPACE_NOT_SELECTED_ERROR
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  private ensureInitialized(): void {
    if (!this.hasWorkspaceRoot()) {
      return
    }

    ensureDirectory(this.workspaceRoot)

    const directories = [
      'inbox/deepseek-web',
      'inbox/minimax-web',
      'inbox/codex-cli',
      'inbox/claude-code',
      'inbox/manual',
      'artifacts/html',
      'artifacts/markdown',
      'artifacts/text',
      'artifacts/pdf',
      'artifacts/image',
      'artifacts/code',
      'artifacts/json',
      'artifacts/review',
      'outputs/codex',
      'outputs/claude-code',
      'outputs/renderer',
      'manifests',
      'manifests/origins',
      'manifests/threads',
      'rules',
      'logs',
      'logs/retrieval'
    ]

    for (const directory of directories) {
      ensureDirectory(join(this.workspaceRoot, directory))
    }

    const files: Array<[string, string]> = [
      [
        this.manifestPath,
        JSON.stringify(
          {
            version: '1.0',
            projectId: this.projectId,
            workspaceRoot: this.workspaceRoot,
            artifacts: []
          },
          null,
          2
        )
      ],
      [
        this.contextIndexPath,
        JSON.stringify(
          {
            version: '1.0',
            workspaceRoot: this.workspaceRoot,
            origins: []
          },
          null,
          2
        )
      ],
      [
        this.threadIndexPath,
        JSON.stringify(
          {
            version: '1.0',
            workspaceRoot: this.workspaceRoot,
            activeThreadId: null,
            threads: []
          },
          null,
          2
        )
      ],
      [join(this.workspaceRoot, 'manifests', 'summaries.json'), JSON.stringify({ version: '1.0', summaries: [] }, null, 2)],
      [join(this.workspaceRoot, 'manifests', 'tasks.json'), JSON.stringify({ version: '1.0', tasks: [] }, null, 2)]
    ]

    for (const [path, content] of files) {
      if (!existsSync(path)) {
        writeFileSync(path, content, 'utf8')
      }
    }

    const managedFiles = buildManagedWorkspaceRuleTemplates().map((template) => [
      join(this.workspaceRoot, 'rules', MANAGED_WORKSPACE_RULE_FILENAMES[template.key]),
      template.content
    ] as const)

    for (const [path, content] of managedFiles) {
      writeFileSync(path, content, 'utf8')
    }

    for (const block of buildManagedWorkspaceInstructionBlocks()) {
      syncManagedInstructionFile(join(this.workspaceRoot, MANAGED_WORKSPACE_ROOT_FILENAMES[block.key]), block.heading, block.content)
    }

    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    writeContextIndexFiles(this.getManifestContext(), manifest.artifacts)
  }

  private emitSnapshot(snapshot?: WorkspaceSnapshot): void {
    if (!this.onSnapshotChanged) {
      return
    }

    this.onSnapshotChanged(snapshot ?? this.getSnapshot())
  }

  private getManifestContext(): WorkspaceManifestContext {
    return {
      projectId: this.projectId,
      workspaceRoot: this.workspaceRoot,
      manifestPath: this.manifestPath,
      contextIndexPath: this.contextIndexPath,
      originManifestsPath: this.originManifestsPath,
      threadIndexPath: this.threadIndexPath,
      threadManifestsPath: this.threadManifestsPath
    }
  }

  private getSnapshotContext(): WorkspaceSnapshotContext {
    return {
      ...this.getManifestContext(),
      rulesPath: this.rulesPath
    }
  }

  private ensureThreadSelection(threadId: string, fallbackTitle: string): ContextThreadSummary {
    const normalizedThreadId = sanitizeOrigin(threadId)
    const threadIndex = safeReadThreadIndex(this.threadIndexPath, this.workspaceRoot)
    const existingThread = threadIndex.threads.find((thread) => thread.threadId === normalizedThreadId)
    if (existingThread) {
      if (threadIndex.activeThreadId !== normalizedThreadId) {
        this.writeActiveThreadSelection(normalizedThreadId)
      }
      return existingThread
    }

    const nextTitle = deriveThreadTitleFromSeed(fallbackTitle, normalizedThreadId)
    writeFileSync(
      this.threadIndexPath,
      JSON.stringify(
        {
          ...threadIndex,
          workspaceRoot: this.workspaceRoot,
          activeThreadId: normalizedThreadId,
          threads: [
            ...threadIndex.threads,
            {
              threadId: normalizedThreadId,
              title: nextTitle,
              derived: false,
              scopeIds: [],
              artifactIds: [],
              scopeCount: 0,
              artifactCount: 0,
              latestArtifactId: null,
              latestUpdatedAt: null,
              originHints: [],
              searchTerms: [],
              summary: ''
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )
    this.writeActiveThreadSelection(normalizedThreadId)

    return {
      threadId: normalizedThreadId,
      title: nextTitle,
      derived: false,
      scopeIds: [],
      artifactIds: [],
      scopeCount: 0,
      artifactCount: 0,
      latestArtifactId: null,
      latestUpdatedAt: null,
      originHints: [],
      searchTerms: [],
      summary: ''
    }
  }

  private createThreadRecord(title?: string | null, activate = true): ContextThreadSummary {
    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const threadIndex = safeReadThreadIndex(this.threadIndexPath, this.workspaceRoot)
    const nextTitle = deriveThreadTitleFromSeed(
      title,
      `${this.projectId}-${String(threadIndex.threads.length + 1).padStart(2, '0')}`
    )
    const threadId = createThreadId(nextTitle)
    const thread: ContextThreadSummary = {
      threadId,
      title: nextTitle,
      derived: false,
      scopeIds: [],
      artifactIds: [],
      scopeCount: 0,
      artifactCount: 0,
      latestArtifactId: null,
      latestUpdatedAt: null,
      originHints: [],
      searchTerms: [],
      summary: ''
    }

    writeFileSync(
      this.threadIndexPath,
      JSON.stringify(
        {
          ...threadIndex,
          workspaceRoot: this.workspaceRoot,
          activeThreadId: activate ? threadId : threadIndex.activeThreadId,
          threads: [thread, ...threadIndex.threads]
        },
        null,
        2
      ),
      'utf8'
    )

    writeContextIndexFiles(this.getManifestContext(), manifest.artifacts, {
      activeThreadId: activate ? threadId : threadIndex.activeThreadId
    })

    return thread
  }

  private writeActiveThreadSelection(threadId: string | null): void {
    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    writeContextIndexFiles(this.getManifestContext(), manifest.artifacts, {
      activeThreadId: threadId?.trim() ? sanitizeOrigin(threadId) : null
    })
  }

  private resolveImplicitThread(
    origin: string,
    contextLabel: string | null | undefined,
    fallbackTitle: string
  ): ContextThreadSummary {
    const scopeId = getArtifactScopeId({
      origin,
      metadata: {
        contextLabel: contextLabel ?? ''
      }
    })
    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const existingArtifact = manifest.artifacts.find((artifact) => getArtifactScopeId(artifact) === scopeId)
    const threadIndex = safeReadThreadIndex(this.threadIndexPath, this.workspaceRoot)
    const activeThread = threadIndex.threads.find((thread) => thread.threadId === threadIndex.activeThreadId)
    const plan = planImplicitThreadContinuation({
      origin,
      contextLabel,
      threadContinuationPreference: this.threadContinuationPreference,
      existingScopeThreadId: existingArtifact ? getArtifactThreadId(existingArtifact) : null,
      activeThreadId: activeThread?.threadId ?? null
    })

    if (plan.decision === 'reuse-existing-scope-thread' || plan.decision === 'reuse-active-thread') {
      return this.ensureThreadSelection(plan.threadId, fallbackTitle)
    }

    return this.createThreadRecord(fallbackTitle, true)
  }
}
