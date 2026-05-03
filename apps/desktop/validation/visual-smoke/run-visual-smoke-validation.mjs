import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertValidationRendererAvailable, resolveValidationRendererEntrypoint } from '../renderer-entrypoint.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'visual-smoke'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
const generatedHtmlPath = join(__dirname, 'renderer-entry.generated.html')
const artifactsDir = join(__dirname, 'artifacts')
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

  if (result.stdout) {
    process.stdout.write(result.stdout)
  }

  const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  if (combinedOutput.includes('### Error')) {
    throw new Error(`playwright-cli reported an error for args: ${args.join(' ')}`)
  }
}

async function assertRendererAvailable() {
  await assertValidationRendererAvailable(getRendererEntrypoint())
}

function resolveBuildAsset(rendererRoot, reference) {
  const cleanReference = reference.split(/[?#]/u)[0]
  if (cleanReference.startsWith('/')) {
    return join(rendererRoot, cleanReference.slice(1))
  }

  return resolve(rendererRoot, cleanReference)
}

function prepareInlineRendererEntrypoint() {
  const entrypoint = getRendererEntrypoint()
  if (entrypoint.protocol !== 'file:') {
    return
  }

  const rendererRoot = dirname(entrypoint.indexPath)
  const html = readFileSync(entrypoint.indexPath, 'utf8')
    .replace(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)><\/script>/u, (_match, before, reference, after) => {
      const script = readFileSync(resolveBuildAsset(rendererRoot, reference), 'utf8')
      return `<script${before}${after}>\n${script}\n</script>`
    })
    .replace(/<link\b([^>]*?)\bhref="([^"]+)"([^>]*)>/u, (_match, _before, reference) => {
      const stylesheet = readFileSync(resolveBuildAsset(rendererRoot, reference), 'utf8')
      return `<style>\n${stylesheet}\n</style>`
    })

  writeFileSync(generatedHtmlPath, html, 'utf8')
  rendererUrlLiteral = JSON.stringify(pathToFileURL(generatedHtmlPath).href)
}

