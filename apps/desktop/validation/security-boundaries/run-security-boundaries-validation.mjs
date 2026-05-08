import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ---------------------------------------------------------------------------
// Ported validation primitives (mirror the core logic in apps/desktop/src/main)
// ---------------------------------------------------------------------------

function resolveWorkspaceRelativePath(workspaceRoot, relativePath) {
  const root = String(workspaceRoot ?? '').trim()
  const candidate = String(relativePath ?? '').trim()
  if (!root || !candidate || isAbsolute(candidate)) {
    return null
  }

  const resolvedRoot = resolve(root)
  const resolvedPath = resolve(resolvedRoot, candidate)
  const relativeFromRoot = relative(resolvedRoot, resolvedPath)
  const staysInsideRoot =
    relativeFromRoot === '' || (!relativeFromRoot.startsWith('..') && !isAbsolute(relativeFromRoot))

  return staysInsideRoot ? resolvedPath : null
}

const MAX_TRANSCRIPT_CAPTURE_SIZE = 120_000
const TRANSCRIPT_TRUNCATION_NOTICE =
  '[Earlier terminal transcript output was truncated to keep the indexed transcript bounded. The full session log remains available at the terminal log path.]\n\n'

function trimTranscriptCaptureBuffer(buffer) {
  if (buffer.length <= MAX_TRANSCRIPT_CAPTURE_SIZE) {
    return { content: buffer, truncated: false }
  }

  const tailLength = Math.max(0, MAX_TRANSCRIPT_CAPTURE_SIZE - TRANSCRIPT_TRUNCATION_NOTICE.length)
  return {
    content: `${TRANSCRIPT_TRUNCATION_NOTICE}${buffer.slice(buffer.length - tailLength)}`,
    truncated: true
  }
}

function normalizeWebPanelUrl(rawUrl) {
  const trimmed = String(rawUrl ?? '').trim()
  if (!trimmed) {
    return { ok: false, url: null }
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, url: null }
    }

    return { ok: true, url: parsed.href }
  } catch {
    return { ok: false, url: null }
  }
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeWebPanelHomeUrl(value) {
  if (typeof value !== 'string') {
    return null
  }

  const result = normalizeWebPanelUrl(value)
  return result.ok ? result.url : null
}

const BUILT_IN_PANEL_IDS = new Set(['codex-cli', 'claude-code', 'custom-cli'])

function normalizeCustomWebPanels(value, reservedIds = BUILT_IN_PANEL_IDS) {
  if (!Array.isArray(value)) {
    return []
  }

  const panels = []
  const seenIds = new Set()

  for (const rawPanel of value) {
    if (!rawPanel || typeof rawPanel !== 'object' || Array.isArray(rawPanel)) {
      continue
    }

    const id = normalizeNonEmptyString(rawPanel.id)
    const title = normalizeNonEmptyString(rawPanel.title)
    const sectionId = normalizeNonEmptyString(rawPanel.sectionId)
    const homeUrl = normalizeWebPanelHomeUrl(rawPanel.homeUrl)
    const enabled = rawPanel.enabled

    if (!id || !title || !sectionId || !homeUrl || typeof enabled !== 'boolean') {
      continue
    }

    if (reservedIds.has(id) || seenIds.has(id)) {
      continue
    }

    seenIds.add(id)
    panels.push({
      id,
      title,
      sectionId,
      homeUrl,
      partition: normalizeNonEmptyString(rawPanel.partition) ?? `persist:${id}`,
      enabled
    })
  }

  return panels
}

function normalizeBuiltInWebPanels(value, baseConfigs) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const entries = []

  for (const [panelId, rawConfig] of Object.entries(value)) {
    const baseConfig = baseConfigs[panelId]
    if (!baseConfig || !rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
      continue
    }

    const homeUrl = normalizeWebPanelHomeUrl(rawConfig.homeUrl ?? baseConfig.homeUrl)
    if (!homeUrl) {
      continue
    }

    entries.push([
      panelId,
      {
        homeUrl,
        partition: normalizeNonEmptyString(rawConfig.partition) ?? baseConfig.partition,
        enabled: typeof rawConfig.enabled === 'boolean' ? rawConfig.enabled : baseConfig.enabled
      }
    ])
  }

  return Object.fromEntries(entries)
}

const SAFE_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9:._-]*$/iu
const WEB_PANEL_NAVIGATION_ACTIONS = new Set(['back', 'forward', 'reload', 'home', 'load-url'])

