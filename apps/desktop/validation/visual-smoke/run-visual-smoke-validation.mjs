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
    const workspaceRoot = injected.workspaceRoot
    const workspaceSnapshot = clone(injected.snapshot)
    const artifactContents = clone(injected.contents)
    const webListeners = new Set()
    const terminalListeners = new Set()
    const workspaceListeners = new Set()
    let settings = {
      language: 'en-US',
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
      cwd: workspaceRoot,
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
      continuitySummary: 'Visual smoke terminal session'
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
        getState: async () => clone(workspaceSnapshot),
        readArtifact: async artifactId => {
          const artifact = workspaceSnapshot.artifacts.find(item => item.id === artifactId)
          return artifact ? { artifact, content: artifactContents[artifactId] ?? '' } : null
        },
        deleteScope: async () => clone(workspaceSnapshot),
        createThread: async () => clone(workspaceSnapshot),
        selectThread: async () => clone(workspaceSnapshot),
        renameThread: async () => clone(workspaceSnapshot),
        reassignScopeThread: async () => clone(workspaceSnapshot),
        resync: async () => clone(workspaceSnapshot),
        chooseRoot: async () => clone(workspaceSnapshot),
        openProfile: async () => ({ settings: clone(settings), workspace: clone(workspaceSnapshot), error: 'Workspace profile is unavailable.' }),
        saveClipboard: async () => ({ snapshot: clone(workspaceSnapshot), artifact: null }),
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
