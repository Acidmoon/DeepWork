import { getArtifactInspectionKind, type ArtifactRecord, type ContextIndexEntry } from '@ai-workbench/core/desktop/workspace'
import { resolveLocale } from '../i18n'

export function normalizeWorkspaceSearchQuery(value: string): string {
  return value.trim().toLowerCase()
}

export function matchesWorkspaceBucket(artifact: { path: string }, selectedBucket: string): boolean {
  return selectedBucket === 'artifacts/'
    ? artifact.path.startsWith('artifacts/')
    : selectedBucket === 'outputs/'
      ? artifact.path.startsWith('outputs/')
      : artifact.path.startsWith('logs/')
}

export function matchesWorkspaceArtifactQuery(artifact: ArtifactRecord, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true
  }

  return buildArtifactSearchText(artifact).includes(normalizedQuery)
}

export function buildArtifactSearchText(artifact: ArtifactRecord): string {
  const metadataValues = artifact.metadata
    ? Object.values(artifact.metadata)
        .flatMap((value) => normalizeSearchValue(value))
        .join(' ')
    : ''

  return [
    artifact.id,
    artifact.name,
    artifact.origin,
    artifact.summary,
    artifact.path,
    artifact.absolutePath,
    artifact.type,
    artifact.tags.join(' '),
    metadataValues
  ]
    .join(' ')
    .toLowerCase()
}

export function buildSessionSearchText(entry: ContextIndexEntry): string {
  return [
    entry.origin,
    entry.contextLabel,
    entry.scopeId,
    entry.threadId,
    entry.retrieval.displayTitle,
    entry.retrieval.previewText,
    entry.retrieval.scopeSummary,
    entry.retrieval.latestArtifactSummary,
    entry.retrieval.latestArtifactType,
    entry.retrieval.artifactTypes.join(' '),
    entry.retrieval.tags.join(' '),
    entry.retrieval.searchTerms.join(' ')
  ]
    .join(' ')
    .toLowerCase()
}

export function normalizeSearchValue(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeSearchValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => normalizeSearchValue(item))
  }

  return []
}

export function supportsTextArtifactPreview(type: ArtifactRecord['type']): boolean {
  return ['markdown', 'text', 'json', 'log', 'code', 'review', 'html'].includes(type)
}

export function getWorkspaceFolderName(workspaceRoot: string): string {
  if (!workspaceRoot) {
    return ''
  }

  const normalized = workspaceRoot.replace(/[\\/]+$/, '')
  const parts = normalized.split(/[\\/]/)
  return parts[parts.length - 1] || normalized
}

export function buildSessionSummary(
  entry: ContextIndexEntry,
  locale: ReturnType<typeof resolveLocale>
): {
  scopeId: string
  origin: string
  contextLabel: string
  title: string
  preview: string
  badges: string[]
  latestUpdatedAt: string | null
} {
  const messageCount = Number(entry.retrieval.messageCount ?? 0)
  const transcriptCount = Number(entry.retrieval.transcriptCount ?? 0)
  const logCount = Number(entry.retrieval.retrievalAuditCount ?? 0)
  const preview =
    String(entry.retrieval.previewText ?? '').trim() || entry.retrieval.scopeSummary || formatContextEntryDescription(entry, locale)
  const title = deriveSessionTitle(entry, locale)
  const badges = [
    locale === 'zh-CN' ? `${entry.artifactCount} 条记录` : `${entry.artifactCount} items`,
    messageCount > 0 ? (locale === 'zh-CN' ? `${messageCount} 条消息` : `${messageCount} messages`) : null,
    transcriptCount > 0 ? (locale === 'zh-CN' ? `${transcriptCount} 份转录` : `${transcriptCount} transcript${transcriptCount === 1 ? '' : 's'}`) : null,
    logCount > 0 ? (locale === 'zh-CN' ? `${logCount} 份日志` : `${logCount} log${logCount === 1 ? '' : 's'}`) : null
  ].filter((badge): badge is string => Boolean(badge))

  return {
    scopeId: entry.scopeId,
    origin: entry.origin,
    contextLabel: entry.contextLabel,
    title,
    preview,
    badges,
    latestUpdatedAt: entry.latestUpdatedAt
  }
}

