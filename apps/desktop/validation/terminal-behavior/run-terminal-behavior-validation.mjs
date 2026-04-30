import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertValidationRendererAvailable, resolveValidationRendererEntrypoint } from '../renderer-entrypoint.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'terminal-behavior'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
let rendererEntrypoint = null
let rendererUrlLiteral = null

function getRendererEntrypoint() {
  if (!rendererEntrypoint) {
    rendererEntrypoint = resolveValidationRendererEntrypoint()
    rendererUrlLiteral = JSON.stringify(rendererEntrypoint.url)
  }

  return rendererEntrypoint
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

function buildBootstrapScript() {
  return `async page => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.addInitScript(() => {
    const clone = value => JSON.parse(JSON.stringify(value))
    const terminalListeners = new Set()
    const terminalOutputListeners = new Set()
    const terminalWrites = []
    const terminalActions = []
    let clipboardText = ''
    let settings = {
      language: 'en-US',
      theme: 'light',
      workspaceRoot: 'C:\\\\Workspace',
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

    const terminalSnapshot = () => ({
      panelId: 'codex-cli',
      title: 'Codex CLI',
      shell: 'powershell.exe',
      shellArgs: ['-NoLogo', '-ExecutionPolicy', 'Bypass'],
      cwd: settings.workspaceRoot,
      startupCommand: 'codex',
      status: 'running',
      hasSession: true,
      isRunning: true,
      launchCount: 1,
      pid: 4300,
      cols: 120,
      rows: 32,
      bufferSize: 96,
      logPath: 'C:\\\\validation\\\\terminal-behavior.log',
      lastExitCode: null,
      lastExitSignal: null,
      lastError: null,
      contextLabel: 'session-terminal-behavior',
      sessionScopeId: 'codex-cli__session-terminal-behavior',
      threadId: 'thread-terminal-behavior',
      threadTitle: 'Terminal Behavior'
    })

    const publishTerminalSnapshot = () => {
      const snapshot = clone(terminalSnapshot())
      for (const listener of terminalListeners) {
        listener(snapshot)
      }
      return snapshot
    }

    window.__terminalBehaviorValidation = {
      getState: () => clone({ settings, terminalWrites, terminalActions, clipboardText }),
      emitOutput: text => {
        for (const listener of terminalOutputListeners) {
          listener({ panelId: 'codex-cli', data: text })
        }
      },
      clipboardText: () => clipboardText
    }

    window.workbenchShell = {
      platform: 'win32',
      versions: { electron: 'test', chrome: 'test', node: 'test' },
      clipboard: {
        readText() {
          return clipboardText
        },
        writeText(text) {
          clipboardText = String(text)
        }
      },
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
          if (panelId !== 'codex-cli') {
            return null
          }

          return {
            snapshot: clone(terminalSnapshot()),
            buffer: 'Terminal behavior validation ready\\r\\nselect me\\r\\n'
          }
        },
        getState: async panelId => (panelId === 'codex-cli' ? clone(terminalSnapshot()) : null),
        start: async panelId => {
          terminalActions.push({ action: 'start', panelId })
          return publishTerminalSnapshot()
        },
        restart: async panelId => {
          terminalActions.push({ action: 'restart', panelId })
          return publishTerminalSnapshot()
        },
        write: async (panelId, data) => {
          terminalWrites.push({ panelId, data })
        },
        resize: async () => null,
        clear: async () => ({ snapshot: clone(terminalSnapshot()), buffer: '' }),
        onOutput(listener) {
          terminalOutputListeners.add(listener)
          return () => terminalOutputListeners.delete(listener)
        },
        onStateChanged(listener) {
          terminalListeners.add(listener)
          return () => terminalListeners.delete(listener)
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
        openProfile: async () => ({ settings: clone(settings), workspace: null, error: 'Workspace profile is unavailable.' }),
        saveClipboard: async () => null,
        onStateChanged() { return () => {} }
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
          publishTerminalSnapshot()
          return clone(settings)
        }
      }
    }
  })
  await page.goto(${rendererUrlLiteral}, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
}`
}

function buildAssertScript() {
  return `async page => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.waitForTimeout(300)

  const placeholderCount = await page.getByText('Terminal Behavior', { exact: true }).count()
  if (placeholderCount < 1) {
    throw new Error('Terminal behavior controls did not render in Settings.')
  }

  await page.getByLabel('Scrollback Lines').fill('2400')
  await page.getByLabel('Scrollback Lines').blur()
  await page.getByLabel('Copy On Selection').check()
  await page.getByLabel('Confirm Multi-line Paste').uncheck()
  await page.waitForTimeout(500)

  let state = await page.evaluate(() => window.__terminalBehaviorValidation.getState())
  if (
    state.settings.terminalBehavior.scrollbackLines !== 2400 ||
    state.settings.terminalBehavior.copyOnSelection !== true ||
    state.settings.terminalBehavior.confirmMultilinePaste !== false
  ) {
    throw new Error('Terminal behavior settings did not persist through the settings flow: ' + JSON.stringify(state.settings.terminalBehavior))
  }

  await page.getByRole('button', { name: 'Codex CLI', exact: true }).click()
  await page.waitForTimeout(500)
  const hostBehavior = await page.locator('.terminal-host').evaluate(element => ({
    scrollbackLines: element.getAttribute('data-scrollback-lines'),
    copyOnSelection: element.getAttribute('data-copy-on-selection'),
    confirmMultilinePaste: element.getAttribute('data-confirm-multiline-paste')
  }))
  if (
    hostBehavior.scrollbackLines !== '2400' ||
    hostBehavior.copyOnSelection !== 'true' ||
    hostBehavior.confirmMultilinePaste !== 'false'
  ) {
    throw new Error('Terminal host did not receive synchronized terminal behavior: ' + JSON.stringify(hostBehavior))
  }

  state = await page.evaluate(() => window.__terminalBehaviorValidation.getState())
  if (state.terminalActions.length !== 0) {
    throw new Error('Changing terminal behavior unexpectedly started or restarted a PTY: ' + JSON.stringify(state.terminalActions))
  }

  await page.evaluate(() => window.__terminalBehaviorValidation.emitOutput('selectable validation text\\\\r\\\\n'))
  await page.waitForTimeout(200)
  await page.locator('.xterm-screen').dblclick()
  await page.waitForTimeout(400)
  state = await page.evaluate(() => window.__terminalBehaviorValidation.getState())
  if (!state.clipboardText.includes('Terminal behavior validation ready')) {
    throw new Error('Copy-on-selection did not write terminal selection to clipboard: ' + JSON.stringify(state.clipboardText))
  }

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByLabel('Confirm Multi-line Paste').check()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Codex CLI', exact: true }).click()
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    window.confirm = () => false
  })
  await page.locator('.terminal-host').click()
  await page.evaluate(() => {
    window.workbenchShell.clipboard.writeText('first line\\\\nsecond line')
  })
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V')
  await page.waitForTimeout(400)
  state = await page.evaluate(() => window.__terminalBehaviorValidation.getState())
  if (state.terminalWrites.some(entry => entry.data.includes('second line'))) {
    throw new Error('Canceled multi-line paste was still written to the PTY: ' + JSON.stringify(state.terminalWrites))
  }

  console.log(JSON.stringify({
    terminalBehavior: state.settings.terminalBehavior,
    terminalActions: state.terminalActions.length,
    terminalWrites: state.terminalWrites.length,
    clipboardText: state.clipboardText.slice(0, 32)
  }))
}`
}

async function main() {
  await assertValidationRendererAvailable(getRendererEntrypoint())
  mkdirSync(__dirname, { recursive: true })
  writeFileSync(generatedBootstrapPath, buildBootstrapScript(), 'utf8')
  writeFileSync(generatedAssertPath, buildAssertScript(), 'utf8')

  try {
    runCli(['open', '--browser', 'msedge', 'about:blank'])
    runCli(['run-code', '--filename', 'bootstrap.generated.js'])
    runCli(['run-code', '--filename', 'assert.generated.js'])
  } finally {
    rmSync(generatedBootstrapPath, { force: true })
    rmSync(generatedAssertPath, { force: true })
  }

  console.log('Terminal behavior validation passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