function buildBootstrapScript(payload) {
  const serialized = JSON.stringify(payload)

  return `async page => {
  const payload = ${serialized}
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.addInitScript((injected) => {
    const clone = value => JSON.parse(JSON.stringify(value))
    const activeWorkspaceRoot = injected.workspaceRoot
    const workspaceSnapshot = clone(injected.snapshot)
    const emptyWorkspaceSnapshot = {
      ...clone(injected.snapshot),
      workspaceRoot: '',
      manifestPath: '',
      contextIndexPath: '',
      originManifestsPath: '',
      threadIndexPath: '',
      threadManifestsPath: '',
      rulesPath: '',
      initialized: false,
      artifactCount: 0,
      bucketCounts: {
        'artifacts/': 0,
        'outputs/': 0,
        'logs/': 0
      },
      contextEntries: [],
      threads: [],
      activeThreadId: null,
      activeThreadTitle: null,
      artifacts: [],
      recentArtifacts: [],
      lastSavedArtifactId: null,
      lastError: null
    }
    const artifactContents = clone(injected.contents)
    const webListeners = new Set()
    const terminalListeners = new Set()
    const workspaceListeners = new Set()
    const terminalRetrievalSummaries = {
      'selected-scope': {
        query: 'release workspace controls',
        retrievalMode: 'thread_local',
        outcome: 'selected_scope',
        reason: 'highest ranked candidate',
        selectedScopeId: 'deepseek-web__a-chat-s-9b9f89a2-ceff',
        candidateCount: 2,
        auditPath: 'C:\\\\validation\\\\retrieval\\\\codex-cli__session-visual.jsonl',
        auditLine: 3,
        timestamp: '2026-04-26T12:54:18.000Z'
      },
      'global-fallback': {
        query: 'older onboarding notes',
        retrievalMode: 'global_fallback',
        outcome: 'selected_scope',
        reason: 'thread candidates missed and global index matched',
        selectedScopeId: 'manual-note__research-note',
        candidateCount: 4,
        auditPath: 'C:\\\\validation\\\\retrieval\\\\codex-cli__session-visual.jsonl',
        auditLine: 4,
        timestamp: '2026-04-26T12:55:00.000Z'
      },
      'global-preferred': {
        query: 'global architecture constraints',
        retrievalMode: 'global_preferred',
        outcome: 'selected_scope',
        reason: 'global preference selected the highest ranked scope',
        selectedScopeId: 'minimax-web__minimax-agent',
        candidateCount: 3,
        auditPath: 'C:\\\\validation\\\\retrieval\\\\codex-cli__session-visual.jsonl',
        auditLine: 5,
        timestamp: '2026-04-26T12:56:00.000Z'
      },
      'no-match': {
        query: 'unseen deployment credential',
        retrievalMode: 'thread_local',
        outcome: 'no_match',
        reason: 'no candidates met threshold',
        selectedScopeId: null,
        candidateCount: 0,
        auditPath: 'C:\\\\validation\\\\retrieval\\\\codex-cli__session-visual.jsonl',
        auditLine: 6,
        timestamp: '2026-04-26T12:57:00.000Z'
      }
    }
    let terminalRetrievalScenario = 'selected-scope'
    let currentWorkspaceSnapshot = clone(emptyWorkspaceSnapshot)
    let settings = {
      language: 'en-US',
      theme: 'light',
      workspaceRoot: null,
      workspaceProfiles: [
        {
          id: 'profile-default',
          name: 'Default Project',
          root: activeWorkspaceRoot,
          createdAt: '2026-04-25T12:00:00.000Z',
          lastUsedAt: '2026-04-26T09:15:00.000Z'
        },
        {
          id: 'profile-archive',
          name: 'Archive Notes',
          root: 'C:/Users/17740/Documents/AI-Workspace/projects/archive-notes',
          createdAt: '2026-04-20T08:00:00.000Z',
          lastUsedAt: '2026-04-21T16:20:00.000Z'
        }
      ],
      defaultWorkspaceProfileId: 'profile-default',
      terminalPreludeCommands: ['proxy_on'],
      terminalBehavior: { scrollbackLines: 1000, copyOnSelection: false, confirmMultilinePaste: true },
      threadContinuationPreference: 'continue-active-thread',
      cliRetrievalPreference: 'thread-first',
      webPanels: {},
      builtInTerminalPanels: {},
      customWebPanels: [],
      customTerminalPanels: []
    }

    const webSnapshots = {
      'deepseek-web': {
        panelId: 'deepseek-web',
        title: 'DeepSeek Web',
        homeUrl: 'https://chat.deepseek.com/',
        currentUrl: 'https://chat.deepseek.com/a/chat/s/visual-smoke',
        partition: 'persist:deepseek-web',
        canGoBack: true,
        canGoForward: false,
        isLoading: false,
        enabled: true,
        lastError: null
      },
      'minimax-web': {
        panelId: 'minimax-web',
        title: 'MiniMax Web',
        homeUrl: 'https://chat.minimax.io/',
        currentUrl: 'https://chat.minimax.io/',
        partition: 'persist:minimax-web',
        canGoBack: false,
        canGoForward: false,
        isLoading: false,
        enabled: true,
        lastError: null
      }
    }

    const terminalSnapshot = () => ({
      panelId: 'codex-cli',
      title: 'Codex CLI',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
      cwd: currentWorkspaceSnapshot.workspaceRoot || activeWorkspaceRoot,
      startupCommand: 'codex',
      status: 'running',
      hasSession: true,
      isRunning: true,
      launchCount: 1,
      pid: 4200,
      cols: 120,
      rows: 32,
      bufferSize: 64,
      logPath: 'C:\\\\validation\\\\codex.log',
      lastExitCode: null,
      lastExitSignal: null,
      lastError: null,
      contextLabel: 'session-visual',
      sessionScopeId: 'codex-cli__session-visual',
      threadId: 'thread-release-planning',
      threadTitle: 'Release Planning Thread',
      continuitySummary: 'Visual smoke terminal session',
      retrievalSummary: clone(terminalRetrievalSummaries[terminalRetrievalScenario])
    })

    const publishWebSnapshot = panelId => {
      const snapshot = clone(webSnapshots[panelId] ?? null)
      if (snapshot) {
        for (const listener of webListeners) {
          listener(snapshot)
        }
      }
      return snapshot
    }

    const publishTerminalSnapshot = () => {
      const snapshot = clone(terminalSnapshot())
      for (const listener of terminalListeners) {
        listener(snapshot)
      }
      return snapshot
    }

    window.__visualSmokeValidation = {
      setTerminalRetrievalScenario(scenario) {
        if (!terminalRetrievalSummaries[scenario]) {
          throw new Error('Unknown terminal retrieval scenario: ' + scenario)
        }
        terminalRetrievalScenario = scenario
        return publishTerminalSnapshot()
      }
    }

    window.workbenchShell = {
      versions: { electron: 'test', chrome: 'test', node: 'test' },
      clipboard: { writeText() {}, readText() { return 'visual smoke clipboard' } },
      webPanels: {
        getState: async panelId => clone(webSnapshots[panelId] ?? null),
        show: async panelId => publishWebSnapshot(panelId),
        hide: async () => null,
        updateBounds: async () => null,
        navigate: async (panelId, action, url) => {
          const snapshot = webSnapshots[panelId]
          if (!snapshot) {
            return null
          }
          if (action === 'back') {
            snapshot.canGoBack = false
          }
          if (action === 'home') {
            snapshot.currentUrl = snapshot.homeUrl
          }
          if (action === 'load-url' && url) {
            snapshot.currentUrl = url
          }
          return publishWebSnapshot(panelId)
        },
        updateConfig: async (panelId, update) => {
          const snapshot = webSnapshots[panelId]
          if (!snapshot) {
            return null
          }
          Object.assign(snapshot, update, {
            currentUrl: update.enabled === false ? update.homeUrl ?? snapshot.homeUrl : snapshot.currentUrl,
            lastError: update.enabled === false ? 'Disabled until enabled' : null
          })
          return publishWebSnapshot(panelId)
        },
        onStateChanged(listener) {
          webListeners.add(listener)
          return () => {
            webListeners.delete(listener)
          }
        }
      },
      terminals: {
        attach: async () => ({
          snapshot: clone(terminalSnapshot()),
          buffer: 'DeepWork visual smoke terminal\\r\\nPS C:\\\\workspace> claude\\r\\n▐ 14% ██ ░ 28k/200k 27115（27k）token | ≈0.09¥\\r\\n──────────────────────── ● high · /effort\\r\\nready\\r\\n'
        }),
        getState: async () => clone(terminalSnapshot()),
        start: async () => publishTerminalSnapshot(),
        restart: async () => publishTerminalSnapshot(),
        write: async () => null,
        resize: async () => null,
        clear: async () => null,
        onOutput() {
          return () => {}
        },
        onStateChanged(listener) {
          terminalListeners.add(listener)
          return () => {
            terminalListeners.delete(listener)
          }
        }
      },
      workspace: {
        getState: async () => clone(currentWorkspaceSnapshot),
        readArtifact: async artifactId => {
          const artifact = workspaceSnapshot.artifacts.find(item => item.id === artifactId)
          return artifact ? { artifact, content: artifactContents[artifactId] ?? '' } : null
        },
        deleteScope: async () => clone(currentWorkspaceSnapshot),
        createThread: async () => clone(currentWorkspaceSnapshot),
        selectThread: async () => clone(currentWorkspaceSnapshot),
        renameThread: async () => clone(currentWorkspaceSnapshot),
        reassignScopeThread: async () => clone(currentWorkspaceSnapshot),
        resync: async () => clone(currentWorkspaceSnapshot),
        chooseRoot: async () => {
          currentWorkspaceSnapshot = clone(workspaceSnapshot)
          settings = { ...settings, workspaceRoot: activeWorkspaceRoot }
          for (const listener of workspaceListeners) {
            listener(clone(currentWorkspaceSnapshot))
          }
          return clone(currentWorkspaceSnapshot)
        },
        openProfile: async profileId => {
          const profile = settings.workspaceProfiles.find(item => item.id === profileId)
          if (!profile) {
            return { settings: clone(settings), workspace: clone(currentWorkspaceSnapshot), error: 'Workspace profile is unavailable.' }
          }

          if (profile.id === 'profile-default') {
            currentWorkspaceSnapshot = clone(workspaceSnapshot)
          } else {
            currentWorkspaceSnapshot = {
              ...clone(emptyWorkspaceSnapshot),
              workspaceRoot: profile.root,
              initialized: true
            }
          }

          settings = {
            ...settings,
            workspaceRoot: profile.root,
            workspaceProfiles: settings.workspaceProfiles.map(item =>
              item.id === profile.id
                ? {
                    ...item,
                    lastUsedAt: '2026-04-26T12:58:00.000Z'
                  }
                : item
            )
          }

          for (const listener of workspaceListeners) {
            listener(clone(currentWorkspaceSnapshot))
          }

          return { settings: clone(settings), workspace: clone(currentWorkspaceSnapshot), error: null }
        },
        saveClipboard: async () => ({ snapshot: clone(currentWorkspaceSnapshot), artifact: null }),
        onStateChanged(listener) {
          workspaceListeners.add(listener)
          return () => {
            workspaceListeners.delete(listener)
          }
        }
      },
      settings: {
        getState: async () => clone(settings),
        update: async update => {
          settings = {
            ...settings,
            ...update,
            workspaceProfiles: update.workspaceProfiles ?? settings.workspaceProfiles,
            defaultWorkspaceProfileId:
              Object.prototype.hasOwnProperty.call(update, 'defaultWorkspaceProfileId')
                ? update.defaultWorkspaceProfileId
                : settings.defaultWorkspaceProfileId,
            webPanels: update.webPanels ?? settings.webPanels,
            builtInTerminalPanels: update.builtInTerminalPanels ?? settings.builtInTerminalPanels,
            customWebPanels: update.customWebPanels ?? settings.customWebPanels,
            customTerminalPanels: update.customTerminalPanels ?? settings.customTerminalPanels,
            terminalPreludeCommands: update.terminalPreludeCommands ?? settings.terminalPreludeCommands,
            terminalBehavior: update.terminalBehavior ? { ...settings.terminalBehavior, ...update.terminalBehavior } : settings.terminalBehavior,
            threadContinuationPreference:
              update.threadContinuationPreference ?? settings.threadContinuationPreference,
            cliRetrievalPreference: update.cliRetrievalPreference ?? settings.cliRetrievalPreference
          }
          return clone(settings)
        }
      }
    }
  }, payload)

  await page.goto(${getRendererUrlLiteral()}, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
}`
}

