export const WORKSPACE_PROTOCOL = `# Workspace Protocol

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

export const CODEX_INSTRUCTIONS = `# Codex Workspace Instructions

1. Decide first whether the user request is self-contained or context-dependent.
2. For self-contained requests, answer directly without retrieving workspace history.
3. For context-dependent requests, use aw-suggest "<request>" before opening any raw artifact file.
4. Prefer aw-suggest "<request>" -Json when structured ranking helps the retrieval decision.
5. Inspect one candidate scope with aw-origin <scopeId> before opening artifact content.
6. Open only the specific artifact files required for the current request, and do not scan unrelated scopes.
7. Write new outputs into outputs/codex/ unless a later phase overrides this.
`

export const CLAUDE_INSTRUCTIONS = `# Claude Code Workspace Instructions

1. Decide first whether the user request is self-contained or context-dependent.
2. For self-contained requests, answer directly without retrieving workspace history.
3. For context-dependent requests, use aw-suggest "<request>" before opening any raw artifact file.
4. Prefer aw-suggest "<request>" -Json when structured ranking helps the retrieval decision.
5. Inspect one candidate scope with aw-origin <scopeId> before opening artifact content.
6. Open only the specific artifact files required for the current request, and do not scan unrelated scopes.
7. Write new outputs into outputs/claude-code/ unless a later phase overrides this.
`

export const AGENTS_MD_BLOCK = `# DeepWork Codex Instructions

You are running inside a DeepWork workspace.

1. Before reading raw files, prefer the workspace manifests and helper commands.
2. First decide whether the request is self-contained or depends on earlier web, CLI, or workspace context.
3. If the request is self-contained, answer directly without retrieval.
4. If prior context matters, run \`aw-suggest "<natural-language request>"\` first, ideally before reading any raw artifact file.
5. Inspect exactly one candidate scope with \`aw-origin <scopeId>\` before opening artifact content.
6. Read only the specific artifacts you need with \`aw-artifact <id>\` or \`aw-cat-artifact <id>\`.
7. Do not recursively scan the whole workspace or load unrelated scopes when manifests are enough.
`

export const CLAUDE_MD_BLOCK = `# DeepWork Claude Instructions

This workspace is managed by DeepWork.

1. Before reading raw files, prefer the workspace manifests and helper commands.
2. First decide whether the request is self-contained or depends on earlier web, CLI, or workspace context.
3. If the request is self-contained, answer directly without retrieval.
4. If prior context matters, run \`aw-suggest "<natural-language request>"\` first, ideally before reading any raw artifact file.
5. Inspect exactly one candidate scope with \`aw-origin <scopeId>\` before opening artifact content.
6. Read only the specific artifacts you need with \`aw-artifact <id>\` or \`aw-cat-artifact <id>\`.
7. Do not recursively scan the whole workspace or load unrelated scopes when manifests are enough.
`

