$ErrorActionPreference = 'Stop'

function Assert-Condition {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Sanitize-Origin {
  param([string]$Value)

  $normalized = if ([string]::IsNullOrWhiteSpace($Value)) { 'manual' } else { $Value.Trim() }
  return ($normalized.ToLowerInvariant() -replace '[^a-z0-9-_]+', '-')
}

function Sanitize-ContextLabel {
  param([string]$Value)

  $normalized = if ($null -eq $Value) { '' } else { $Value.Trim() }
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return 'default-context'
  }

  return ($normalized.ToLowerInvariant() -replace '[^a-z0-9-_]+', '-')
}

function Get-ArtifactScopeId {
  param([Parameter(Mandatory = $true)]$Artifact)

  return '{0}__{1}' -f (Sanitize-Origin ([string]$Artifact.origin)), (Sanitize-ContextLabel ([string]$Artifact.metadata.contextLabel))
}

function Get-TemplateLiteral {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $marker = 'const ' + $Name + ' = ' + [char]96
  $start = $Source.IndexOf($marker)
  if ($start -lt 0) {
    throw "Unable to locate template literal for $Name"
  }

  $cursor = $start + $marker.Length
  $builder = New-Object System.Text.StringBuilder

  while ($cursor -lt $Source.Length) {
    $char = [string]$Source[$cursor]
    $previous = if ($cursor -gt 0) { [string]$Source[$cursor - 1] } else { '' }

    if ($char -eq [string][char]96 -and $previous -ne '\') {
      return $builder.ToString()
    }

    [void]$builder.Append($char)
    $cursor += 1
  }

  throw "Unable to find the end of template literal for $Name"
}

function Unescape-TemplateLiteral {
  param([Parameter(Mandatory = $true)][string]$Raw)

  return $Raw.Replace('\`', [string][char]96).Replace('\\', '\')
}

function Build-WorkspaceFixture {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkspaceRoot,
    [Parameter(Mandatory = $true)]
    $Snapshot
  )

  New-Item -ItemType Directory -Force -Path (Join-Path $WorkspaceRoot 'manifests\origins') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $WorkspaceRoot 'manifests\threads') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $WorkspaceRoot 'rules') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $WorkspaceRoot 'logs\retrieval') | Out-Null

  [ordered]@{
    version = '1.0'
    projectId = $Snapshot.projectId
    workspaceRoot = $WorkspaceRoot
    artifacts = @($Snapshot.artifacts)
  } |
    ConvertTo-Json -Depth 20 |
    Set-Content -LiteralPath (Join-Path $WorkspaceRoot 'manifests\artifacts.json') -Encoding utf8

  $contextIndex = [ordered]@{
    version = '1.0'
    workspaceRoot = $WorkspaceRoot
    origins = @($Snapshot.contextEntries)
  }
  $contextIndex | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $WorkspaceRoot 'manifests\context-index.json') -Encoding utf8

  foreach ($entry in $Snapshot.contextEntries) {
    $artifacts = @($Snapshot.artifacts | Where-Object { (Get-ArtifactScopeId $_) -eq $entry.scopeId })
    $originManifest = [ordered]@{
      version = '1.0'
      workspaceRoot = $WorkspaceRoot
      origin = $entry.origin
      contextLabel = $entry.contextLabel
      scopeId = $entry.scopeId
      artifacts = $artifacts
    }
    $originManifest |
      ConvertTo-Json -Depth 20 |
      Set-Content -LiteralPath (Join-Path $WorkspaceRoot ("manifests\origins\{0}.json" -f $entry.scopeId)) -Encoding utf8
  }

  $threadIndex = [ordered]@{
    version = '1.0'
    workspaceRoot = $WorkspaceRoot
    activeThreadId = $Snapshot.activeThreadId
    threads = @($Snapshot.threads)
  }
  $threadIndex |
    ConvertTo-Json -Depth 20 |
    Set-Content -LiteralPath (Join-Path $WorkspaceRoot 'manifests\thread-index.json') -Encoding utf8

  foreach ($thread in $Snapshot.threads) {
    $threadArtifacts = @($Snapshot.artifacts | Where-Object { [string]$_.metadata.threadId -eq [string]$thread.threadId })
    [ordered]@{
      version = '1.0'
      workspaceRoot = $WorkspaceRoot
      threadId = $thread.threadId
      title = $thread.title
      derived = $thread.derived
      scopeIds = @($thread.scopeIds)
      artifacts = $threadArtifacts
    } |
      ConvertTo-Json -Depth 20 |
      Set-Content -LiteralPath (Join-Path $WorkspaceRoot ("manifests\threads\{0}.json" -f $thread.threadId)) -Encoding utf8
  }
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
$workspaceManagerSourcePath = Join-Path $repoRoot 'apps\desktop\src\main\workspace-manager.ts'
$managedWorkspaceContentSourcePath = Join-Path $repoRoot 'apps\desktop\src\main\workspace-manager\managed-workspace-content.ts'
$retrievalAuditSyncSourcePath = Join-Path $repoRoot 'apps\desktop\src\main\workspace-manager\retrieval-audit-sync.ts'
$workspaceArtifactHelpersSourcePath = Join-Path $repoRoot 'apps\desktop\src\main\workspace-manager\workspace-artifact-helpers.ts'
$workspaceSnapshotFixturePath = Join-Path $repoRoot 'apps\desktop\validation\workspace-regression\fixtures\workspace-snapshot.json'