function guardIdentifier(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed && trimmed.length <= 256 && SAFE_IDENTIFIER_PATTERN.test(trimmed) ? trimmed : null
}

function guardOptionalIdentifier(value) {
  if (value === null || value === undefined) {
    return null
  }

  return guardIdentifier(value)
}

function guardPanelBounds(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const x = Number(value.x)
  const y = Number(value.y)
  const width = Number(value.width)
  const height = Number(value.height)
  if (![x, y, width, height].every(Number.isFinite)) {
    return null
  }

  if (Math.abs(x) > 20_000 || Math.abs(y) > 20_000 || width < 0 || height < 0 || width > 20_000 || height > 20_000) {
    return null
  }

  return { x, y, width, height }
}

function guardTerminalWrite(value) {
  return typeof value === 'string' && value.length <= 1_000_000 ? value : null
}

function guardTerminalResize(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const cols = Number(value.cols)
  const rows = Number(value.rows)
  return Number.isInteger(cols) && Number.isInteger(rows) && cols >= 1 && rows >= 1 && cols <= 1000 && rows <= 1000
    ? { cols, rows }
    : null
}

function guardWebPanelNavigationAction(value) {
  return WEB_PANEL_NAVIGATION_ACTIONS.has(value) ? value : null
}

function guardOptionalUrl(value) {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed && trimmed.length <= 4096 ? trimmed : null
}

function guardWebPanelConfigUpdate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const homeUrl = guardOptionalUrl(value.homeUrl)
  const partition = typeof value.partition === 'string' ? value.partition.trim() : null
  return homeUrl && partition && partition.length <= 256 && typeof value.enabled === 'boolean'
    ? { homeUrl, partition, enabled: value.enabled }
    : null
}

