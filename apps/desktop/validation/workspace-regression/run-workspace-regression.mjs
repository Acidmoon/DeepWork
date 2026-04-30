import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertValidationRendererAvailable, resolveValidationRendererEntrypoint } from '../renderer-entrypoint.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'workspace-regression'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
const artifactsDir = join(__dirname, 'artifacts')
const screenshotPath = join(artifactsDir, 'verification-artifacts.png')
let rendererEntrypoint = null
let rendererUrlLiteral = null

function getRendererEntrypoint() {
  if (!rendererEntrypoint) {
    rendererEntrypoint = resolveValidationRendererEntrypoint()
    rendererUrlLiteral = JSON.stringify(rendererEntrypoint.url)
  }

  return rendererEntrypoint
}

function getRendererUrlLiteral() {
  getRendererEntrypoint()
  return rendererUrlLiteral
}

function quoteForCmd(value) {
  if (!/[ \t"]/u.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '\\"')}"`
}

function runCli(args) {
  const command = [npxCommand, '--yes', '--package', '@playwright/cli', 'playwright-cli', '--session', sessionName, ...args]
    .map(quoteForCmd)
    .join(' ')
  const result =
    process.platform === 'win32'
      ? spawnSync(commandShell, ['/d', '/s', '/c', command], { cwd: __dirname, encoding: 'utf8' })
      : spawnSync(npxCommand, ['--yes', '--package', '@playwright/cli', 'playwright-cli', '--session', sessionName, ...args], {
          cwd: __dirname,
          encoding: 'utf8'
        })

  if (result.status !== 0) {
    if (result.stdout) {
      console.error(result.stdout)
    }
    if (result.stderr) {
      console.error(result.stderr)
    }
    if (result.error) {
      console.error(result.error)
    }
    throw new Error(`playwright-cli failed for args: ${args.join(' ')} (status=${result.status ?? 'null'})`)
  }
}

async function assertRendererAvailable() {
  await assertValidationRendererAvailable(getRendererEntrypoint())
}

function buildBootstrapScript(payload) {
  const serialized = JSON.stringify(payload)

  return `async page => {
  const payload = ${serialized}
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.addInitScript((injected) => {
    const clone = value => JSON.parse(JSON.stringify(value))
    const workspaceRoot = injected.workspaceRoot
    let currentSnapshot = clone(injected.snapshot)
    let currentContents = clone(injected.contents)
    const workspaceListeners = new Set()
    let threadCounter = (currentSnapshot.threads ?? []).length
    const threadRegistry = new Map((currentSnapshot.threads ?? []).map(thread => [
      thread.threadId,
      {
        title: thread.title,
        derived: Boolean(thread.derived)
      }
    ]))

    const sanitize = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-')
    const sanitizeContextLabel = value => {
      const normalized = String(value ?? '').trim()
      return normalized ? normalized.toLowerCase().replace(/[^a-z0-9-_]+/g, '-') : 'default-context'
    }
    const getArtifactScopeId = artifact => {
      const origin = sanitize(artifact.origin || 'manual') || 'manual'
      return \`\${origin}__\${sanitizeContextLabel(artifact.metadata?.contextLabel)}\`
    }
    const deriveThreadTitle = threadId => threadId.replace(/^thread-/, '').replace(/[-_]+/g, ' ').trim() || threadId

    const publishWorkspaceSnapshot = () => {
      const snapshot = clone(currentSnapshot)
      for (const listener of workspaceListeners) {
        listener(snapshot)
      }
      return snapshot
    }

    const rebuildThreadState = () => {
      const scopeArtifacts = new Map()
      for (const artifact of currentSnapshot.artifacts) {
        const scopeId = getArtifactScopeId(artifact)
        const items = scopeArtifacts.get(scopeId) ?? []
        items.push(artifact)
        scopeArtifacts.set(scopeId, items)
      }

      for (const entry of currentSnapshot.contextEntries) {
        const fallbackThreadId = \`thread-\${sanitize(entry.scopeId)}\`
        entry.threadId = sanitize(entry.threadId || fallbackThreadId) || fallbackThreadId
        if (!threadRegistry.has(entry.threadId)) {
          threadRegistry.set(entry.threadId, {
            title: deriveThreadTitle(entry.threadId),
            derived: true
          })
        }
      }

      const scopeThreadMap = new Map(currentSnapshot.contextEntries.map(entry => [entry.scopeId, entry.threadId]))
      const normalizeArtifactThread = artifact => {
        const scopeId = getArtifactScopeId(artifact)
        const threadId = scopeThreadMap.get(scopeId) ?? sanitize(artifact.metadata?.threadId) ?? \`thread-\${sanitize(scopeId)}\`
        return {
          ...artifact,
          metadata: {
            ...(artifact.metadata ?? {}),
            threadId
          }
        }
      }

      currentSnapshot.artifacts = currentSnapshot.artifacts.map(normalizeArtifactThread)
      currentSnapshot.recentArtifacts = currentSnapshot.recentArtifacts.map(normalizeArtifactThread)

      const threadIds = new Set([
        ...Array.from(threadRegistry.keys()),
        ...currentSnapshot.contextEntries.map(entry => entry.threadId)
      ])

      currentSnapshot.threads = Array.from(threadIds).map(threadId => {
        const scopeIds = currentSnapshot.contextEntries
          .filter(entry => entry.threadId === threadId)
          .map(entry => entry.scopeId)
        const artifacts = currentSnapshot.artifacts
          .filter(artifact => scopeIds.includes(getArtifactScopeId(artifact)))
          .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
        const meta = threadRegistry.get(threadId) ?? {
          title: deriveThreadTitle(threadId),
          derived: true
        }

        return {
          threadId,
          title: meta.title,
          derived: meta.derived,
          scopeIds,
          artifactIds: artifacts.map(artifact => artifact.id),
          scopeCount: scopeIds.length,
          artifactCount: artifacts.length,
          latestArtifactId: artifacts[0]?.id ?? null,
          latestUpdatedAt: artifacts[0]?.updatedAt ?? null,
          originHints: Array.from(new Set(artifacts.map(artifact => artifact.origin))),
          searchTerms: Array.from(new Set([threadId, meta.title, ...scopeIds])),
          summary: artifacts.slice(0, 2).map(artifact => artifact.summary).join(' | ')
        }
      }).sort((left, right) => String(right.latestUpdatedAt ?? '').localeCompare(String(left.latestUpdatedAt ?? '')))

      if (!currentSnapshot.threads.some(thread => thread.threadId === currentSnapshot.activeThreadId)) {
        currentSnapshot.activeThreadId = currentSnapshot.threads[0]?.threadId ?? null
      }
      currentSnapshot.activeThreadTitle =
        currentSnapshot.threads.find(thread => thread.threadId === currentSnapshot.activeThreadId)?.title ?? null
      currentSnapshot.threadIndexPath = currentSnapshot.threadIndexPath ?? \`\${workspaceRoot}/manifests/thread-index.json\`
      currentSnapshot.threadManifestsPath = currentSnapshot.threadManifestsPath ?? \`\${workspaceRoot}/manifests/threads\`
    }

    rebuildThreadState()

    const buildTerminalSnapshot = () => ({
      panelId: 'codex-cli',
      title: 'Codex CLI',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
      cwd: workspaceRoot,
      startupCommand: 'codex',
      status: 'running',
      hasSession: true,
      isRunning: true,
      launchCount: 1,
      pid: 4242,
      cols: 120,
      rows: 32,
      bufferSize: 0,
      logPath: \`\${workspaceRoot}/logs/log_0010.log\`,
      lastExitCode: null,
      lastExitSignal: null,
      lastError: null,
      contextLabel: 'session-0001',
      sessionScopeId: 'codex-cli__session-0001',
      threadId: 'thread-release-planning',
      threadTitle: 'Release Planning Thread',
      continuitySummary: null
    })

    window.__workspaceRegressionValidation = {
      getState: () => clone({
        snapshot: currentSnapshot,
        contents: currentContents
      })
    }

    window.workbenchShell = {
      versions: { electron: 'test', chrome: 'test', node: 'test' },
      clipboard: { writeText() {}, readText() { return '' } },
      webPanels: {
        getState: async () => null,
        show: async () => null,
        hide: async () => null,
        updateBounds: async () => null,
        navigate: async () => null,
        updateConfig: async () => null,
        onStateChanged() { return () => {} }
      },
      terminals: {
        attach: async () => ({ snapshot: clone(buildTerminalSnapshot()), buffer: '' }),
        getState: async () => clone(buildTerminalSnapshot()),
        start: async () => clone(buildTerminalSnapshot()),
        restart: async () => clone(buildTerminalSnapshot()),
        write: async () => null,
        resize: async () => null,
        clear: async () => null,
        onOutput() { return () => {} },
        onStateChanged() { return () => {} }
      },
      workspace: {
        getState: async () => clone(currentSnapshot),
        readArtifact: async artifactId => {
          const artifact = currentSnapshot.artifacts.find(item => item.id === artifactId)
          return artifact ? { artifact, content: currentContents[artifactId] ?? '' } : null
        },
        deleteScope: async scopeId => {
          currentSnapshot.contextEntries = currentSnapshot.contextEntries.filter(entry => entry.scopeId !== scopeId)
          currentSnapshot.artifacts = currentSnapshot.artifacts.filter(artifact => getArtifactScopeId(artifact) !== scopeId)
          currentSnapshot.recentArtifacts = currentSnapshot.recentArtifacts.filter(artifact => getArtifactScopeId(artifact) !== scopeId)
          currentSnapshot.artifactCount = currentSnapshot.artifacts.length
          rebuildThreadState()
          publishWorkspaceSnapshot()
          return clone(currentSnapshot)
        },
        createThread: async title => {
          threadCounter += 1
          const threadId = \`thread-validation-\${String(threadCounter).padStart(2, '0')}\`
          threadRegistry.set(threadId, {
            title: String(title ?? '').trim() || \`Validation Thread \${threadCounter}\`,
            derived: false
          })
          currentSnapshot.activeThreadId = threadId
          rebuildThreadState()
          publishWorkspaceSnapshot()
          return clone(currentSnapshot)
        },
        selectThread: async threadId => {
          currentSnapshot.activeThreadId = threadId || null
          rebuildThreadState()
          publishWorkspaceSnapshot()
          return clone(currentSnapshot)
        },
        renameThread: async (threadId, title) => {
          const normalizedThreadId = sanitize(threadId)
          const existing = threadRegistry.get(normalizedThreadId) ?? {
            title: deriveThreadTitle(normalizedThreadId),
            derived: false
          }
          threadRegistry.set(normalizedThreadId, {
            ...existing,
            title: String(title ?? '').trim() || existing.title,
            derived: false
          })
          rebuildThreadState()
          publishWorkspaceSnapshot()
          return clone(currentSnapshot)
        },
        reassignScopeThread: async (scopeId, threadId) => {
          const normalizedThreadId = sanitize(threadId)
          if (!threadRegistry.has(normalizedThreadId)) {
            threadRegistry.set(normalizedThreadId, {
              title: deriveThreadTitle(normalizedThreadId),
              derived: false
            })
          }
          currentSnapshot.contextEntries = currentSnapshot.contextEntries.map(entry =>
            entry.scopeId === scopeId ? { ...entry, threadId: normalizedThreadId } : entry
          )
          currentSnapshot.activeThreadId = normalizedThreadId
          rebuildThreadState()
          publishWorkspaceSnapshot()
          return clone(currentSnapshot)
        },
        resync: async () => clone(currentSnapshot),
        chooseRoot: async () => clone(currentSnapshot),
        openProfile: async () => ({
          settings: {
            language: 'zh-CN',
            theme: 'light',
            workspaceRoot,
            workspaceProfiles: [],
            defaultWorkspaceProfileId: null,
            terminalPreludeCommands: ['proxy_on'],
            terminalBehavior: { scrollbackLines: 1000, copyOnSelection: false, confirmMultilinePaste: true },
            threadContinuationPreference: 'continue-active-thread',
            cliRetrievalPreference: 'thread-first',
            webPanels: {},
            builtInTerminalPanels: {},
            customWebPanels: [],
            customTerminalPanels: []
          },
          workspace: clone(currentSnapshot),
          error: 'Workspace profile is unavailable.'
        }),
        saveClipboard: async () => ({ snapshot: clone(currentSnapshot), artifact: null }),
        onStateChanged(listener) {
          workspaceListeners.add(listener)
          return () => {
            workspaceListeners.delete(listener)
          }
        }
      },
      settings: {
        getState: async () => ({
          language: 'zh-CN',
          theme: 'light',
          workspaceRoot,
          workspaceProfiles: [],
          defaultWorkspaceProfileId: null,
          terminalPreludeCommands: ['proxy_on'],
          terminalBehavior: { scrollbackLines: 1000, copyOnSelection: false, confirmMultilinePaste: true },
          threadContinuationPreference: 'continue-active-thread',
          cliRetrievalPreference: 'thread-first',
          webPanels: {},
          builtInTerminalPanels: {},
          customWebPanels: [],
          customTerminalPanels: []
        }),
        update: async update => ({
          language: update.language ?? 'zh-CN',
          theme: update.theme ?? 'light',
          workspaceRoot,
          workspaceProfiles: update.workspaceProfiles ?? [],
          defaultWorkspaceProfileId:
            Object.prototype.hasOwnProperty.call(update, 'defaultWorkspaceProfileId') ? update.defaultWorkspaceProfileId : null,
          terminalPreludeCommands: ['proxy_on'],
          terminalBehavior: { scrollbackLines: 1000, copyOnSelection: false, confirmMultilinePaste: true },
          threadContinuationPreference: update.threadContinuationPreference ?? 'continue-active-thread',
          cliRetrievalPreference: update.cliRetrievalPreference ?? 'thread-first',
          webPanels: {},
          builtInTerminalPanels: {},
          customWebPanels: [],
          customTerminalPanels: []
        })
      }
    }
  }, payload)

  await page.goto(${getRendererUrlLiteral()}, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
}`
}

async function main() {
  await assertRendererAvailable()
  mkdirSync(artifactsDir, { recursive: true })

  const snapshot = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'workspace-snapshot.json'), 'utf8'))
  const contents = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'artifact-contents.json'), 'utf8'))
  const payload = {
    snapshot,
    contents,
    workspaceRoot: snapshot.workspaceRoot
  }
  const assertTemplate = readFileSync(join(__dirname, 'assert-workspace-flow.js'), 'utf8')

  writeFileSync(generatedBootstrapPath, buildBootstrapScript(payload), 'utf8')
  writeFileSync(generatedAssertPath, assertTemplate.replace('__SCREENSHOT_PATH__', screenshotPath.replaceAll('\\', '\\\\')), 'utf8')

  try {
    runCli(['open', '--browser', 'msedge', 'about:blank'])
    runCli(['run-code', '--filename', 'bootstrap.generated.js'])
    runCli(['run-code', '--filename', 'assert.generated.js'])
  } finally {
    rmSync(generatedBootstrapPath, { force: true })
    rmSync(generatedAssertPath, { force: true })
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