async function main() {
  await assertRendererAvailable()
  prepareInlineRendererEntrypoint()
  mkdirSync(artifactsDir, { recursive: true })

  const snapshot = JSON.parse(readFileSync(join(__dirname, '..', 'workspace-regression', 'fixtures', 'workspace-snapshot.json'), 'utf8'))
  const contents = JSON.parse(readFileSync(join(__dirname, '..', 'workspace-regression', 'fixtures', 'artifact-contents.json'), 'utf8'))
  const assertTemplate = readFileSync(join(__dirname, 'assert-visual-smoke.js'), 'utf8')
  const payload = {
    snapshot,
    contents,
    workspaceRoot: snapshot.workspaceRoot
  }

  writeFileSync(generatedBootstrapPath, buildBootstrapScript(payload), 'utf8')
  writeFileSync(generatedAssertPath, assertTemplate.replaceAll('__ARTIFACTS_DIR__', artifactsDir.replaceAll('\\', '/')), 'utf8')

  try {
    runCli(['open', '--browser', 'msedge', 'about:blank'])
    runCli(['run-code', '--filename', generatedBootstrapPath])
    runCli(['run-code', '--filename', generatedAssertPath])
  } finally {
    rmSync(generatedBootstrapPath, { force: true })
    rmSync(generatedAssertPath, { force: true })
    rmSync(generatedHtmlPath, { force: true })
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
