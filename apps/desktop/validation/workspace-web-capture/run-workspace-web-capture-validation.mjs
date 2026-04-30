import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertValidationRendererAvailable, resolveValidationRendererEntrypoint } from '../renderer-entrypoint.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'workspace-web-capture'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
const artifactsDir = join(__dirname, 'artifacts')
const screenshotPath = join(artifactsDir, 'workspace-web-capture.png')
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
    let currentSnapshot = clone(injected.beforeSnapshot)
    let currentContents = clone(injected.beforeContents)
    let webSnapshot = clone(injected.webBeforeSnapshot)
    let resyncCount = 0
    const workspaceListeners = new Set()
    const webListeners = new Set()

    const publishWorkspaceSnapshot = () => {
      const snapshot = clone(currentSnapshot)
      for (const listener of workspaceListeners) {
        listener(snapshot)
      }
      return snapshot
    }

    const publishWebSnapshot = () => {
      const snapshot = clone(webSnapshot)
      for (const listener of webListeners) {
        listener(snapshot)
      }
      return snapshot
    }

    window.__workspaceWebCaptureValidation = {
      getState: () => clone({
        resyncCount,
        snapshot: currentSnapshot,
        contents: currentContents,
        webSnapshot
      })
    }

    window.workbenchShell = {
      platform: 'win32',
      versions: { electron: 'test', chrome: 'test', node: 'test' },
      clipboard: { writeText() {}, readText() { return '' } },
      webPanels: {
        getState: async panelId => panelId === webSnapshot.panelId ? clone(webSnapshot) : null,
        show: async panelId => panelId === webSnapshot.panelId ? publishWebSnapshot() : null,
        hide: async () => null,
        updateBounds: async () => null,
        navigate: async panelId => panelId === webSnapshot.panelId ? publishWebSnapshot() : null,
        updateConfig: async panelId => panelId === webSnapshot.panelId ? publishWebSnapshot() : null,
        onStateChanged(listener) {
          webListeners.add(listener)
          return () => {
            webListeners.delete(listener)
          }
        }
      },
      terminals: {
        attach: async () => null,
        getState: async () => ({ isRunning: false, status: 'idle' }),
        start: async () => ({ isRunning: true, status: 'running' }),
        restart: async () => null,
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
          return artifact ? { artifact: clone(artifact), content: currentContents[artifactId] ?? '' } : null
        },
        deleteScope: async () => clone(currentSnapshot),
        createThread: async () => clone(currentSnapshot),
        selectThread: async threadId => {
          const nextThread = currentSnapshot.threads.find(thread => thread.threadId === threadId) ?? null
          currentSnapshot = {
            ...currentSnapshot,
            activeThreadId: nextThread?.threadId ?? null,
            activeThreadTitle: nextThread?.title ?? null
          }
          publishWorkspaceSnapshot()
          return clone(currentSnapshot)
        },
        renameThread: async () => clone(currentSnapshot),
        reassignScopeThread: async () => clone(currentSnapshot),
        resync: async () => {
          resyncCount += 1
          currentSnapshot = clone(injected.afterSnapshot)
          currentContents = clone(injected.afterContents)
          webSnapshot = clone(injected.webAfterSnapshot)
          publishWorkspaceSnapshot()
          publishWebSnapshot()
          return clone(currentSnapshot)
        },
        chooseRoot: async () => clone(currentSnapshot),
        openProfile: async () => ({
          settings: {
            language: 'zh-CN',
            theme: 'light',
            workspaceRoot: currentSnapshot.workspaceRoot,
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
          workspaceRoot: currentSnapshot.workspaceRoot,
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
          workspaceRoot: currentSnapshot.workspaceRoot,
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

  const beforeSnapshot = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'workspace-snapshot.before.json'), 'utf8'))
  const afterSnapshot = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'workspace-snapshot.after.json'), 'utf8'))
  const beforeContents = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'artifact-contents.before.json'), 'utf8'))
  const afterContents = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'artifact-contents.after.json'), 'utf8'))
  afterSnapshot.threads.push({
    threadId: 'thread-side-research',
    title: 'Side Research',
    derived: false,
    scopeIds: [],
    artifactIds: [],
    scopeCount: 0,
    artifactCount: 0,
    latestArtifactId: null,
    latestUpdatedAt: null,
    originHints: [],
    searchTerms: ['thread-side-research', 'side research'],
    summary: ''
  })
  const payload = {
    beforeSnapshot,
    afterSnapshot,
    beforeContents,
    afterContents,
    webBeforeSnapshot: {
      panelId: 'deepseek-web',
      title: 'DeepSeek Web',
      homeUrl: 'https://chat.deepseek.com/',
      currentUrl: 'https://chat.deepseek.com/',
      partition: 'persist:deepseek-web',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      enabled: true,
      lastError: null,
      contextLabel: null,
      sessionScopeId: null,
      threadId: null,
      threadTitle: null
    },
    webAfterSnapshot: {
      panelId: 'deepseek-web',
      title: 'Workspace sync regression chat',
      homeUrl: 'https://chat.deepseek.com/',
      currentUrl: 'https://chat.deepseek.com/a/chat/s/sync-regression-chat',
      partition: 'persist:deepseek-web',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      enabled: true,
      lastError: null,
      contextLabel: 'sync-regression-chat',
      sessionScopeId: 'deepseek-web__sync-regression-chat',
      threadId: 'thread-workspace-sync',
      threadTitle: 'Workspace Sync Thread'
    }
  }
  const assertTemplate = readFileSync(join(__dirname, 'assert-workspace-web-capture.js'), 'utf8')

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