export const WORKBENCH_TOOLS = `function aw-workspace {
  Write-Host "Workspace Root: $env:AI_WORKBENCH_WORKSPACE_ROOT"
  Write-Host "Artifacts Manifest: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\artifacts.json')"
  Write-Host "Context Index: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\context-index.json')"
  Write-Host "Thread Index: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\thread-index.json')"
  Write-Host "Origin Manifests: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\origins')"
  Write-Host "Thread Manifests: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\threads')"
  Write-Host "Retrieval Logs: $(Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'logs\\retrieval')"
  if ($env:AI_WORKBENCH_SESSION_SCOPE_ID) {
    Write-Host "Session Scope: $env:AI_WORKBENCH_SESSION_SCOPE_ID"
  }
  if ($env:AI_WORKBENCH_THREAD_ID) {
    Write-Host "Active Thread: $env:AI_WORKBENCH_THREAD_ID"
  }
  if ($env:AI_WORKBENCH_CLI_RETRIEVAL_PREFERENCE) {
    Write-Host "CLI Retrieval Preference: $env:AI_WORKBENCH_CLI_RETRIEVAL_PREFERENCE"
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
    threadId = $env:AI_WORKBENCH_THREAD_ID
    threadTitle = $env:AI_WORKBENCH_THREAD_TITLE
  }
}

function Get-AwThreadIndexPath {
  return Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT 'manifests\\thread-index.json'
}

function aw-threads {
  $path = Get-AwThreadIndexPath
  if (-not (Test-Path -LiteralPath $path)) { Write-Error "thread-index.json not found"; return }
  $json = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  $json.threads |
    Select-Object threadId, title, scopeCount, artifactCount, latestUpdatedAt, summary |
    Format-Table -AutoSize
}

function aw-thread {
  param([Parameter(Mandatory=$true)][string]$ThreadId)
  $path = Join-Path $env:AI_WORKBENCH_WORKSPACE_ROOT ("manifests\\threads\\{0}.json" -f $ThreadId)
  if (-not (Test-Path -LiteralPath $path)) { Write-Error "thread manifest not found: $ThreadId"; return }
  Get-Content -LiteralPath $path -Raw
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
    [string]$Reason,
    [string]$RetrievalMode
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
    retrievalMode = if ([string]::IsNullOrWhiteSpace($RetrievalMode)) { $null } else { $RetrievalMode }
    outcome = $Outcome
    reason = if ([string]::IsNullOrWhiteSpace($Reason)) { $null } else { $Reason }
  }

  ($entry | ConvertTo-Json -Depth 8 -Compress) | Add-Content -LiteralPath $auditPath -Encoding utf8
}

function Complete-AwPendingLookup {
  param(
    [string]$SelectedScopeId,
    [Parameter(Mandatory=$true)][string]$Outcome,
    [string]$Reason,
    [string]$RetrievalMode
  )

  $pending = Read-AwPendingLookup
  if (-not $pending) {
    return
  }

  $resolvedRetrievalMode =
    if ([string]::IsNullOrWhiteSpace($RetrievalMode)) { [string]$pending.retrievalMode } else { $RetrievalMode }
  Write-AwRetrievalAuditEntry -Query $pending.query -Candidates @($pending.candidates) -SelectedScopeId $SelectedScopeId -Outcome $Outcome -Reason $Reason -RetrievalMode $resolvedRetrievalMode
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
  $threadIndexPath = Get-AwThreadIndexPath
  $threadIndex = if (Test-Path -LiteralPath $threadIndexPath) { Get-Content -LiteralPath $threadIndexPath -Raw | ConvertFrom-Json } else { $null }
  $activeThreadId = if (-not [string]::IsNullOrWhiteSpace($env:AI_WORKBENCH_THREAD_ID)) {
    $env:AI_WORKBENCH_THREAD_ID
  } elseif ($threadIndex) {
    [string]$threadIndex.activeThreadId
  } else {
    ''
  }
  $retrievalPreference =
    if ([string]::Equals([string]$env:AI_WORKBENCH_CLI_RETRIEVAL_PREFERENCE, 'global-first', [System.StringComparison]::OrdinalIgnoreCase)) {
      'global-first'
    } else {
      'thread-first'
    }

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
        threadId = $entry.threadId
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

  $allResults = @($results)
  $threadScopedResults = @()
  if (-not [string]::IsNullOrWhiteSpace($activeThreadId)) {
    $threadScopedResults = @($allResults | Where-Object { [string]$_.threadId -eq [string]$activeThreadId })
  }
  $hasThreadScopedResults = $threadScopedResults.Length -gt 0
  $candidatePool =
    if ($retrievalPreference -eq 'global-first') {
      $allResults
    } elseif ($hasThreadScopedResults) {
      $threadScopedResults
    } else {
      $allResults
    }
  $retrievalMode =
    if ($retrievalPreference -eq 'global-first') {
      'global_preferred'
    } elseif ($hasThreadScopedResults) {
      'thread_local'
    } elseif (-not [string]::IsNullOrWhiteSpace($activeThreadId)) {
      'global_fallback'
    } else {
      'global'
    }
  $rankedResults = @(
    $candidatePool |
      Sort-Object -Property @{ Expression = 'score'; Descending = $true }, @{ Expression = 'latestUpdatedAt'; Descending = $true }, @{ Expression = 'artifactCount'; Descending = $true }, scopeId |
      Select-Object -First $Top
  )

  if ($rankedResults.Count -eq 0) {
    Write-AwRetrievalAuditEntry -Query $trimmedQuery -Candidates @() -SelectedScopeId $null -Outcome 'no_match' -Reason 'no_candidates' -RetrievalMode $retrievalMode

    if ($Json) {
      [pscustomobject]@{
        query = $trimmedQuery
        outcome = 'no_match'
        reason = 'no_candidates'
        retrievalMode = $retrievalMode
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
    retrievalMode = $retrievalMode
  })

  if ($Json) {
    [pscustomobject]@{
      query = $trimmedQuery
      outcome = 'candidates_found'
      retrievalMode = $retrievalMode
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
}`

export type ManagedWorkspaceRuleTemplateKey =
  | 'workspace-protocol'
  | 'codex-instructions'
  | 'claude-instructions'
  | 'workbench-tools'

export type ManagedWorkspaceInstructionBlockKey = 'agents-md' | 'claude-md'

export interface ManagedWorkspaceRuleTemplate {
  key: ManagedWorkspaceRuleTemplateKey
  content: string
}

export interface ManagedWorkspaceInstructionBlockTemplate {
  key: ManagedWorkspaceInstructionBlockKey
  heading: string
  content: string
}

export function buildManagedWorkspaceRuleTemplates(): ManagedWorkspaceRuleTemplate[] {
  return [
    { key: 'workspace-protocol', content: WORKSPACE_PROTOCOL },
    { key: 'codex-instructions', content: CODEX_INSTRUCTIONS },
    { key: 'claude-instructions', content: CLAUDE_INSTRUCTIONS },
    { key: 'workbench-tools', content: WORKBENCH_TOOLS }
  ]
}

export function buildManagedWorkspaceInstructionBlocks(): ManagedWorkspaceInstructionBlockTemplate[] {
  return [
    { key: 'agents-md', heading: 'AI-WORKBENCH-CODEX', content: AGENTS_MD_BLOCK },
    { key: 'claude-md', heading: 'AI-WORKBENCH-CLAUDE', content: CLAUDE_MD_BLOCK }
  ]
}
