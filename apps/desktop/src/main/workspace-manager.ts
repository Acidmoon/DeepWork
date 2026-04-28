import { clipboard } from 'electron'
import { createHash } from 'node:crypto'
import { basename, dirname, join, relative } from 'node:path'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import {
  artifactDirectories,
  artifactExtensions,
  bucketCounts,
  buildContextEntries,
  getArtifactScopeId,
  sanitizeContextLabel,
  sanitizeOrigin,
  type ArtifactManifest,
  type ArtifactRecord,
  type ArtifactType,
  type ContextIndexManifest,
  type OriginArtifactManifest,
  type ArtifactContentPayload,
  type SaveClipboardOptions,
  type SaveClipboardResult,
  type WorkspaceSnapshot
} from '@ai-workbench/core/desktop/workspace'
import { parseRetrievalAuditEntries, type RetrievalAuditEntry } from '@ai-workbench/core/desktop/workspace'

const WORKSPACE_PROTOCOL = `# Workspace Protocol

## Basic Rules

1. Agents should read manifests before reading raw artifact files.
2. Agents must not recursively scan the entire workspace.
3. Agents must not write outside the workspace root.
4. Workspace retrieval starts from scope metadata in manifests/context-index.json, not raw artifact content.
5. Use progressive disclosure: rank scopes first, inspect one scope, then open only the specific artifact needed.

## Retrieval Decision

1. First decide whether the user request is self-contained or depends on prior web, CLI, or workspace context.
2. If the request is self-contained, answer directly and do not retrieve workspace context.
3. If prior context may matter, run aw-suggest "<natural-language request>" or aw-suggest "<request>" -Json before opening any artifact file.
4. Inspect at most one candidate scope with aw-origin <scopeId> before reading artifact content.
5. Only then open the specific artifact records you need with aw-artifact <id> or aw-cat-artifact <id>.
6. If no relevant scope is found, say so clearly or ask for clarification, and do not broaden into global workspace scanning.
`

const CODEX_INSTRUCTIONS = `# Codex Workspace Instructions

1. Decide first whether the user request is self-contained or context-dependent.
2. For self-contained requests, answer directly without retrieving workspace history.
3. For context-dependent requests, use aw-suggest "<request>" before opening any raw artifact file.
4. Prefer aw-suggest "<request>" -Json when structured ranking helps the retrieval decision.
5. Inspect one candidate scope with aw-origin <scopeId> before opening artifact content.
6. Open only the specific artifact files required for the current request, and do not scan unrelated scopes.
7. Write new outputs into outputs/codex/ unless a later phase overrides this.
`

const CLAUDE_INSTRUCTIONS = `# Claude Code Workspace Instructions

1. Decide first whether the user request is self-contained or context-dependent.
2. For self-contained requests, answer directly without retrieving workspace history.
3. For context-dependent requests, use aw-suggest "<request>" before opening any raw artifact file.
4. Prefer aw-suggest "<request>" -Json when structured ranking helps the retrieval decision.
5. Inspect one candidate scope with aw-origin <scopeId> before opening artifact content.
6. Open only the specific artifact files required for the current request, and do not scan unrelated scopes.
7. Write new outputs into outputs/claude-code/ unless a later phase overrides this.
`

const AGENTS_MD_BLOCK = `# DeepWork Codex Instructions

You are running inside a DeepWork workspace.

1. Before reading raw files, prefer the workspace manifests and helper commands.
2. First decide whether the request is self-contained or depends on earlier web, CLI, or workspace context.
3. If the request is self-contained, answer directly without retrieval.
4. If prior context matters, run \`aw-suggest "<natural-language request>"\` first, ideally before reading any raw artifact file.
5. Inspect exactly one candidate scope with \`aw-origin <scopeId>\` before opening artifact content.
6. Read only the specific artifacts you need with \`aw-artifact <id>\` or \`aw-cat-artifact <id>\`.
7. Do not recursively scan the whole workspace or load unrelated scopes when manifests are enough.
`

const CLAUDE_MD_BLOCK = `# DeepWork Claude Instructions

This workspace is managed by DeepWork.

1. Before reading raw files, prefer the workspace manifests and helper commands.
2. First decide whether the request is self-contained or depends on earlier web, CLI, or workspace context.
3. If the request is self-contained, answer directly without retrieval.
4. If prior context matters, run \`aw-suggest "<natural-language request>"\` first, ideally before reading any raw artifact file.
5. Inspect exactly one candidate scope with \`aw-origin <scopeId>\` before opening artifact content.
6. Read only the specific artifacts you need with \`aw-artifact <id>\` or \`aw-cat-artifact <id>\`.
7. Do not recursively scan the whole workspace or load unrelated scopes when manifests are enough.
`