$workspaceManagerSource = Get-Content -LiteralPath $workspaceManagerSourcePath -Raw -Encoding utf8
$managedWorkspaceContentSource = Get-Content -LiteralPath $managedWorkspaceContentSourcePath -Raw -Encoding utf8
$retrievalAuditSyncSource = Get-Content -LiteralPath $retrievalAuditSyncSourcePath -Raw -Encoding utf8
$workspaceArtifactHelpersSource = Get-Content -LiteralPath $workspaceArtifactHelpersSourcePath -Raw -Encoding utf8
$workspaceProtocol = Unescape-TemplateLiteral (Get-TemplateLiteral -Source $managedWorkspaceContentSource -Name 'WORKSPACE_PROTOCOL')
$agentsBlock = Unescape-TemplateLiteral (Get-TemplateLiteral -Source $managedWorkspaceContentSource -Name 'AGENTS_MD_BLOCK')
$workbenchTools = Unescape-TemplateLiteral (Get-TemplateLiteral -Source $managedWorkspaceContentSource -Name 'WORKBENCH_TOOLS')
$snapshot = Get-Content -LiteralPath $workspaceSnapshotFixturePath -Raw -Encoding utf8 | ConvertFrom-Json

Assert-Condition -Condition ($workspaceProtocol.Contains('self-contained')) -Message 'Workspace protocol should describe self-contained requests.'
Assert-Condition -Condition ($workspaceProtocol.Contains('aw-suggest')) -Message 'Workspace protocol should describe aw-suggest retrieval.'
Assert-Condition -Condition ($workspaceProtocol.Contains('do not broaden into global workspace scanning')) -Message 'Workspace protocol should forbid global workspace scanning.'
Assert-Condition -Condition ($agentsBlock.Contains('Inspect exactly one candidate scope')) -Message 'Managed AGENTS block should require single-scope inspection.'
Assert-Condition -Condition ($workspaceManagerSource.Contains('syncRetrievalAuditArtifacts')) -Message 'Workspace manager should expose retrieval audit synchronization.'
Assert-Condition -Condition ($workspaceArtifactHelpersSource.Contains("captureMode: 'auto-cli-retrieval-audit'")) -Message 'Workspace manager should persist retrieval audits as workspace-managed records.'
Assert-Condition -Condition ($workbenchTools.Contains('function aw-threads')) -Message 'Managed tools should expose aw-threads.'
Assert-Condition -Condition ($workbenchTools.Contains('retrievalMode')) -Message 'Managed tools should preserve retrievalMode in audit entries.'
Assert-Condition -Condition (
  $retrievalAuditSyncSource.Contains("join(context.workspaceRoot, 'logs', 'retrieval')")
) -Message 'Workspace manager should scan retrieval audit logs under logs\\retrieval.'