export function formatContextEntryLabel(entry: { origin: string; contextLabel: string }): string {
  return `${formatOriginLabel(entry.origin)} / ${entry.contextLabel}`
}

export function formatContextEntryDescription(
  entry: { artifactCount: number; latestUpdatedAt: string | null },
  locale: ReturnType<typeof resolveLocale>
): string {
  const countLabel = locale === 'zh-CN'
    ? `${entry.artifactCount} 条记录`
    : `${entry.artifactCount} item${entry.artifactCount === 1 ? '' : 's'}`
  const timeLabel = entry.latestUpdatedAt ? formatTimestamp(entry.latestUpdatedAt, locale) : '-'
  return locale === 'zh-CN' ? `${countLabel} · 最近更新 ${timeLabel}` : `${countLabel} · updated ${timeLabel}`
}

export function formatArtifactTitle(
  artifact: { id: string; type: string; metadata?: Record<string, unknown> },
  locale: ReturnType<typeof resolveLocale>
): string {
  const contextLabel = typeof artifact.metadata?.contextLabel === 'string' && artifact.metadata.contextLabel.trim()
    ? artifact.metadata.contextLabel
    : null
  const typeLabel = locale === 'zh-CN' ? humanizeArtifactTypeZh(artifact) : humanizeArtifactTypeEn(artifact)
  return contextLabel ? `${typeLabel} · ${contextLabel}` : `${typeLabel} · ${artifact.id}`
}

export function formatArtifactSummary(artifact: { summary: string }): string {
  return artifact.summary.replace(/\s+/g, ' ').trim()
}

export function formatArtifactMeta(
  artifact: { origin: string; type: string; metadata?: Record<string, unknown> },
  locale: ReturnType<typeof resolveLocale>
): string {
  const originLabel = formatOriginLabel(artifact.origin)
  const typeLabel = locale === 'zh-CN' ? humanizeArtifactTypeZh(artifact) : humanizeArtifactTypeEn(artifact)
  return `${originLabel} · ${typeLabel}`
}

export function formatOriginLabel(origin: string): string {
  switch (origin) {
    case 'deepseek-web':
      return 'DeepSeek Web'
    case 'minimax-web':
      return 'MiniMax Web'
    case 'codex-cli':
      return 'Codex CLI'
    case 'claude-code':
      return 'Claude Code'
    case 'manual':
      return 'Manual'
    default:
      return origin
  }
}

export function humanizeArtifactTypeZh(artifact: { type: string; origin?: string; metadata?: Record<string, unknown> }): string {
  switch (getArtifactInspectionKind({
    origin: artifact.origin ?? 'manual',
    type: artifact.type as ArtifactRecord['type'],
    metadata: artifact.metadata
  })) {
    case 'manual-save':
      return '手动保存'
    case 'web-context':
      return '网页上下文'
    case 'message-index':
      return '消息索引'
    case 'terminal-transcript':
      return '终端转录'
    case 'retrieval-audit':
      return '检索审计'
    default:
      switch (artifact.type) {
        case 'markdown':
          return '对话转录'
        case 'json':
          return '消息索引'
        case 'log':
          return '终端记录'
        case 'html':
          return '网页片段'
        case 'text':
          return '文本'
        default:
          return artifact.type
      }
  }
}