const WORKBENCH_TOOLS = `function aw-workspace {
  Write-Host "Workspace Root: $env:AI_WORKBENCH_WORKSPACE_ROOT"
  Write-Host "Artifacts Manifest: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\artifacts.json')"
  Write-Host "Context Index: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\context-index.json')"
  Write-Host "Origin Manifests: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\origins')"
  Write-Host "Retrieval Logs: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'logs\\retrieval')"
  if ($env:AI_WORKBENCH_SESSION_SCOPE_ID) {
    Write-Host "Session Scope: $env:AI_WORKBENCH_SESSION_SCOPE_ID"
  }
}

function aw-origins {
  $path = Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\context-index.json'
  if (-not (Test-Path $path)) { Write-Error "context-index.json not found"; return }
  $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $json.origins |
    Select-Object scopeId, origin, contextLabel, artifactCount, latestArtifactId, latestUpdatedAt, @{
      Name = 'scopeSummary'
      Expression = { $_.retrieval.scopeSummary }
    } |
    Format-Table -AutoSize
}

function Get-AwSessionMetadata {
  [pscustomobject]@{
    panelId = $env:AI_WORKBENCH_SESSION_PANEL_ID
    title = $env:AI_WORKBENCH_SESSION_TITLE
    launchCount = if ($env:AI_WORKBENCH_SESSION_LAUNCH_COUNT) { [int]$env:AI_WORKBENCH_SESSION_LAUNCH_COUNT } else { $null }
    contextLabel = $env:AI_WORKBENCH_SESSION_CONTEXT_LABEL
    sessionScopeId = $env:AI_WORKBENCH_SESSION_SCOPE_ID
  }
}

function Get-AwRetrievalAuditPath {
  if ($env:AI_WORKBENCH_RETRIEVAL_AUDIT_PATH) {
    return $env:AI_WORKBENCH_RETRIEVAL_AUDIT_PATH
  }

  $directory = Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'logs\\retrieval'
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  $scopePart = if ($env:AI_WORKBENCH_SESSION_SCOPE_ID) { $env:AI_WORKBENCH_SESSION_SCOPE_ID } else { 'adhoc-session' }
  return Join-Path $directory ("{0}.jsonl" -f $scopePart)
}

function Get-AwPendingLookupPath {
  if ($env:AI_WORKBENCH_RETRIEVAL_STATE_PATH) {
    return $env:AI_WORKBENCH_RETRIEVAL_STATE_PATH
  }

  return "$(Get-AwRetrievalAuditPath).pending.json"
}

function Read-AwPendingLookup {
  $path = Get-AwPendingLookupPath
  if (-not (Test-Path -LiteralPath $path)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Clear-AwPendingLookup {
  $path = Get-AwPendingLookupPath
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Force
  }
}

function Save-AwPendingLookup {
  param([Parameter(Mandatory=$true)][object]$PendingLookup)

  $path = Get-AwPendingLookupPath
  $directory = Split-Path -Parent $path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }
  $PendingLookup | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding utf8
}

function Write-AwRetrievalAuditEntry {
  param(
    [Parameter(Mandatory=$true)][string]$Query,
    [object[]]$Candidates = @(),
    [string]$SelectedScopeId,
    [Parameter(Mandatory=$true)][string]$Outcome,
    [string]$Reason
  )

  $auditPath = Get-AwRetrievalAuditPath
  $directory = Split-Path -Parent $auditPath
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $entry = [ordered]@{
    timestamp = [DateTime]::UtcNow.ToString('o')
    session = Get-AwSessionMetadata
    query = $Query
    candidateScopeIds = @($Candidates | ForEach-Object { $_.scopeId })
    candidates = @($Candidates | ForEach-Object {
      [ordered]@{
        scopeId = $_.scopeId
        score = $_.score
        origin = $_.origin
        contextLabel = $_.contextLabel
      }
    })
    selectedScopeId = if ([string]::IsNullOrWhiteSpace($SelectedScopeId)) { $null } else { $SelectedScopeId }
    outcome = $Outcome
    reason = if ([string]::IsNullOrWhiteSpace($Reason)) { $null } else { $Reason }
  }

  ($entry | ConvertTo-Json -Depth 8 -Compress) | Add-Content -LiteralPath $auditPath -Encoding utf8
}

function Complete-AwPendingLookup {
  param(
    [string]$SelectedScopeId,
    [Parameter(Mandatory=$true)][string]$Outcome,
    [string]$Reason
  )

  $pending = Read-AwPendingLookup
  if (-not $pending) {
    return
  }

  Write-AwRetrievalAuditEntry -Query $pending.query -Candidates @($pending.candidates) -SelectedScopeId $SelectedScopeId -Outcome $Outcome -Reason $Reason
  Clear-AwPendingLookup
}

function Get-AwSuggestionTerms {
  param([Parameter(Mandatory=$true)][string]$Query)

  [regex]::Matches($Query.ToLowerInvariant(), '[\\p{L}\\p{N}]+') |
    ForEach-Object { $_.Value } |
    Where-Object { $_.Length -ge 2 -or $_ -match '^\\d+$' } |
    Select-Object -Unique
}

function aw-origin {
  param([Parameter(Mandatory=$true)][string]$ScopeId)
  $path = Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT ("manifests\\origins\\{0}.json" -f $ScopeId)
  if (-not (Test-Path $path)) { Write-Error "origin manifest not found: $ScopeId"; return }
  Complete-AwPendingLookup -SelectedScopeId $ScopeId -Outcome 'selected' -Reason $null
  Get-Content -LiteralPath $path -Raw
}

function aw-artifact {
  param([Parameter(Mandatory=$true)][string]$Id)
  $path = Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\artifacts.json'
  if (-not (Test-Path $path)) { Write-Error "artifacts.json not found"; return }
  $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $artifact = $json.artifacts | Where-Object { $_.id -eq $Id } | Select-Object -First 1
  if (-not $artifact) { Write-Error "artifact not found: $Id"; return }
  $artifact | ConvertTo-Json -Depth 8
}

function aw-cat-artifact {
  param([Parameter(Mandatory=$true)][string]$Id)
  $path = Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\artifacts.json'
  if (-not (Test-Path $path)) { Write-Error "artifacts.json not found"; return }
  $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $artifact = $json.artifacts | Where-Object { $_.id -eq $Id } | Select-Object -First 1
  if (-not $artifact) { Write-Error "artifact not found: $Id"; return }
  if (-not (Test-Path -LiteralPath $artifact.absolutePath)) { Write-Error "artifact file missing: $($artifact.absolutePath)"; return }
  Get-Content -LiteralPath $artifact.absolutePath -Raw
}

function aw-suggest {
  param(
    [Parameter(Mandatory=$true)][string]$Query,
    [int]$Top = 8,
    [switch]$Json
  )

  $path = Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\context-index.json'
  if (-not (Test-Path $path)) { Write-Error "context-index.json not found"; return }

  $trimmedQuery = $Query.Trim()
  if ([string]::IsNullOrWhiteSpace($trimmedQuery)) { Write-Error "query must not be empty"; return }

  Complete-AwPendingLookup -SelectedScopeId $null -Outcome 'no_match' -Reason 'superseded_without_selection'

  $terms = @(Get-AwSuggestionTerms -Query $trimmedQuery)
  $normalizedQuery = $trimmedQuery.ToLowerInvariant()
  $contextIndex = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json

  $results = foreach ($entry in $contextIndex.origins) {
    $searchTerms = @($entry.retrieval.searchTerms | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    $scopeSummary = [string]$entry.retrieval.scopeSummary
    $artifactTypes = @($entry.retrieval.artifactTypes)
    $tags = @($entry.retrieval.tags)
    $score = 0
    $matchedTerms = New-Object System.Collections.Generic.List[string]

    foreach ($term in $terms) {
      $matched = $false

      if ([string]$entry.scopeId -eq $term) {
        $score += 10
        $matched = $true
      }
      if ([string]$entry.retrieval.normalizedContextLabel -eq $term) {
        $score += 8
        $matched = $true
      }
      if ([string]$entry.retrieval.normalizedOrigin -eq $term) {
        $score += 6
        $matched = $true
      }
      if ($searchTerms -contains $term) {
        $score += 4
        $matched = $true
      } elseif ($searchTerms | Where-Object { [string]$_ -like "*$term*" }) {
        $score += 2
        $matched = $true
      } elseif ($scopeSummary.ToLowerInvariant().Contains($term)) {
        $score += 1
        $matched = $true
      }

      if ($matched) {
        $matchedTerms.Add($term)
      }
    }

    if ($normalizedQuery.Length -ge 3 -and $scopeSummary.ToLowerInvariant().Contains($normalizedQuery)) {
      $score += 3
    }

    if ($score -gt 0) {
      [pscustomobject]@{
        score = $score
        scopeId = $entry.scopeId
        origin = $entry.origin
        contextLabel = $entry.contextLabel
        artifactCount = $entry.artifactCount
        latestArtifactId = $entry.latestArtifactId
        latestUpdatedAt = $entry.latestUpdatedAt
        latestArtifactSummary = $entry.retrieval.latestArtifactSummary
        latestArtifactType = $entry.retrieval.latestArtifactType
        artifactTypes = $artifactTypes
        tags = $tags
        matchedTerms = @($matchedTerms | Select-Object -Unique)
        scopeSummary = $scopeSummary
      }
    }
  }

  $rankedResults = @(
    $results |
      Sort-Object -Property @{ Expression = 'score'; Descending = $true }, @{ Expression = 'latestUpdatedAt'; Descending = $true }, @{ Expression = 'artifactCount'; Descending = $true }, scopeId |
      Select-Object -First $Top
  )

  if ($rankedResults.Count -eq 0) {
    Write-AwRetrievalAuditEntry -Query $trimmedQuery -Candidates @() -SelectedScopeId $null -Outcome 'no_match' -Reason 'no_candidates'

    if ($Json) {
      [pscustomobject]@{
        query = $trimmedQuery
        outcome = 'no_match'
        reason = 'no_candidates'
        candidates = @()
      } | ConvertTo-Json -Depth 8
      return
    }

    Write-Host "No relevant scope found for query: $trimmedQuery"
    return
  }

  Save-AwPendingLookup -PendingLookup ([pscustomobject]@{
    query = $trimmedQuery
    candidates = $rankedResults
  })

  if ($Json) {
    [pscustomobject]@{
      query = $trimmedQuery
      outcome = 'candidates_found'
      candidates = $rankedResults
    } | ConvertTo-Json -Depth 8
    return
  }

  $rankedResults |
    Select-Object score, scopeId, origin, contextLabel, artifactCount, latestUpdatedAt, @{
      Name = 'matchedTerms'
      Expression = { ($_.matchedTerms -join ', ') }
    }, scopeSummary |
    Format-Table -AutoSize
}
`

