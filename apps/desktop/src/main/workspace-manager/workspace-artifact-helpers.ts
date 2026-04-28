import { clipboard } from 'electron'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import {
  type ArtifactManifest,
  type ArtifactRecord,
  type ArtifactType,
  type ContextIndexManifest,
  type ThreadIndexManifest,
  artifactExtensions,
  buildDerivedThreadId,
  sanitizeContextLabel,
  sanitizeOrigin
} from '@ai-workbench/core/desktop/workspace'
import { type RetrievalAuditEntry } from '@ai-workbench/core/desktop/workspace'

export function nowIso(): string {
  return new Date().toISOString()
}

export function ensureDirectory(path: string): void {
  mkdirSync(path, { recursive: true })
}

export function safeReadManifest(path: string, workspaceRoot: string, projectId: string): ArtifactManifest {
  if (!existsSync(path)) {
    return {
      version: '1.0',
      projectId,
      workspaceRoot,
      artifacts: []
    }
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ArtifactManifest
  } catch {
    return {
      version: '1.0',
      projectId,
      workspaceRoot,
      artifacts: []
    }
  }
}

function normalizeFormats(formats: string[]): string[] {
  return [...new Set(formats.map((item) => item.toLowerCase()))]
}

function extractClipboardHtml(): string | null {
  const html = clipboard.readHTML().trim()
  if (!html) {
    return null
  }

  const normalized = html.replace(/\s+/g, ' ').trim()
  if (normalized === '<meta charset=\'utf-8\'>' || normalized === '<meta charset="utf-8">') {
    return null
  }

  return html
}

function isLikelyMarkdown(text: string): boolean {
  const lines = text.split(/\r?\n/)
  let score = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      score += 2
    }
    if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      score += 1
    }
    if (/```/.test(trimmed) || /`[^`]+`/.test(trimmed)) {
      score += 2
    }
    if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) {
      score += 2
    }
    if (/^\>\s/.test(trimmed)) {
      score += 1
    }
  }

  return score >= 3
}

export function detectClipboardPayload(): { type: ArtifactType; content: string; formats: string[]; summary: string } | null {
  const formats = normalizeFormats(clipboard.availableFormats())
  const html = extractClipboardHtml()
  const text = clipboard.readText().trim()

  if (html) {
    return {
      type: 'html',
      content: html,
      formats,
      summary: 'Clipboard HTML captured from the active application.'
    }
  }

  if (text) {
    return {
      type: isLikelyMarkdown(text) ? 'markdown' : 'text',
      content: text,
      formats,
      summary: isLikelyMarkdown(text)
        ? 'Clipboard markdown content captured from the active application.'
        : 'Clipboard plain text captured from the active application.'
    }
  }

  return null
}

export function nextArtifactId(type: ArtifactType, manifest: ArtifactManifest): string {
  const prefix = `${type}_`
  const count = manifest.artifacts.filter((artifact) => artifact.id.startsWith(prefix)).length + 1
  return `${type}_${String(count).padStart(4, '0')}`
}

export function fileNameForArtifact(id: string, type: ArtifactType): string {
  return `${id}.${artifactExtensions[type]}`
}

export function hashContent(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

const GENERIC_NOISE_PATTERNS = [
  /^开启新对话$/i,
  /^今天$/i,
  /^昨天$/i,
  /^\d+\s*天内$/i,
  /^\d{4}-\d{2}$/i,
  /^recent activity$/i,
  /^tips for getting started$/i,
  /^welcome back!?$/i,
  /^no recent activity$/i
]

const TERMINAL_NOISE_PATTERNS = [
  /^\(.+\)\s+ps\s+.+>\s*$/i,
  /^ps\s+.+>\s*$/i,
  /^if\s+\(test-path/i,
  /^set-location\b/i,
  /^proxy_on$/i,
  /^claude$/i,
  /^codex$/i,
  /^workspace retrieval ready\.?$/i,
  /^代理已开启/i,
  /^正在测试连接/i,
  /^http\/1\.1\s+\d+/i,
  /^run \/init to create a claude\.md/i,
  /^claude code v[\d.]+/i,
  /^[\s\u2500-\u257f\u2580-\u259f▐▛▜▌▘▝]+$/u
]

function isNoiseLine(line: string, patterns: RegExp[]): boolean {
  const trimmed = line.trim()
  if (!trimmed) {
    return true
  }

  return patterns.some((pattern) => pattern.test(trimmed))
}

function collectMeaningfulLines(content: string, patterns: RegExp[] = []): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !isNoiseLine(line, [...GENERIC_NOISE_PATTERNS, ...patterns]))
}

function readArtifactText(artifact: ArtifactRecord): string {
  if (!existsSync(artifact.absolutePath)) {
    return ''
  }

  try {
    return readFileSync(artifact.absolutePath, 'utf8')
  } catch {
    return ''
  }
}