export function humanizeArtifactTypeEn(artifact: { type: string; origin?: string; metadata?: Record<string, unknown> }): string {
  switch (getArtifactInspectionKind({
    origin: artifact.origin ?? 'manual',
    type: artifact.type as ArtifactRecord['type'],
    metadata: artifact.metadata
  })) {
    case 'manual-save':
      return 'Manual Save'
    case 'web-context':
      return 'Web Context'
    case 'message-index':
      return 'Message Index'
    case 'terminal-transcript':
      return 'Terminal Transcript'
    case 'retrieval-audit':
      return 'Retrieval Audit'
    default:
      switch (artifact.type) {
        case 'markdown':
          return 'Transcript'
        case 'json':
          return 'Message Index'
        case 'log':
          return 'Terminal Log'
        case 'html':
          return 'Web Clip'
        case 'text':
          return 'Text'
        default:
          return artifact.type
      }
  }
}

export function deriveSessionTitle(
  entry: { origin: string; contextLabel: string; retrieval?: { displayTitle?: string | null } },
  locale: ReturnType<typeof resolveLocale>
): string {
  const displayTitle = typeof entry.retrieval?.displayTitle === 'string' ? entry.retrieval.displayTitle.trim() : ''
  if (displayTitle) {
    return displayTitle
  }

  const contextLabel = entry.contextLabel.replace(/[-_]+/g, ' ').trim()

  if (contextLabel && contextLabel !== 'default context') {
    return contextLabel
  }

  return locale === 'zh-CN'
    ? `${formatOriginLabel(entry.origin)} 会话`
    : `${formatOriginLabel(entry.origin)} Session`
}

export function extractSessionPreview(artifact: ArtifactRecord | undefined): string {
  if (!artifact) {
    return ''
  }

  if (typeof artifact.metadata?.previewText === 'string' && artifact.metadata.previewText.trim()) {
    return artifact.metadata.previewText.trim()
  }

  if (typeof artifact.metadata?.retrievalQuery === 'string' && artifact.metadata.retrievalQuery.trim()) {
    return artifact.metadata.retrievalQuery.trim()
  }

  const previewMatch = artifact.summary.match(/Preview:\s*(.+)$/i)
  if (previewMatch?.[1]) {
    return previewMatch[1].trim()
  }

  if (typeof artifact.metadata?.sourceUrl === 'string' && artifact.metadata.sourceUrl.trim()) {
    return artifact.metadata.sourceUrl.trim()
  }

  return artifact.summary.replace(/\s+/g, ' ').trim()
}

export function formatTimestamp(value: string, locale: ReturnType<typeof resolveLocale>): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function parseMessageArtifact(content: string): Array<{ id: string; role: string; text: string }> {
  try {
    const parsed = JSON.parse(content) as {
      messages?: Array<{ id?: string; role?: string; text?: string }>
    }

    return (parsed.messages ?? [])
      .map((message, index) => ({
        id: message.id?.trim() || `message-${String(index + 1).padStart(3, '0')}`,
        role: message.role?.trim() || 'unknown',
        text: message.text?.trim() || ''
      }))
      .filter((message) => message.text.length > 0)
      .slice(0, 24)
  } catch {
    return []
  }
}

export function extractLogExcerpt(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .slice(-24)
    .join('\n')
}

export function normalizeMessageRole(role: string): 'user' | 'assistant' | 'system' | 'unknown' {
  const normalized = role.trim().toLowerCase()
  if (normalized === 'user') {
    return 'user'
  }
  if (normalized === 'assistant') {
    return 'assistant'
  }
  if (normalized === 'system') {
    return 'system'
  }
  return 'unknown'
}

export function formatMessageRole(role: string, locale: ReturnType<typeof resolveLocale>): string {
  const normalized = normalizeMessageRole(role)
  if (locale === 'zh-CN') {
    switch (normalized) {
      case 'user':
        return '用户'
      case 'assistant':
        return '助手'
      case 'system':
        return '系统'
      default:
        return '记录'
    }
  }

  switch (normalized) {
    case 'user':
      return 'User'
    case 'assistant':
      return 'Assistant'
    case 'system':
      return 'System'
    default:
      return 'Record'
  }
}