interface SaveTextArtifactOptions {
  type: ArtifactType
  content: string
  origin: string
  summary: string
  tags?: string[]
  contextLabel?: string
  metadata?: Record<string, unknown>
  artifactId?: string | null
  fileName?: string
  relativePath?: string
}

interface SaveWebContextOptions {
  transcriptArtifactId?: string | null
  messagesArtifactId?: string | null
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

function nowIso(): string {
  return new Date().toISOString()
}

function ensureDirectory(path: string): void {
  mkdirSync(path, { recursive: true })
}

function safeReadManifest(path: string, workspaceRoot: string, projectId: string): ArtifactManifest {
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

function detectClipboardPayload(): { type: ArtifactType; content: string; formats: string[]; summary: string } | null {
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

function nextArtifactId(type: ArtifactType, manifest: ArtifactManifest): string {
  const prefix = `${type}_`
  const count = manifest.artifacts.filter((artifact) => artifact.id.startsWith(prefix)).length + 1
  return `${type}_${String(count).padStart(4, '0')}`
}

function fileNameForArtifact(id: string, type: ArtifactType): string {
  return `${id}.${artifactExtensions[type]}`
}

function hashContent(content: string): string {
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

function isSubstantiveArtifact(artifact: ArtifactRecord): boolean {
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

function buildRetrievalAuditArtifactId(sessionScopeId: string): string {
  return `retrieval_audit_${sanitizeOrigin(sessionScopeId)}`
}

function buildRetrievalAuditSummary(entry: RetrievalAuditEntry): string {
  const outcome = entry.outcome.replace(/[_-]+/g, ' ').trim()
  const selectedScope = entry.selectedScopeId ? ` Selected scope: ${entry.selectedScopeId}.` : ''
  const reason = entry.reason ? ` Reason: ${entry.reason}.` : ''
  const query = entry.query.replace(/\s+/g, ' ').trim()
  return `CLI retrieval audit latest outcome: ${outcome}.${selectedScope}${reason} Query: ${query}`.trim()
}

function toRetrievalAuditMetadata(entry: RetrievalAuditEntry, entryCount: number, sessionScopeId: string): Record<string, unknown> {
  return {
    captureMode: 'auto-cli-retrieval-audit',
    panelId: sanitizeOrigin(String(entry.session?.panelId ?? 'manual')),
    launchCount: entry.session?.launchCount ?? null,
    contextLabel: sanitizeContextLabel(String(entry.session?.contextLabel ?? '')),
    sessionScopeId,
    retrievalQuery: entry.query,
    retrievalOutcome: entry.outcome,
    retrievalReason: entry.reason ?? null,
    selectedScopeId: entry.selectedScopeId ?? null,
    candidateScopeIds: entry.candidateScopeIds ?? [],
    latestAuditTimestamp: entry.timestamp,
    auditEntryCount: entryCount
  }
}

function safeReadContextIndex(path: string, workspaceRoot: string): ContextIndexManifest {
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

function syncManagedInstructionFile(path: string, heading: string, block: string): void {
  const beginMarker = `<!-- ${heading}:BEGIN -->`
  const endMarker = `<!-- ${heading}:END -->`
  const managedContent = `${beginMarker}\n${block.trim()}\n${endMarker}\n`

  if (!existsSync(path)) {
    writeFileSync(path, managedContent, 'utf8')
    return
  }

  const current = readFileSync(path, 'utf8')
  if (current.includes(beginMarker) && current.includes(endMarker)) {
    const updated = current.replace(new RegExp(`${beginMarker}[\\s\\S]*?${endMarker}\\n?`, 'm'), managedContent)
    writeFileSync(path, updated, 'utf8')
    return
  }

  const separator = current.endsWith('\n') ? '\n' : '\n\n'
  writeFileSync(path, `${current}${separator}${managedContent}`, 'utf8')
}

export class WorkspaceManager {
  private readonly defaultWorkspaceRoot: string
  private projectId = 'default'
  private workspaceRoot: string
  private manifestPath: string
  private contextIndexPath: string
  private originManifestsPath: string
  private rulesPath: string
  private lastSavedArtifactId: string | null = null
  private lastError: string | null = null

  constructor(
    basePath: string,
    configuredRoot: string | null = null,
    private readonly onSnapshotChanged?: (snapshot: WorkspaceSnapshot) => void
  ) {
    this.defaultWorkspaceRoot = join(basePath, 'AI-Workspace', 'projects', 'default')
    this.workspaceRoot = this.defaultWorkspaceRoot
    this.manifestPath = join(this.workspaceRoot, 'manifests', 'artifacts.json')
    this.contextIndexPath = join(this.workspaceRoot, 'manifests', 'context-index.json')
    this.originManifestsPath = join(this.workspaceRoot, 'manifests', 'origins')
    this.rulesPath = join(this.workspaceRoot, 'rules')
    this.setWorkspaceRoot(configuredRoot)
  }

  getSnapshot(): WorkspaceSnapshot {
    this.syncRetrievalAuditArtifacts({ emitSnapshot: false })
    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const contextIndex = safeReadContextIndex(this.contextIndexPath, this.workspaceRoot)

    return {
      projectId: this.projectId,
      workspaceRoot: this.workspaceRoot,
      manifestPath: this.manifestPath,
      contextIndexPath: this.contextIndexPath,
      originManifestsPath: this.originManifestsPath,
      rulesPath: this.rulesPath,
      initialized: existsSync(this.workspaceRoot) && existsSync(this.manifestPath) && existsSync(this.contextIndexPath),
      artifactCount: manifest.artifacts.length,
      bucketCounts: bucketCounts(manifest.artifacts),
      contextEntries: contextIndex.origins,
      artifacts: [...manifest.artifacts].reverse(),
      recentArtifacts: [...manifest.artifacts].slice(-10).reverse(),
      lastSavedArtifactId: this.lastSavedArtifactId,
      lastError: this.lastError
    }
  }

  setWorkspaceRoot(root: string | null | undefined): WorkspaceSnapshot {
    const nextRoot = root?.trim() ? root.trim() : this.defaultWorkspaceRoot
    this.workspaceRoot = nextRoot
    this.projectId = basename(nextRoot) || 'default'
    this.manifestPath = join(this.workspaceRoot, 'manifests', 'artifacts.json')
    this.contextIndexPath = join(this.workspaceRoot, 'manifests', 'context-index.json')
    this.originManifestsPath = join(this.workspaceRoot, 'manifests', 'origins')
    this.rulesPath = join(this.workspaceRoot, 'rules')
    this.ensureInitialized()
    this.lastError = null
    const snapshot = this.getSnapshot()
    this.emitSnapshot(snapshot)
    return snapshot
  }

  saveClipboardAsArtifact(options: SaveClipboardOptions): SaveClipboardResult {
    this.ensureInitialized()

    const payload = detectClipboardPayload()
    if (!payload) {
      this.lastError = 'Clipboard does not contain supported HTML, markdown, or text content.'
      return {
        snapshot: this.getSnapshot(),
        artifact: null
      }
    }

    const artifact = this.saveTextArtifact({
      type: payload.type,
      content: payload.content,
      origin: options.origin || 'manual',
      summary: payload.summary,
      tags: [payload.type],
      contextLabel: options.contextLabel,
      metadata: {
        clipboardFormats: payload.formats
      }
    })

    return {
      snapshot: this.getSnapshot(),
      artifact
    }
  }

  readArtifactContent(artifactId: string): ArtifactContentPayload | null {
    this.ensureInitialized()
    this.syncRetrievalAuditArtifacts({ emitSnapshot: false })

    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const artifact = manifest.artifacts.find((item) => item.id === artifactId)
    if (!artifact || !existsSync(artifact.absolutePath)) {
      return null
    }

    return {
      artifact,
      content: readFileSync(artifact.absolutePath, 'utf8')
    }
  }

  deleteScope(scopeId: string): WorkspaceSnapshot {
    this.ensureInitialized()

    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const nextArtifacts = manifest.artifacts.filter((artifact) => getArtifactScopeId(artifact) !== scopeId)
    const removedArtifacts = manifest.artifacts.filter((artifact) => getArtifactScopeId(artifact) === scopeId)

    for (const artifact of removedArtifacts) {
      if (existsSync(artifact.absolutePath)) {
        rmSync(artifact.absolutePath, { force: true })
      }
    }

    const nextManifest: ArtifactManifest = {
      ...manifest,
      workspaceRoot: this.workspaceRoot,
      projectId: this.projectId,
      artifacts: nextArtifacts
    }

    writeFileSync(this.manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
    this.writeContextIndex(nextManifest.artifacts)

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
    content: string
  }): string | null {
    const artifact = this.saveTextArtifact({
      artifactId: input.artifactId,
      type: 'log',
      content: input.content,
      origin: input.panelId,
      summary: `${input.title} transcript captured from session ${input.launchCount}.`,
      tags: ['terminal', 'session', input.panelId],
      contextLabel: input.contextLabel,
      metadata: {
        captureMode: 'auto-terminal-transcript',
        panelId: input.panelId,
        launchCount: input.launchCount,
        contextLabel: input.contextLabel
      }
    })

    return artifact?.id ?? null
  }

  upsertWebContext(input: SaveWebContextOptions): { transcriptArtifactId: string | null; messagesArtifactId: string | null } {
    const messagePreview = input.messages?.find((message) => message.role === 'user' || message.role === 'assistant')?.text
      ?.replace(/\s+/g, ' ')
      .slice(0, 120)
    const transcriptArtifact = this.saveTextArtifact({
      artifactId: input.transcriptArtifactId,
      type: 'markdown',
      origin: input.panelId,
      summary:
        input.messages && input.messages.length > 0
          ? `Auto-captured web session from ${input.title || input.url} with ${input.messages.length} structured messages.${messagePreview ? ` Preview: ${messagePreview}` : ''}`
          : `Auto-captured web context from ${input.title || input.url}.`,
      tags: ['web', 'context', 'auto-capture', input.panelId],
      contextLabel: input.contextLabel,
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
        contextLabel: input.contextLabel
      }
    })

    const messagesArtifact =
      input.messages && input.messages.length > 0
        ? this.saveTextArtifact({
            artifactId: input.messagesArtifactId,
            type: 'json',
            origin: input.panelId,
            summary: `Structured message index for ${input.title || input.url}.${messagePreview ? ` Preview: ${messagePreview}` : ''}`,
            tags: ['web', 'messages', 'session-index', input.panelId],
            contextLabel: input.contextLabel,
            content: JSON.stringify(
              {
                version: '1.0',
                panelId: input.panelId,
                title: input.title,
                url: input.url,
                contextLabel: input.contextLabel,
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
              contextLabel: input.contextLabel
            }
          })
        : null

    return {
      transcriptArtifactId: transcriptArtifact?.id ?? null,
      messagesArtifactId: messagesArtifact?.id ?? input.messagesArtifactId ?? null
    }
  }

  syncRetrievalAuditArtifacts(options: { sessionScopeId?: string | null; emitSnapshot?: boolean } = {}): WorkspaceSnapshot {
    this.ensureInitialized()

    const nextManifest = this.syncRetrievalAuditArtifactsInternal(options.sessionScopeId ?? null)
    const snapshot = this.getSnapshotFromManifest(nextManifest)

    if (options.emitSnapshot ?? true) {
      this.emitSnapshot(snapshot)
    }

    return snapshot
  }

  private ensureInitialized(): void {
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
      [join(this.workspaceRoot, 'manifests', 'summaries.json'), JSON.stringify({ version: '1.0', summaries: [] }, null, 2)],
      [join(this.workspaceRoot, 'manifests', 'tasks.json'), JSON.stringify({ version: '1.0', tasks: [] }, null, 2)]
    ]

    for (const [path, content] of files) {
      if (!existsSync(path)) {
        writeFileSync(path, content, 'utf8')
      }
    }

    const managedFiles: Array<[string, string]> = [
      [join(this.workspaceRoot, 'rules', 'WORKSPACE_PROTOCOL.md'), WORKSPACE_PROTOCOL],
      [join(this.workspaceRoot, 'rules', 'CODEX_INSTRUCTIONS.md'), CODEX_INSTRUCTIONS],
      [join(this.workspaceRoot, 'rules', 'CLAUDE_INSTRUCTIONS.md'), CLAUDE_INSTRUCTIONS],
      [join(this.workspaceRoot, 'rules', 'WORKBENCH_TOOLS.ps1'), WORKBENCH_TOOLS]
    ]

    for (const [path, content] of managedFiles) {
      writeFileSync(path, content, 'utf8')
    }

    syncManagedInstructionFile(join(this.workspaceRoot, 'AGENTS.md'), 'AI-WORKBENCH-CODEX', AGENTS_MD_BLOCK)
    syncManagedInstructionFile(join(this.workspaceRoot, 'CLAUDE.md'), 'AI-WORKBENCH-CLAUDE', CLAUDE_MD_BLOCK)

    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    this.writeContextIndex(manifest.artifacts)
  }

  private saveTextArtifact(options: SaveTextArtifactOptions): ArtifactRecord | null {
    this.ensureInitialized()

    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const existingArtifact = options.artifactId
      ? manifest.artifacts.find((artifact) => artifact.id === options.artifactId) ?? null
      : null
    const artifactType = existingArtifact?.type ?? options.type
    const id = existingArtifact?.id ?? nextArtifactId(artifactType, manifest)
    const fileName = existingArtifact?.name ?? options.fileName ?? fileNameForArtifact(id, artifactType)
    const relativePath =
      existingArtifact?.path ?? options.relativePath ?? join(artifactDirectories[artifactType], fileName).replaceAll('\\', '/')
    const absolutePath = join(this.workspaceRoot, relativePath)
    const createdAt = existingArtifact?.createdAt ?? nowIso()
    const updatedAt = nowIso()
    const origin = sanitizeOrigin(options.origin || existingArtifact?.origin || 'manual')
    const contextLabel = sanitizeContextLabel(options.contextLabel ?? String(existingArtifact?.metadata?.contextLabel ?? ''))

    ensureDirectory(dirname(absolutePath))
    ensureDirectory(join(this.workspaceRoot, 'outputs', origin))
    writeFileSync(absolutePath, options.content, 'utf8')

    const stat = statSync(absolutePath)
    const artifact: ArtifactRecord = {
      id,
      name: fileName,
      type: artifactType,
      path: relative(this.workspaceRoot, absolutePath).replaceAll('\\', '/'),
      absolutePath,
      origin,
      summary: options.summary,
      tags: [...new Set([artifactType, origin, ...(existingArtifact?.tags ?? []), ...(options.tags ?? [])])],
      parents: existingArtifact?.parents ?? [],
      createdAt,
      updatedAt,
      size: stat.size,
      hash: hashContent(options.content),
      metadata: {
        ...(existingArtifact?.metadata ?? {}),
        ...(options.metadata ?? {}),
        contextLabel
      }
    }

    const nextManifest: ArtifactManifest = {
      ...manifest,
      workspaceRoot: this.workspaceRoot,
      projectId: this.projectId,
      artifacts: existingArtifact
        ? manifest.artifacts.map((item) => (item.id === artifact.id ? artifact : item))
        : [...manifest.artifacts, artifact]
    }

    writeFileSync(this.manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
    this.writeContextIndex(nextManifest.artifacts)
    this.lastSavedArtifactId = artifact.id
    this.lastError = null
    this.emitSnapshot()
    return artifact
  }

  private emitSnapshot(snapshot?: WorkspaceSnapshot): void {
    if (!this.onSnapshotChanged) {
      return
    }

    this.onSnapshotChanged(snapshot ?? this.getSnapshot())
  }

  private getSnapshotFromManifest(manifest: ArtifactManifest): WorkspaceSnapshot {
    const contextIndex = safeReadContextIndex(this.contextIndexPath, this.workspaceRoot)

    return {
      projectId: this.projectId,
      workspaceRoot: this.workspaceRoot,
      manifestPath: this.manifestPath,
      contextIndexPath: this.contextIndexPath,
      originManifestsPath: this.originManifestsPath,
      rulesPath: this.rulesPath,
      initialized: existsSync(this.workspaceRoot) && existsSync(this.manifestPath) && existsSync(this.contextIndexPath),
      artifactCount: manifest.artifacts.length,
      bucketCounts: bucketCounts(manifest.artifacts),
      contextEntries: contextIndex.origins,
      artifacts: [...manifest.artifacts].reverse(),
      recentArtifacts: [...manifest.artifacts].slice(-10).reverse(),
      lastSavedArtifactId: this.lastSavedArtifactId,
      lastError: this.lastError
    }
  }

  private syncRetrievalAuditArtifactsInternal(sessionScopeId: string | null): ArtifactManifest {
    const manifest = safeReadManifest(this.manifestPath, this.workspaceRoot, this.projectId)
    const retrievalDirectory = join(this.workspaceRoot, 'logs', 'retrieval')
    if (!existsSync(retrievalDirectory)) {
      return manifest
    }

    const candidateFiles = readdirSync(retrievalDirectory)
      .filter((fileName) => fileName.endsWith('.jsonl'))
      .filter((fileName) => !sessionScopeId || fileName === `${sessionScopeId}.jsonl`)

    let nextArtifacts = manifest.artifacts
    let changed = false

    for (const fileName of candidateFiles) {
      const relativePath = join('logs', 'retrieval', fileName).replaceAll('\\', '/')
      const absolutePath = join(this.workspaceRoot, relativePath)
      if (!existsSync(absolutePath)) {
        continue
      }

      const content = readFileSync(absolutePath, 'utf8')
      const entries = parseRetrievalAuditEntries(content)
      if (entries.length === 0) {
        continue
      }

      const latestEntry = entries[entries.length - 1]
      const resolvedSessionScopeId =
        String(latestEntry.session?.sessionScopeId ?? '').trim() || fileName.replace(/\.jsonl$/i, '')
      const artifactId = buildRetrievalAuditArtifactId(resolvedSessionScopeId)
      const origin = sanitizeOrigin(String(latestEntry.session?.panelId ?? 'manual'))
      const summary = buildRetrievalAuditSummary(latestEntry)
      const metadata = toRetrievalAuditMetadata(latestEntry, entries.length, resolvedSessionScopeId)
      const stat = statSync(absolutePath)
      const hash = hashContent(content)
      const tags = [...new Set(['log', 'retrieval', 'audit', origin])]
      const existingArtifact = nextArtifacts.find((artifact) => artifact.id === artifactId) ?? null

      const nextArtifact: ArtifactRecord = {
        id: artifactId,
        name: existingArtifact?.name ?? fileName,
        type: 'log',
        path: relativePath,
        absolutePath,
        origin,
        summary,
        tags,
        parents: existingArtifact?.parents ?? [],
        createdAt: existingArtifact?.createdAt ?? latestEntry.timestamp,
        updatedAt: latestEntry.timestamp,
        size: stat.size,
        hash,
        metadata
      }

      const hasChanged =
        !existingArtifact ||
        existingArtifact.hash !== nextArtifact.hash ||
        existingArtifact.summary !== nextArtifact.summary ||
        JSON.stringify(existingArtifact.metadata ?? {}) !== JSON.stringify(nextArtifact.metadata ?? {})

      if (!hasChanged) {
        continue
      }

      changed = true
      nextArtifacts = existingArtifact
        ? nextArtifacts.map((artifact) => (artifact.id === artifactId ? nextArtifact : artifact))
        : [...nextArtifacts, nextArtifact]
      this.lastSavedArtifactId = artifactId
    }

    if (!changed) {
      return manifest
    }

    const nextManifest: ArtifactManifest = {
      ...manifest,
      workspaceRoot: this.workspaceRoot,
      projectId: this.projectId,
      artifacts: nextArtifacts
    }

    writeFileSync(this.manifestPath, JSON.stringify(nextManifest, null, 2), 'utf8')
    this.writeContextIndex(nextManifest.artifacts)
    this.lastError = null
    return nextManifest
  }

  private writeContextIndex(artifacts: ArtifactRecord[]): void {
    const nextIndex: ContextIndexManifest = {
      version: '1.0',
      workspaceRoot: this.workspaceRoot,
      origins: buildContextEntries(artifacts, {
        isArtifactSubstantive: isSubstantiveArtifact
      })
    }

    writeFileSync(this.contextIndexPath, JSON.stringify(nextIndex, null, 2), 'utf8')

    for (const fileName of readdirSync(this.originManifestsPath)) {
      if (fileName.endsWith('.json')) {
        rmSync(join(this.originManifestsPath, fileName), { force: true })
      }
    }

    for (const entry of nextIndex.origins) {
      const originArtifacts = artifacts.filter((artifact) => sanitizeOrigin(artifact.origin) === entry.origin)
        .filter((artifact) => sanitizeContextLabel(String(artifact.metadata?.contextLabel ?? '')) === entry.contextLabel)
      const originManifest: OriginArtifactManifest = {
        version: '1.0',
        workspaceRoot: this.workspaceRoot,
        origin: entry.origin,
        contextLabel: entry.contextLabel,
        scopeId: entry.scopeId,
        artifacts: originArtifacts
      }

      writeFileSync(join(this.originManifestsPath, `${entry.scopeId}.json`), JSON.stringify(originManifest, null, 2), 'utf8')
    }
  }
}
