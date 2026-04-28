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
  New-Item -ItemType Directory -Force -Path (Join-Path $WorkspaceRoot 'rules') | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $WorkspaceRoot 'logs\retrieval') | Out-Null

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
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
$workspaceManagerSourcePath = Join-Path $repoRoot 'apps\desktop\src\main\workspace-manager.ts'
$workspaceSnapshotFixturePath = Join-Path $repoRoot 'apps\desktop\validation\workspace-regression\fixtures\workspace-snapshot.json'

$source = Get-Content -LiteralPath $workspaceManagerSourcePath -Raw -Encoding utf8
$workspaceProtocol = Unescape-TemplateLiteral (Get-TemplateLiteral -Source $source -Name 'WORKSPACE_PROTOCOL')
$agentsBlock = Unescape-TemplateLiteral (Get-TemplateLiteral -Source $source -Name 'AGENTS_MD_BLOCK')
$workbenchTools = Unescape-TemplateLiteral (Get-TemplateLiteral -Source $source -Name 'WORKBENCH_TOOLS')
$snapshot = Get-Content -LiteralPath $workspaceSnapshotFixturePath -Raw -Encoding utf8 | ConvertFrom-Json

Assert-Condition -Condition ($workspaceProtocol.Contains('self-contained')) -Message 'Workspace protocol should describe self-contained requests.'
Assert-Condition -Condition ($workspaceProtocol.Contains('aw-suggest')) -Message 'Workspace protocol should describe aw-suggest retrieval.'
Assert-Condition -Condition ($workspaceProtocol.Contains('do not broaden into global workspace scanning')) -Message 'Workspace protocol should forbid global workspace scanning.'
Assert-Condition -Condition ($agentsBlock.Contains('Inspect exactly one candidate scope')) -Message 'Managed AGENTS block should require single-scope inspection.'
Assert-Condition -Condition ($source.Contains('syncRetrievalAuditArtifacts')) -Message 'Workspace manager should expose retrieval audit synchronization.'
Assert-Condition -Condition ($source.Contains("captureMode: 'auto-cli-retrieval-audit'")) -Message 'Workspace manager should persist retrieval audits as workspace-managed records.'
Assert-Condition -Condition ($source.Contains("logs\\retrieval")) -Message 'Workspace manager should scan retrieval audit logs under logs\\retrieval.'

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

  . $toolsPath

  $firstResult = aw-suggest -Query '111 deepseek' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($firstResult.outcome -eq 'candidates_found') -Message "Expected candidates_found outcome, received $($firstResult.outcome)"
  Assert-Condition -Condition (@($firstResult.candidates).Count -ge 1) -Message 'Expected at least one ranked scope candidate.'
  Assert-Condition -Condition ($firstResult.candidates[0].scopeId -eq 'deepseek-web__a-chat-s-9b9f89a2-ceff') -Message "Expected DeepSeek scope to rank first, received $($firstResult.candidates[0].scopeId)"
  Assert-Condition -Condition (-not ($firstResult.candidates[0].PSObject.Properties.Name -contains 'artifacts')) -Message 'Structured aw-suggest output must not expose raw artifact lists.'
  Assert-Condition -Condition (-not ($firstResult.candidates[0].PSObject.Properties.Name -contains 'content')) -Message 'Structured aw-suggest output must not expose raw artifact content.'

  $secondCandidateResult = aw-suggest -Query 'codex session' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($secondCandidateResult.outcome -eq 'candidates_found') -Message "Expected second lookup to return candidates_found, received $($secondCandidateResult.outcome)"
  Assert-Condition -Condition (@($secondCandidateResult.candidates).Count -ge 1) -Message 'Expected a candidate for the Codex session lookup.'
  Assert-Condition -Condition ($secondCandidateResult.candidates[0].scopeId -eq 'codex-cli__session-0001') -Message "Expected Codex session scope to rank first, received $($secondCandidateResult.candidates[0].scopeId)"

  aw-origin 'codex-cli__session-0001' | Out-Null

  $thirdResult = aw-suggest -Query 'completely unrelated retrieval miss' -Top 3 -Json | ConvertFrom-Json
  Assert-Condition -Condition ($thirdResult.outcome -eq 'no_match') -Message "Expected no_match outcome, received $($thirdResult.outcome)"
  Assert-Condition -Condition ($thirdResult.reason -eq 'no_candidates') -Message "Expected no_candidates reason, received $($thirdResult.reason)"
  Assert-Condition -Condition (@($thirdResult.candidates).Count -eq 0) -Message 'No-match result should not return candidates.'

  Assert-Condition -Condition (Test-Path -LiteralPath $auditPath) -Message 'Retrieval audit log was not created.'
  Assert-Condition -Condition (-not (Test-Path -LiteralPath $statePath)) -Message 'Pending retrieval state file should be cleared after selection/no-match completion.'

  $auditEntries = @(
    Get-Content -LiteralPath $auditPath -Encoding utf8 |
      Where-Object { $_.Trim() } |
      ForEach-Object { $_ | ConvertFrom-Json }
  )

  $supersededEntry = $auditEntries | Where-Object { $_.reason -eq 'superseded_without_selection' } | Select-Object -First 1
  $selectedEntry = $auditEntries | Where-Object { $_.outcome -eq 'selected' } | Select-Object -First 1
  $noMatchEntry = $auditEntries | Where-Object { $_.reason -eq 'no_candidates' } | Select-Object -First 1

  Assert-Condition -Condition ($auditEntries.Count -eq 3) -Message "Expected 3 retrieval audit entries, received $($auditEntries.Count)"
  Assert-Condition -Condition ($supersededEntry.query -eq '111 deepseek') -Message 'Superseded audit entry should capture the original unresolved query.'
  Assert-Condition -Condition ($supersededEntry.outcome -eq 'no_match') -Message "Superseded audit entry should be finalized as no_match, received $($supersededEntry.outcome)"
  Assert-Condition -Condition ($selectedEntry.query -eq 'codex session') -Message 'Selected audit entry should capture the Codex session query.'
  Assert-Condition -Condition (@($selectedEntry.candidateScopeIds) -contains 'codex-cli__session-0001') -Message 'Selected audit entry should include ranked candidate scope IDs.'
  Assert-Condition -Condition ($selectedEntry.selectedScopeId -eq 'codex-cli__session-0001') -Message "Selected audit entry should record the chosen scope, received $($selectedEntry.selectedScopeId)"
  Assert-Condition -Condition ($noMatchEntry.reason -eq 'no_candidates') -Message "No-match audit entry should record no_candidates, received $($noMatchEntry.reason)"

  [ordered]@{
    topScopeId = $firstResult.candidates[0].scopeId
    supersededReason = $supersededEntry.reason
    auditEntries = $auditEntries.Count
    noMatchReason = $thirdResult.reason
  } | ConvertTo-Json -Compress | Write-Output
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
