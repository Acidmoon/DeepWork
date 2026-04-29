import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'terminal-panel-configuration'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
const artifactsDir = join(__dirname, 'artifacts')
const screenshotPath = join(artifactsDir, 'terminal-panel-configuration.png')
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
    const terminalListeners = new Set()
    const outputListeners = new Set()
    const terminalBuffers = {
      'codex-cli': 'Codex session attached\\r\\n',
      'claude-code': '',
      'custom-cli-alpha': 'Custom CLI attached\\r\\n'
    }
    const builtInConfigs = {
      'codex-cli': {
        title: 'Codex CLI',
        shell: 'powershell.exe',
        shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
        startupCommand: 'codex'
      },
      'claude-code': {
        title: 'Claude Code',
        shell: 'powershell.exe',
        shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
        startupCommand: 'claude'
      }
    }

    let nextPid = 6200
    let settings = {
      language: 'en-US',
      theme: 'light',
      workspaceRoot: 'C:\\\\Workspace',
      terminalPreludeCommands: ['proxy_on'],
      threadContinuationPreference: 'continue-active-thread',
      cliRetrievalPreference: 'thread-first',
      webPanels: {},
      builtInTerminalPanels: {},
      customWebPanels: [],
      customTerminalPanels: [
        {
          id: 'custom-cli-alpha',
          title: 'Custom CLI 1',
          sectionId: 'agents',
          shell: 'pwsh.exe',
          shellArgs: ['-NoLogo', '-NoExit'],
          cwd: 'D:\\\\tools\\\\agent',
          startupCommand: 'python worker.py'
        }
      ]
    }

    const createSnapshot = ({
      panelId,
      title,
      shell,
      shellArgs,
      cwd,
      startupCommand,
      status,
      hasSession,
      isRunning,
      launchCount,
      pid,
      bufferSize = 128
    }) => ({
      panelId,
      title,
      shell,
      shellArgs,
      cwd,
      startupCommand,
      status,
      hasSession,
      isRunning,
      launchCount,
      pid,
      cols: 120,
      rows: 32,
      bufferSize,
      logPath: 'C:\\\\validation\\\\terminal.log',
      lastExitCode: null,
      lastExitSignal: null,
      lastError: null
    })

    const resolveBuiltInConfig = panelId => {
      const base = builtInConfigs[panelId]
      const override = settings.builtInTerminalPanels[panelId] ?? {}

      return {
        panelId,
        title: base.title,
        shell: base.shell,
        shellArgs: [...base.shellArgs],
        cwd: override.cwd ?? settings.workspaceRoot,
        startupCommand: override.startupCommand ?? base.startupCommand
      }
    }

    const resolveCustomConfig = panelId => {
      const panel = settings.customTerminalPanels.find(item => item.id === panelId)
      if (!panel) {
        return null
      }

      return {
        panelId,
        title: panel.title,
        shell: panel.shell,
        shellArgs: [...panel.shellArgs],
        cwd: panel.cwd ?? settings.workspaceRoot,
        startupCommand: panel.startupCommand
      }
    }

    let snapshots = {
      'codex-cli': createSnapshot({
        ...resolveBuiltInConfig('codex-cli'),
        status: 'running',
        hasSession: true,
        isRunning: true,
        launchCount: 1,
        pid: 4101
      }),
      'claude-code': createSnapshot({
        ...resolveBuiltInConfig('claude-code'),
        status: 'idle',
        hasSession: false,
        isRunning: false,
        launchCount: 0,
        pid: null,
        bufferSize: 0
      }),
      'custom-cli-alpha': createSnapshot({
        ...resolveCustomConfig('custom-cli-alpha'),
        status: 'running',
        hasSession: true,
        isRunning: true,
        launchCount: 2,
        pid: 5101
      })
    }

    const syncCustomSnapshots = () => {
      const nextCustomIds = new Set(settings.customTerminalPanels.map(panel => panel.id))
      for (const panelId of Object.keys(snapshots)) {
        if (!builtInConfigs[panelId] && !nextCustomIds.has(panelId)) {
          delete snapshots[panelId]
          delete terminalBuffers[panelId]
        }
      }

      for (const panel of settings.customTerminalPanels) {
        const previous = snapshots[panel.id]
        const resolved = resolveCustomConfig(panel.id)
        if (!resolved) {
          continue
        }

        snapshots[panel.id] = previous
          ? {
              ...previous,
              title: resolved.title,
              shell: resolved.shell,
              shellArgs: resolved.shellArgs,
              cwd: resolved.cwd,
              startupCommand: resolved.startupCommand
            }
          : createSnapshot({
              ...resolved,
              status: 'idle',
              hasSession: false,
              isRunning: false,
              launchCount: 0,
              pid: null,
              bufferSize: 0
            })

        terminalBuffers[panel.id] = terminalBuffers[panel.id] ?? ''
      }
    }

    const publishTerminalSnapshot = panelId => {
      const snapshot = clone(snapshots[panelId] ?? null)
      if (snapshot) {
        for (const listener of terminalListeners) {
          listener(snapshot)
        }
      }

      return snapshot
    }

    const refreshBuiltInSnapshots = () => {
      for (const panelId of Object.keys(builtInConfigs)) {
        const resolved = resolveBuiltInConfig(panelId)
        const previous = snapshots[panelId]
        if (!previous) {
          continue
        }

        snapshots[panelId] = {
          ...previous,
          title: resolved.title,
          shell: resolved.shell,
          shellArgs: resolved.shellArgs,
          cwd: resolved.cwd,
          startupCommand: resolved.startupCommand
        }
      }
    }

    const relaunchSnapshot = panelId => {
      const previous = snapshots[panelId]
      if (!previous) {
        return null
      }

      const resolved = builtInConfigs[panelId] ? resolveBuiltInConfig(panelId) : resolveCustomConfig(panelId)
      if (!resolved) {
        return null
      }

      nextPid += 1
      snapshots[panelId] = {
        ...previous,
        title: resolved.title,
        shell: resolved.shell,
        shellArgs: resolved.shellArgs,
        cwd: resolved.cwd,
        startupCommand: resolved.startupCommand,
        status: 'running',
        hasSession: true,
        isRunning: true,
        launchCount: previous.launchCount + 1,
        pid: nextPid,
        lastExitCode: null,
        lastExitSignal: null,
        lastError: null
      }

      return publishTerminalSnapshot(panelId)
    }

    window.__terminalConfigValidation = {
      getState: () => clone({ settings, snapshots })
    }

    window.workbenchShell = {
      platform: 'win32',
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
        attach: async panelId => {
          const snapshot = clone(snapshots[panelId] ?? null)
          if (!snapshot) {
            return null
          }

          return {
            snapshot,
            buffer: terminalBuffers[panelId] ?? ''
          }
        },
        getState: async panelId => clone(snapshots[panelId] ?? null),
        start: async panelId => relaunchSnapshot(panelId),
        restart: async panelId => relaunchSnapshot(panelId),
        write: async () => null,
        resize: async (panelId, size) => {
          const snapshot = snapshots[panelId]
          if (!snapshot) {
            return null
          }

          snapshots[panelId] = {
            ...snapshot,
            cols: size.cols,
            rows: size.rows
          }

          return null
        },
        clear: async panelId => {
          const snapshot = snapshots[panelId]
          if (!snapshot) {
            return null
          }

          terminalBuffers[panelId] = ''
          snapshots[panelId] = {
            ...snapshot,
            bufferSize: 0
          }

          return {
            snapshot: clone(snapshots[panelId]),
            buffer: ''
          }
        },
        onOutput(listener) {
          outputListeners.add(listener)
          return () => {
            outputListeners.delete(listener)
          }
        },
        onStateChanged(listener) {
          terminalListeners.add(listener)
          return () => {
            terminalListeners.delete(listener)
          }
        }
      },
      workspace: {
        getState: async () => null,
        readArtifact: async () => null,
        deleteScope: async () => null,
        createThread: async () => null,
        selectThread: async () => null,
        renameThread: async () => null,
        reassignScopeThread: async () => null,
        resync: async () => null,
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
            builtInTerminalPanels: update.builtInTerminalPanels ?? settings.builtInTerminalPanels,
            customWebPanels: update.customWebPanels ?? settings.customWebPanels,
            customTerminalPanels: update.customTerminalPanels ?? settings.customTerminalPanels,
            terminalPreludeCommands: update.terminalPreludeCommands ?? settings.terminalPreludeCommands,
            threadContinuationPreference:
              update.threadContinuationPreference ?? settings.threadContinuationPreference,
            cliRetrievalPreference: update.cliRetrievalPreference ?? settings.cliRetrievalPreference
          }

          syncCustomSnapshots()
          refreshBuiltInSnapshots()

          for (const panelId of Object.keys(builtInConfigs)) {
            publishTerminalSnapshot(panelId)
          }
          for (const panel of settings.customTerminalPanels) {
            publishTerminalSnapshot(panel.id)
          }

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

  const assertTemplate = readFileSync(join(__dirname, 'assert-terminal-panel-configuration.js'), 'utf8')
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