function countStructuredMessages(artifact: ArtifactRecord): number {
  const content = readArtifactText(artifact)
  if (!content) {
    return 0
  }

  try {
    const parsed = JSON.parse(content) as {
      messages?: Array<{
        text?: unknown
      }>
    }

    return (parsed.messages ?? []).filter((message) => {
      const text = String(message.text ?? '').replace(/\s+/g, ' ').trim()
      return text.length >= 12 && !isNoiseLine(text, [])
    }).length
  } catch {
    return 0
  }
}

function hasSubstantiveTerminalContent(artifact: ArtifactRecord): boolean {
  const content = readArtifactText(artifact)
  if (!content) {
    return false
  }

  const meaningfulLines = collectMeaningfulLines(content, TERMINAL_NOISE_PATTERNS)
  const meaningfulText = meaningfulLines.join(' ')
  return meaningfulLines.length >= 3 || meaningfulText.length >= 80
}

export function isSubstantiveArtifact(artifact: ArtifactRecord): boolean {
  const captureMode = String(artifact.metadata?.captureMode ?? '')
  const messageCount = Number(artifact.metadata?.messageCount ?? 0)

  if (!captureMode) {
    return true
  }

  if (captureMode === 'auto-web-messages') {
    return countStructuredMessages(artifact) > 0
  }

  if (captureMode === 'auto-web-context') {
    return messageCount > 0
  }

  if (captureMode === 'auto-terminal-transcript') {
    return hasSubstantiveTerminalContent(artifact)
  }

  if (captureMode === 'auto-cli-retrieval-audit') {
    return true
  }

  return artifact.size >= 80
}

export function buildRetrievalAuditArtifactId(sessionScopeId: string): string {
  return `retrieval_audit_${sanitizeOrigin(sessionScopeId)}`
}

export function buildRetrievalAuditSummary(entry: RetrievalAuditEntry): string {
  const outcome = entry.outcome.replace(/[_-]+/g, ' ').trim()
  const selectedScope = entry.selectedScopeId ? ` Selected scope: ${entry.selectedScopeId}.` : ''
  const reason = entry.reason ? ` Reason: ${entry.reason}.` : ''
  const query = entry.query.replace(/\s+/g, ' ').trim()
  return `CLI retrieval audit latest outcome: ${outcome}.${selectedScope}${reason} Query: ${query}`.trim()
}

export function toRetrievalAuditMetadata(
  entry: RetrievalAuditEntry,
  entryCount: number,
  sessionScopeId: string
): Record<string, unknown> {
  return {
    captureMode: 'auto-cli-retrieval-audit',
    panelId: sanitizeOrigin(String(entry.session?.panelId ?? 'manual')),
    launchCount: entry.session?.launchCount ?? null,
    contextLabel: sanitizeContextLabel(String(entry.session?.contextLabel ?? '')),
    threadId: entry.session?.threadId ? sanitizeOrigin(String(entry.session.threadId)) : null,
    threadTitle: entry.session?.threadTitle ?? null,
    sessionScopeId,
    retrievalQuery: entry.query,
    retrievalOutcome: entry.outcome,
    retrievalReason: entry.reason ?? null,
    retrievalMode: entry.retrievalMode ?? null,
    selectedScopeId: entry.selectedScopeId ?? null,
    candidateScopeIds: entry.candidateScopeIds ?? [],
    latestAuditTimestamp: entry.timestamp,
    auditEntryCount: entryCount
  }
}

export function safeReadContextIndex(path: string, workspaceRoot: string): ContextIndexManifest {
  if (!existsSync(path)) {
    return {
      version: '1.0',
      workspaceRoot,
      origins: []
    }
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ContextIndexManifest
  } catch {
    return {
      version: '1.0',
      workspaceRoot,
      origins: []
    }
  }
}

export function safeReadThreadIndex(path: string, workspaceRoot: string): ThreadIndexManifest {
  if (!existsSync(path)) {
    return {
      version: '1.0',
      workspaceRoot,
      activeThreadId: null,
      threads: []
    }
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as ThreadIndexManifest
    return {
      version: parsed.version ?? '1.0',
      workspaceRoot,
      activeThreadId: parsed.activeThreadId ? sanitizeOrigin(parsed.activeThreadId) : null,
      threads: Array.isArray(parsed.threads) ? parsed.threads : []
    }
  } catch {
    return {
      version: '1.0',
      workspaceRoot,
      activeThreadId: null,
      threads: []
    }
  }
}

export function createThreadId(seed: string): string {
  const normalized = sanitizeOrigin(seed).slice(0, 48)
  const suffix = Date.now().toString(36)
  return normalized ? `thread-${normalized}-${suffix}` : `thread-${suffix}`
}

export function deriveThreadTitleFromSeed(seed: string | null | undefined, fallbackScopeId: string): string {
  const trimmed = String(seed ?? '').replace(/\s+/g, ' ').trim()
  if (trimmed) {
    return trimmed.slice(0, 96)
  }

  return buildDerivedThreadId(fallbackScopeId).replace(/^thread-/, '').slice(0, 96)
}