function guardSettingsUpdate(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function guardSaveClipboardOptions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const origin = typeof value.origin === 'string' ? value.origin.trim() : null
  const contextLabel = value.contextLabel === undefined ? undefined : typeof value.contextLabel === 'string' ? value.contextLabel.trim() : null
  const threadId = value.threadId === undefined ? undefined : guardOptionalIdentifier(value.threadId)
  if (!origin || origin.length > 256 || (value.contextLabel !== undefined && !contextLabel) || (value.threadId !== undefined && !threadId)) {
    return null
  }

  return {
    origin,
    ...(contextLabel ? { contextLabel } : {}),
    ...(threadId ? { threadId } : {})
  }
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0
const failures = []

function assert(description, condition) {
  if (condition) {
    passed++
  } else {
    failed++
    failures.push(description)
    console.error(`  FAIL: ${description}`)
  }
}

function section(title) {
  console.log(`\n## ${title}`)
}

// ---------------------------------------------------------------------------
// 4.1 Workspace Path Confinement
// ---------------------------------------------------------------------------

section('4.1 Workspace Path Confinement')

const testRoot = process.platform === 'win32' ? 'C:\\Workspace' : '/tmp/workspace'
const inside  = process.platform === 'win32' ? 'C:\\Workspace\\artifacts\\data.txt' : '/tmp/workspace/artifacts/data.txt'
const outside = process.platform === 'win32' ? 'C:\\Windows\\System32\\evil.dll' : '/etc/passwd'

assert('Relative path inside root resolves correctly',
  resolveWorkspaceRelativePath(testRoot, 'artifacts/data.txt') === inside)

assert('Empty candidate returns null',
  resolveWorkspaceRelativePath(testRoot, '') === null)

assert('Whitespace-only candidate returns null',
  resolveWorkspaceRelativePath(testRoot, '   ') === null)

assert('Null candidate returns null',
  resolveWorkspaceRelativePath(testRoot, null) === null)

assert('Undefined candidate returns null',
  resolveWorkspaceRelativePath(testRoot, undefined) === null)

assert('Absolute candidate (Windows-style) returns null',
  resolveWorkspaceRelativePath(testRoot, outside) === null)

assert('Absolute candidate (Unix-style on any OS) is rejected if isAbsolute true',
  resolveWorkspaceRelativePath(testRoot, '/etc/passwd') === (isAbsolute('/etc/passwd') ? null : inside.replace(/artifacts.*$/, 'etc\\passwd').replace(/\//g, sep)))

assert('Parent traversal ".." escapes root returns null',
  resolveWorkspaceRelativePath(testRoot, '../outside.txt') === null)

assert('Deep parent traversal returns null',
  resolveWorkspaceRelativePath(testRoot, '../../Windows/System32/evil.dll') === null)

assert('Dot segments are resolved safely',
  resolveWorkspaceRelativePath(testRoot, 'artifacts/./data.txt') === inside)

assert('Empty root returns null',
  resolveWorkspaceRelativePath('', 'artifacts/data.txt') === null)

assert('Whitespace root returns null',
  resolveWorkspaceRelativePath('   ', 'artifacts/data.txt') === null)

assert('Same path as root returns root itself',
  resolveWorkspaceRelativePath(testRoot, '.') === resolve(testRoot))

// ---------------------------------------------------------------------------
// 4.2 Web Panel Settings Normalization
// ---------------------------------------------------------------------------

section('4.2 Web Panel URL & Settings Normalization')

// URL validation
assert('Valid HTTPS URL passes normalization',
  normalizeWebPanelUrl('https://example.com').ok === true)

assert('Valid HTTP URL passes normalization',
  normalizeWebPanelUrl('http://localhost:3000').ok === true)

assert('File protocol is rejected',
  normalizeWebPanelUrl('file:///C:/local/file.html').ok === false)

assert('javascript: protocol is rejected',
  normalizeWebPanelUrl('javascript:alert(1)').ok === false)

assert('data: protocol is rejected',
  normalizeWebPanelUrl('data:text/html,<script>alert(1)</script>').ok === false)

assert('Empty string is rejected',
  normalizeWebPanelUrl('').ok === false)

assert('Whitespace string is rejected',
  normalizeWebPanelUrl('   ').ok === false)

assert('null input produces ok=false',
  normalizeWebPanelUrl(null).ok === false)

assert('URL with trailing/leading spaces is trimmed',
  normalizeWebPanelUrl('  https://example.com  ').url === 'https://example.com/')

// Built-in web panel normalization
const mockBaseConfigs = {
  'panel-a': { homeUrl: 'https://default.example.com', partition: 'persist:panel-a', enabled: true },
  'panel-b': { homeUrl: 'https://other.example.com', partition: 'persist:panel-b', enabled: false }
}

assert('Valid built-in override is accepted',
  normalizeBuiltInWebPanels({ 'panel-a': { homeUrl: 'https://custom.example.com', partition: 'custom', enabled: true } }, mockBaseConfigs)['panel-a']?.homeUrl === 'https://custom.example.com/')

assert('Unsafe URL override is skipped',
  normalizeBuiltInWebPanels({ 'panel-a': { homeUrl: 'javascript:void(0)', partition: 'custom', enabled: true } }, mockBaseConfigs)['panel-a'] === undefined)

assert('Unknown panel ID is skipped',
  normalizeBuiltInWebPanels({ 'unknown-panel': { homeUrl: 'https://evil.com', partition: 'x', enabled: true } }, mockBaseConfigs)['unknown-panel'] === undefined)

assert('Non-object value is safely handled',
  Object.keys(normalizeBuiltInWebPanels(null, mockBaseConfigs)).length === 0)

assert('Array value is safely handled',
  Object.keys(normalizeBuiltInWebPanels([], mockBaseConfigs)).length === 0)

assert('Missing homeUrl falls back to base config and passes',
  normalizeBuiltInWebPanels({ 'panel-a': { enabled: false } }, mockBaseConfigs)['panel-a']?.homeUrl === 'https://default.example.com/')

assert('Enabled flag defaults to base config when not provided',
  normalizeBuiltInWebPanels({ 'panel-b': { homeUrl: 'https://new.example.com' } }, mockBaseConfigs)['panel-b']?.enabled === false)

// ---------------------------------------------------------------------------
// 4.2 Custom Web Panel Settings Normalization
// ---------------------------------------------------------------------------

section('4.2 Custom Web Panel Settings Normalization')

const validCustomPanel = {
  id: 'my-custom-panel',
  title: 'My Panel',
  sectionId: 'tools',
  homeUrl: 'https://my-tool.example.com',
  partition: 'persist:my-tool',
  enabled: true
}

assert('Valid custom panel passes normalization',
  normalizeCustomWebPanels([validCustomPanel]).length === 1)

assert('Normalized panel has correct homeUrl',
  normalizeCustomWebPanels([validCustomPanel])[0].homeUrl === 'https://my-tool.example.com/')

assert('Missing id is rejected',
  normalizeCustomWebPanels([{ ...validCustomPanel, id: '' }]).length === 0)

assert('Missing title is rejected',
  normalizeCustomWebPanels([{ ...validCustomPanel, title: '  ' }]).length === 0)

assert('Missing sectionId is rejected',
  normalizeCustomWebPanels([{ ...validCustomPanel, sectionId: null }]).length === 0)

assert('Unsafe homeUrl is rejected',
  normalizeCustomWebPanels([{ ...validCustomPanel, homeUrl: 'file:///etc/passwd' }]).length === 0)

assert('Non-boolean enabled is rejected',
  normalizeCustomWebPanels([{ ...validCustomPanel, enabled: 'yes' }]).length === 0)

assert('Built-in panel ID collision is rejected',
  normalizeCustomWebPanels([{ ...validCustomPanel, id: 'codex-cli' }]).length === 0)

assert('Duplicate custom IDs are deduplicated (first wins)',
  normalizeCustomWebPanels([
    { ...validCustomPanel, id: 'dup', title: 'First' },
    { ...validCustomPanel, id: 'dup', title: 'Second' }
  ]).length === 1)

assert('Duplicate custom IDs - first entry kept',
  normalizeCustomWebPanels([
    { ...validCustomPanel, id: 'dup', title: 'First' },
    { ...validCustomPanel, id: 'dup', title: 'Second' }
  ])[0].title === 'First')

assert('null input returns empty array',
  normalizeCustomWebPanels(null).length === 0)

assert('Non-array input returns empty array',
  normalizeCustomWebPanels({ panel: 'value' }).length === 0)

assert('Mixed valid/invalid entries: only valid kept',
  normalizeCustomWebPanels([
    validCustomPanel,
    { ...validCustomPanel, id: '' },
    { ...validCustomPanel, id: 'panel-2', title: 'Panel 2' },
    { ...validCustomPanel, id: 'codex-cli' }
  ]).length === 2)

assert('Partition defaults to persist:<id> when not provided',
  normalizeCustomWebPanels([{ ...validCustomPanel, partition: undefined }])[0].partition === 'persist:my-custom-panel')

assert('Partition defaults to persist:<id> when whitespace',
  normalizeCustomWebPanels([{ ...validCustomPanel, partition: '   ' }])[0].partition === 'persist:my-custom-panel')

assert('Custom reserved IDs are respected',
  normalizeCustomWebPanels([{ ...validCustomPanel, id: 'reserved-id' }], new Set(['reserved-id'])).length === 0)

// Non-object entries in array are skipped
assert('Non-object entries in array are skipped',
  normalizeCustomWebPanels([null, 'string', 42, validCustomPanel]).length === 1)

// ---------------------------------------------------------------------------
// 4.3 Terminal Transcript Bounding
// ---------------------------------------------------------------------------

section('4.3 Terminal Transcript Bounding')

// Invariant check
assert('MAX_TRANSCRIPT_CAPTURE_SIZE > TRANSCRIPT_TRUNCATION_NOTICE.length',
  MAX_TRANSCRIPT_CAPTURE_SIZE > TRANSCRIPT_TRUNCATION_NOTICE.length)

assert('TRANSCRIPT_TRUNCATION_NOTICE has non-zero length',
  TRANSCRIPT_TRUNCATION_NOTICE.length > 0)

// Short buffer (no truncation)
const shortBuffer = 'a'.repeat(100)
const shortResult = trimTranscriptCaptureBuffer(shortBuffer)
assert('Short buffer is not truncated',
  shortResult.truncated === false)
assert('Short buffer content is preserved',
  shortResult.content === shortBuffer)

// Empty buffer
const emptyResult = trimTranscriptCaptureBuffer('')
assert('Empty buffer is not truncated',
  emptyResult.truncated === false)
assert('Empty buffer content is empty',
  emptyResult.content === '')

// Buffer at exact limit (boundary)
const exactBuffer = 'x'.repeat(MAX_TRANSCRIPT_CAPTURE_SIZE)
const exactResult = trimTranscriptCaptureBuffer(exactBuffer)
assert('Buffer at exact limit is not truncated',
  exactResult.truncated === false)
assert('Buffer at exact limit preserves all content',
  exactResult.content.length === MAX_TRANSCRIPT_CAPTURE_SIZE)

// Long buffer (truncation needed)
const longContent = Array.from({ length: 5000 }, (_, i) => `Line ${String(i).padStart(4, '0')}: some terminal output here\n`).join('')
const longBuffer = longContent.repeat(Math.ceil((MAX_TRANSCRIPT_CAPTURE_SIZE * 2) / longContent.length))
assert('Long buffer triggers truncation',
  longBuffer.length > MAX_TRANSCRIPT_CAPTURE_SIZE)
const longResult = trimTranscriptCaptureBuffer(longBuffer)
assert('Long buffer is truncated',
  longResult.truncated === true)
assert('Truncated content includes notice prefix',
  longResult.content.startsWith(TRANSCRIPT_TRUNCATION_NOTICE))
assert('Truncated content does not exceed max size',
  longResult.content.length <= MAX_TRANSCRIPT_CAPTURE_SIZE)

// Incremental growth pattern (simulates real terminal usage)
let captureBuffer = ''
let captureTruncated = false
for (let i = 0; i < 100; i++) {
  const data = `Line ${i}: output data\n`
  const nextCaptureBuffer = trimTranscriptCaptureBuffer(captureBuffer + data)
  captureBuffer = nextCaptureBuffer.content
  captureTruncated = captureTruncated || nextCaptureBuffer.truncated
}
assert('Incremental growth does not exceed max size',
  captureBuffer.length <= MAX_TRANSCRIPT_CAPTURE_SIZE)

// Verify invariant would fail with tiny limit
const tinyMax = 10
const tinyTailLength = Math.max(0, tinyMax - TRANSCRIPT_TRUNCATION_NOTICE.length)
assert('Invariant: tiny MAX would result in zero tailLength',
  tinyTailLength === 0)
assert('Invariant: current MAX gives positive tailLength',
  MAX_TRANSCRIPT_CAPTURE_SIZE - TRANSCRIPT_TRUNCATION_NOTICE.length > 0)

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

section('4.4 Workspace Maintenance Path Confinement')

const maintenanceRoot = join(tmpdir(), `deepwork-maintenance-${Date.now()}`)
const maintenanceManifestDir = join(maintenanceRoot, 'manifests')
const maintenanceArtifactDir = join(maintenanceRoot, 'artifacts')
mkdirSync(maintenanceManifestDir, { recursive: true })
mkdirSync(maintenanceArtifactDir, { recursive: true })
writeFileSync(join(maintenanceArtifactDir, 'safe.txt'), 'safe artifact', 'utf8')
const maintenanceManifest = {
  artifacts: [
    { id: 'safe_0001', path: 'artifacts/safe.txt' },
    { id: 'missing_0001', path: 'artifacts/missing.txt' },
    { id: 'duplicate_0001', path: 'artifacts/safe.txt' },
    { id: 'duplicate_0001', path: 'artifacts/safe.txt' },
    { id: 'unsafe_0001', path: '../outside/unsafe.txt' }
  ]
}
writeFileSync(join(maintenanceManifestDir, 'artifacts.json'), JSON.stringify(maintenanceManifest, null, 2), 'utf8')

const maintenanceFindings = []
const seenMaintenanceIds = new Set()
for (const artifact of maintenanceManifest.artifacts) {
  if (seenMaintenanceIds.has(artifact.id)) {
    maintenanceFindings.push('duplicate_artifact_id')
    continue
  }
  seenMaintenanceIds.add(artifact.id)

  const resolvedPath = resolveWorkspaceRelativePath(maintenanceRoot, artifact.path)
  if (!resolvedPath) {
    maintenanceFindings.push('unsafe_artifact_path')
    continue
  }
  if (!existsSync(resolvedPath)) {
    maintenanceFindings.push('missing_artifact_file')
  }
}

assert('Maintenance scan fixture reports unsafe path',
  maintenanceFindings.includes('unsafe_artifact_path'))
assert('Maintenance scan fixture reports missing artifact file',
  maintenanceFindings.includes('missing_artifact_file'))
assert('Maintenance scan fixture reports duplicate artifact id',
  maintenanceFindings.includes('duplicate_artifact_id'))
assert('Unsafe maintenance path is never resolved for file access',
  resolveWorkspaceRelativePath(maintenanceRoot, '../outside/unsafe.txt') === null)

rmSync(maintenanceRoot, { recursive: true, force: true })

// ---------------------------------------------------------------------------
// 4.5 IPC and Preload Boundary Guards
// ---------------------------------------------------------------------------

section('4.5 IPC and Preload Boundary Guards')

assert('Valid panel identifier passes IPC guard',
  guardIdentifier('custom-web-abc_123') === 'custom-web-abc_123')
assert('Non-string panel identifier is rejected',
  guardIdentifier(123) === null)
assert('Path-like panel identifier is rejected',
  guardIdentifier('../custom-web') === null)
assert('Oversized panel identifier is rejected',
  guardIdentifier('a'.repeat(300)) === null)

assert('Valid panel bounds pass IPC guard',
  JSON.stringify(guardPanelBounds({ x: 1, y: 2, width: 300, height: 200 })) === JSON.stringify({ x: 1, y: 2, width: 300, height: 200 }))
assert('Negative panel width is rejected',
  guardPanelBounds({ x: 0, y: 0, width: -1, height: 200 }) === null)
assert('Non-finite panel coordinate is rejected',
  guardPanelBounds({ x: Number.NaN, y: 0, width: 1, height: 1 }) === null)

assert('Valid web navigation action passes IPC guard',
  guardWebPanelNavigationAction('load-url') === 'load-url')
assert('Unknown web navigation action is rejected',
  guardWebPanelNavigationAction('open-devtools') === null)
assert('Optional URL rejects non-string values',
  guardOptionalUrl({ url: 'https://example.com' }) === null)

assert('Valid web panel config update passes IPC guard',
  guardWebPanelConfigUpdate({ homeUrl: 'https://example.com', partition: 'persist:test', enabled: true })?.enabled === true)
assert('Malformed web panel config update is rejected',
  guardWebPanelConfigUpdate({ homeUrl: 123, partition: 'persist:test', enabled: true }) === null)

assert('Valid terminal write passes IPC guard',
  guardTerminalWrite('hello') === 'hello')
assert('Non-string terminal write is rejected',
  guardTerminalWrite(Buffer.from('hello')) === null)
assert('Oversized terminal write is rejected',
  guardTerminalWrite('x'.repeat(1_000_001)) === null)

assert('Valid terminal resize passes IPC guard',
  JSON.stringify(guardTerminalResize({ cols: 120, rows: 32 })) === JSON.stringify({ cols: 120, rows: 32 }))
assert('Zero terminal resize dimension is rejected',
  guardTerminalResize({ cols: 0, rows: 32 }) === null)
assert('Huge terminal resize dimension is rejected',
  guardTerminalResize({ cols: 120, rows: 5000 }) === null)

assert('Settings update accepts plain records for downstream normalization',
  guardSettingsUpdate({ terminalBehavior: { scrollbackLines: '500' } }) !== null)
assert('Settings update rejects arrays',
  guardSettingsUpdate([]) === null)

assert('Valid clipboard save options pass IPC guard',
  guardSaveClipboardOptions({ origin: 'manual', contextLabel: 'Note', threadId: 'thread-1' })?.threadId === 'thread-1')
assert('Clipboard save rejects missing origin',
  guardSaveClipboardOptions({ contextLabel: 'Note' }) === null)
assert('Clipboard save rejects malformed thread id',
  guardSaveClipboardOptions({ origin: 'manual', threadId: '../thread' }) === null)

const mainSource = readFileSync(join(process.cwd(), 'src', 'main', 'index.ts'), 'utf8')
const preloadSource = readFileSync(join(process.cwd(), 'src', 'preload', 'index.ts'), 'utf8')

assert('Main window keeps contextIsolation enabled',
  mainSource.includes('contextIsolation: true'))
assert('Main window keeps nodeIntegration disabled',
  mainSource.includes('nodeIntegration: false'))
assert('Main window preload sandbox is enabled (production) or dev-relaxed',
  mainSource.includes('sandbox: true') || mainSource.includes('sandbox: app.isPackaged'))
assert('Main window denies secondary window creation',
  mainSource.includes("setWindowOpenHandler(() => ({ action: 'deny' }))"))
assert('Preload exposes purpose-specific workbench shell',
  preloadSource.includes("contextBridge.exposeInMainWorld('workbenchShell'"))
assert('Preload source does not expose raw ipcRenderer object',
  !/ipcRenderer\s*:/u.test(preloadSource) && !/return\s+ipcRenderer\b/u.test(preloadSource))

console.log(`\n========================================`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
if (failures.length > 0) {
  console.log(`\nFailures:`)
  for (const f of failures) {
    console.log(`  - ${f}`)
  }
}
console.log(`========================================\n`)

if (failed > 0) {
  process.exit(1)
}

console.log('All security boundary validations passed.\n')
