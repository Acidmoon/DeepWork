import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'custom-web-panels'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
const artifactsDir = join(__dirname, 'artifacts')
const screenshotPath = join(artifactsDir, 'custom-web-panels.png')
const rendererUrl = process.env.AI_WORKBENCH_VALIDATION_RENDERER_URL || 'http://localhost:5173'

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
  if (rendererUrl.startsWith('file://')) {
    return
  }

  try {
    const response = await fetch(rendererUrl)
    if (!response.ok) {
      throw new Error(`Renderer responded with ${response.status}`)
    }
  } catch {
    throw new Error(
      `Renderer dev server is not reachable at ${rendererUrl}. Start it first with: npm run dev -w @ai-workbench/desktop`
    )
  }
}

function buildBootstrapScript() {
  return `async page => {
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.addInitScript(() => {
    const clone = value => JSON.parse(JSON.stringify(value))
    const disabledError = 'Disabled until enabled'
    const builtInIds = new Set(['deepseek-web', 'minimax-web'])
    const webListeners = new Set()
    const promptQueue = []

    let settings = {
      language: 'en-US',
      theme: 'light',
      workspaceRoot: null,
      terminalPreludeCommands: ['proxy_on'],
      webPanels: {},
      customWebPanels: [],
      customTerminalPanels: []
    }

    const snapshots = {
      'deepseek-web': {
        panelId: 'deepseek-web',
        title: 'DeepSeek Web',
        homeUrl: 'https://chat.deepseek.com/',
        currentUrl: 'https://chat.deepseek.com/',
        partition: 'persist:deepseek-web',
        canGoBack: false,
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
        enabled: false,
        lastError: disabledError
      }
    }

    const syncCustomSnapshots = () => {
      const nextCustomIds = new Set(settings.customWebPanels.map(panel => panel.id))
      for (const panelId of Object.keys(snapshots)) {
        if (!builtInIds.has(panelId) && !nextCustomIds.has(panelId)) {
          delete snapshots[panelId]
        }
      }

      for (const panel of settings.customWebPanels) {
        const previous = snapshots[panel.id]
        snapshots[panel.id] = {
          panelId: panel.id,
          title: panel.title,
          homeUrl: panel.homeUrl,
          currentUrl: panel.enabled ? previous?.currentUrl ?? panel.homeUrl : panel.homeUrl,
          partition: panel.partition,
          canGoBack: false,
          canGoForward: false,
          isLoading: false,
          enabled: panel.enabled,
          lastError: panel.enabled ? null : disabledError
        }
      }
    }

    const publishWebSnapshot = panelId => {
      const snapshot = clone(snapshots[panelId] ?? null)
      if (snapshot) {
        for (const listener of webListeners) {
          listener(snapshot)
        }
      }
      return snapshot
    }

    syncCustomSnapshots()

    window.__customWebValidation = {
      enqueuePrompts: (...responses) => {
        promptQueue.push(...responses)
      },
      getState: () => clone({ settings, snapshots })
    }

    window.prompt = (_message, defaultValue = '') => {
      if (promptQueue.length > 0) {
        return promptQueue.shift()
      }

      return defaultValue
    }

    window.workbenchShell = {
      versions: { electron: 'test', chrome: 'test', node: 'test' },
      clipboard: { writeText() {}, readText() { return '' } },
      webPanels: {
        getState: async panelId => clone(snapshots[panelId] ?? null),
        show: async panelId => publishWebSnapshot(panelId),
        hide: async () => null,
        updateBounds: async () => null,
        navigate: async (panelId, action, url) => {
          const snapshot = snapshots[panelId]
          if (!snapshot) {
            return null
          }

          if (!snapshot.enabled) {
            return clone(snapshot)
          }

          if (action === 'home') {
            snapshot.currentUrl = snapshot.homeUrl
            snapshot.lastError = null
            return publishWebSnapshot(panelId)
          }

          if (action === 'load-url') {
            if (!url || !/^https?:\\/\\//i.test(url)) {
              snapshot.lastError = 'Blocked unsafe URL'
              return publishWebSnapshot(panelId)
            }

            snapshot.currentUrl = url
            snapshot.lastError = null
            return publishWebSnapshot(panelId)
          }

          return publishWebSnapshot(panelId)
        },
        updateConfig: async (panelId, update) => {
          const customIndex = settings.customWebPanels.findIndex(panel => panel.id === panelId)
          if (customIndex >= 0) {
            settings = {
              ...settings,
              customWebPanels: settings.customWebPanels.map((panel, index) =>
                index === customIndex ? { ...panel, ...update } : panel
              )
            }
            syncCustomSnapshots()
            return publishWebSnapshot(panelId)
          }

          settings = {
            ...settings,
            webPanels: {
              ...settings.webPanels,
              [panelId]: {
                ...(settings.webPanels[panelId] ?? {}),
                ...update
              }
            }
          }

          const snapshot = snapshots[panelId]
          if (snapshot) {
            snapshots[panelId] = {
              ...snapshot,
              homeUrl: update.homeUrl ?? snapshot.homeUrl,
              currentUrl: update.enabled === false ? update.homeUrl ?? snapshot.homeUrl : update.homeUrl ?? snapshot.currentUrl,
              partition: update.partition ?? snapshot.partition,
              enabled: update.enabled ?? snapshot.enabled,
              lastError: update.enabled === false ? disabledError : null
            }
          }

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
        getState: async () => null,
        readArtifact: async () => null,
        deleteScope: async () => null,
        chooseRoot: async () => null,
        saveClipboard: async () => null,
        onStateChanged() { return () => {} }
      },
      settings: {
        getState: async () => clone(settings),
        update: async update => {
          settings = {
            ...settings,
            ...update,
            webPanels: update.webPanels ?? settings.webPanels,
            customWebPanels: update.customWebPanels ?? settings.customWebPanels,
            customTerminalPanels: update.customTerminalPanels ?? settings.customTerminalPanels,
            terminalPreludeCommands: update.terminalPreludeCommands ?? settings.terminalPreludeCommands
          }
          syncCustomSnapshots()
          return clone(settings)
        }
      }
    }
  })

  await page.goto('${rendererUrl}', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
}`
}

async function main() {
  await assertRendererAvailable()
  mkdirSync(artifactsDir, { recursive: true })

  const assertTemplate = readFileSync(join(__dirname, 'assert-custom-web-panels.js'), 'utf8')
  writeFileSync(generatedBootstrapPath, buildBootstrapScript(), 'utf8')
  writeFileSync(generatedAssertPath, assertTemplate.replace('__SCREENSHOT_PATH__', screenshotPath.replaceAll('\\\\', '\\\\\\\\')), 'utf8')

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