$tempRoot = Join-Path $env:TEMP ('ai-workbench-retrieval-' + [Guid]::NewGuid().ToString('N'))
$workspaceRoot = Join-Path $tempRoot 'workspace'
$toolsPath = Join-Path $workspaceRoot 'rules\WORKBENCH_TOOLS.ps1'
$sessionScopeId = 'codex-cli__session-0007'
$auditPath = Join-Path $workspaceRoot ("logs\retrieval\{0}.jsonl" -f $sessionScopeId)
$statePath = Join-Path $workspaceRoot ("logs\retrieval\{0}.pending.json" -f $sessionScopeId)

try {
  Build-WorkspaceFixture -WorkspaceRoot $workspaceRoot -Snapshot $snapshot
  $workbenchTools | Set-Content -LiteralPath $toolsPath -Encoding utf8

  $env:AI_WORKBENCH_WORKSPACE_ROOT = $workspaceRoot
  $env:AI_WORKBENCH_MANAGED_SESSION = '1'
  $env:AI_WORKBENCH_SESSION_PANEL_ID = 'codex-cli'
  $env:AI_WORKBENCH_SESSION_TITLE = 'Codex CLI'
  $env:AI_WORKBENCH_SESSION_LAUNCH_COUNT = '7'
  $env:AI_WORKBENCH_SESSION_CONTEXT_LABEL = 'session-0007'
  $env:AI_WORKBENCH_SESSION_SCOPE_ID = $sessionScopeId
  $env:AI_WORKBENCH_RETRIEVAL_AUDIT_PATH = $auditPath
  $env:AI_WORKBENCH_RETRIEVAL_STATE_PATH = $statePath
  $env:AI_WORKBENCH_THREAD_ID = [string]$snapshot.activeThreadId
  $env:AI_WORKBENCH_THREAD_TITLE = [string]$snapshot.activeThreadTitle
  $env:AI_WORKBENCH_CLI_RETRIEVAL_PREFERENCE = 'thread-first'

  . $toolsPath

  $threadsOutput = aw-threads | Out-String
  Assert-Condition -Condition ($threadsOutput.Contains('Release Planning Thread')) -Message 'aw-threads should expose the active thread summary.'

  $threadDetail = aw-thread 'thread-release-planning' | Out-String
  Assert-Condition -Condition ($threadDetail.Contains('codex-cli__session-0001')) -Message 'aw-thread should expose member scopes for the selected thread.'

  $firstResult = aw-suggest -Query '111 deepseek' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($firstResult.outcome -eq 'candidates_found') -Message "Expected candidates_found outcome, received $($firstResult.outcome)"
  Assert-Condition -Condition ($firstResult.retrievalMode -eq 'thread_local') -Message "Expected thread_local retrieval mode, received $($firstResult.retrievalMode)"
  Assert-Condition -Condition (@($firstResult.candidates).Count -ge 1) -Message 'Expected at least one ranked scope candidate.'
  Assert-Condition -Condition ($firstResult.candidates[0].scopeId -eq 'deepseek-web__a-chat-s-9b9f89a2-ceff') -Message "Expected DeepSeek scope to rank first, received $($firstResult.candidates[0].scopeId)"
  Assert-Condition -Condition (-not ($firstResult.candidates[0].PSObject.Properties.Name -contains 'artifacts')) -Message 'Structured aw-suggest output must not expose raw artifact lists.'
  Assert-Condition -Condition (-not ($firstResult.candidates[0].PSObject.Properties.Name -contains 'content')) -Message 'Structured aw-suggest output must not expose raw artifact content.'

  $secondCandidateResult = aw-suggest -Query 'minimax agent' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($secondCandidateResult.outcome -eq 'candidates_found') -Message "Expected second lookup to return candidates_found, received $($secondCandidateResult.outcome)"
  Assert-Condition -Condition ($secondCandidateResult.retrievalMode -eq 'global_fallback') -Message "Expected global_fallback retrieval mode, received $($secondCandidateResult.retrievalMode)"
  Assert-Condition -Condition (@($secondCandidateResult.candidates).Count -ge 1) -Message 'Expected a candidate for the MiniMax fallback lookup.'
  Assert-Condition -Condition ($secondCandidateResult.candidates[0].scopeId -eq 'minimax-web__minimax-agent') -Message "Expected MiniMax scope to rank first, received $($secondCandidateResult.candidates[0].scopeId)"

  aw-origin 'minimax-web__minimax-agent' | Out-Null

  $thirdCandidateResult = aw-suggest -Query 'codex session' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($thirdCandidateResult.outcome -eq 'candidates_found') -Message "Expected third lookup to return candidates_found, received $($thirdCandidateResult.outcome)"
  Assert-Condition -Condition ($thirdCandidateResult.retrievalMode -eq 'thread_local') -Message "Expected thread_local retrieval mode for the Codex lookup, received $($thirdCandidateResult.retrievalMode)"
  Assert-Condition -Condition (@($thirdCandidateResult.candidates).Count -ge 1) -Message 'Expected a candidate for the Codex session lookup.'
  Assert-Condition -Condition ($thirdCandidateResult.candidates[0].scopeId -eq 'codex-cli__session-0001') -Message "Expected Codex session scope to rank first, received $($thirdCandidateResult.candidates[0].scopeId)"

  aw-origin 'codex-cli__session-0001' | Out-Null

  $fourthResult = aw-suggest -Query 'completely unrelated retrieval miss' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($fourthResult.outcome -eq 'no_match') -Message "Expected no_match outcome, received $($fourthResult.outcome)"
  Assert-Condition -Condition ($fourthResult.reason -eq 'no_candidates') -Message "Expected no_candidates reason, received $($fourthResult.reason)"
  Assert-Condition -Condition ($fourthResult.retrievalMode -eq 'global_fallback') -Message "Expected global_fallback for the no-match query, received $($fourthResult.retrievalMode)"
  Assert-Condition -Condition (@($fourthResult.candidates).Count -eq 0) -Message 'No-match result should not return candidates.'

  $env:AI_WORKBENCH_CLI_RETRIEVAL_PREFERENCE = 'global-first'
  $fifthResult = aw-suggest -Query '111 deepseek' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($fifthResult.outcome -eq 'candidates_found') -Message "Expected global-first lookup to return candidates_found, received $($fifthResult.outcome)"
  Assert-Condition -Condition ($fifthResult.retrievalMode -eq 'global_preferred') -Message "Expected global_preferred retrieval mode, received $($fifthResult.retrievalMode)"
  Assert-Condition -Condition (@($fifthResult.candidates).Count -ge 1) -Message 'Expected at least one candidate for the global-first lookup.'
  Assert-Condition -Condition ($fifthResult.candidates[0].scopeId -eq 'deepseek-web__a-chat-s-9b9f89a2-ceff') -Message "Expected DeepSeek scope to rank first for the global-first lookup, received $($fifthResult.candidates[0].scopeId)"

  aw-origin 'deepseek-web__a-chat-s-9b9f89a2-ceff' | Out-Null

  Assert-Condition -Condition (Test-Path -LiteralPath $auditPath) -Message 'Retrieval audit log was not created.'
  Assert-Condition -Condition (-not (Test-Path -LiteralPath $statePath)) -Message 'Pending retrieval state file should be cleared after selection/no-match completion.'

  $auditEntries = @(
    Get-Content -LiteralPath $auditPath -Encoding utf8 |
      Where-Object { $_.Trim() } |
      ForEach-Object { $_ | ConvertFrom-Json }
  )

  $supersededEntry = $auditEntries | Where-Object { $_.reason -eq 'superseded_without_selection' } | Select-Object -First 1
  $selectedFallbackEntry = $auditEntries | Where-Object { $_.selectedScopeId -eq 'minimax-web__minimax-agent' } | Select-Object -First 1
  $selectedThreadLocalEntry = $auditEntries | Where-Object { $_.selectedScopeId -eq 'codex-cli__session-0001' } | Select-Object -First 1
  $noMatchEntry = $auditEntries | Where-Object { $_.reason -eq 'no_candidates' } | Select-Object -First 1
  $selectedGlobalPreferredEntry = $auditEntries | Where-Object { $_.retrievalMode -eq 'global_preferred' } | Select-Object -First 1

  Assert-Condition -Condition ($auditEntries.Count -eq 5) -Message "Expected 5 retrieval audit entries, received $($auditEntries.Count)"
  Assert-Condition -Condition ($supersededEntry.query -eq '111 deepseek') -Message 'Superseded audit entry should capture the original unresolved query.'
  Assert-Condition -Condition ($supersededEntry.outcome -eq 'no_match') -Message "Superseded audit entry should be finalized as no_match, received $($supersededEntry.outcome)"
  Assert-Condition -Condition ($supersededEntry.retrievalMode -eq 'thread_local') -Message "Superseded audit entry should preserve thread_local mode, received $($supersededEntry.retrievalMode)"
  Assert-Condition -Condition ($selectedFallbackEntry.query -eq 'minimax agent') -Message 'Fallback selected audit entry should capture the MiniMax query.'
  Assert-Condition -Condition ($selectedFallbackEntry.retrievalMode -eq 'global_fallback') -Message "Fallback selected entry should record global_fallback, received $($selectedFallbackEntry.retrievalMode)"
  Assert-Condition -Condition ($selectedThreadLocalEntry.query -eq 'codex session') -Message 'Thread-local selected audit entry should capture the Codex session query.'
  Assert-Condition -Condition (@($selectedThreadLocalEntry.candidateScopeIds) -contains 'codex-cli__session-0001') -Message 'Thread-local selected entry should include ranked candidate scope IDs.'
  Assert-Condition -Condition ($selectedThreadLocalEntry.retrievalMode -eq 'thread_local') -Message "Thread-local selected entry should record thread_local, received $($selectedThreadLocalEntry.retrievalMode)"
  Assert-Condition -Condition ($selectedThreadLocalEntry.session.threadId -eq 'thread-release-planning') -Message "Selected entry should preserve the active thread id, received $($selectedThreadLocalEntry.session.threadId)"
  Assert-Condition -Condition ($noMatchEntry.reason -eq 'no_candidates') -Message "No-match audit entry should record no_candidates, received $($noMatchEntry.reason)"
  Assert-Condition -Condition ($noMatchEntry.retrievalMode -eq 'global_fallback') -Message "No-match audit entry should record global_fallback, received $($noMatchEntry.retrievalMode)"
  Assert-Condition -Condition ($selectedGlobalPreferredEntry.query -eq '111 deepseek') -Message 'Global-preferred selected audit entry should capture the DeepSeek query.'
  Assert-Condition -Condition ($selectedGlobalPreferredEntry.selectedScopeId -eq 'deepseek-web__a-chat-s-9b9f89a2-ceff') -Message "Global-preferred selected entry should keep the DeepSeek scope, received $($selectedGlobalPreferredEntry.selectedScopeId)"

  [ordered]@{
    topScopeId = $firstResult.candidates[0].scopeId
    firstRetrievalMode = $firstResult.retrievalMode
    fallbackRetrievalMode = $secondCandidateResult.retrievalMode
    threadLocalSelectionMode = $selectedThreadLocalEntry.retrievalMode
    globalPreferredMode = $fifthResult.retrievalMode
    auditEntries = $auditEntries.Count
    noMatchReason = $fourthResult.reason
  } | ConvertTo-Json -Compress | Write-Output
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
