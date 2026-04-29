async page => {
  const screenshotPath = '__SCREENSHOT_PATH__'

  await page.getByRole('button', { name: 'Codex CLI' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Show Details' }).click()
  await page.getByLabel('Working Directory').fill('D:\\agent-work')
  await page.getByLabel('Startup Command').fill('codex --model gpt-5.5')
  await page.getByRole('button', { name: 'Save Config' }).click()
  await page.waitForTimeout(400)

  const afterBuiltInSave = await page.evaluate(() => window.__terminalConfigValidation.getState())
  const builtInOverride = afterBuiltInSave.settings.builtInTerminalPanels['codex-cli']
  const builtInSnapshot = afterBuiltInSave.snapshots['codex-cli']
  if (!builtInOverride || builtInOverride.cwd !== 'D:\\agent-work' || builtInOverride.startupCommand !== 'codex --model gpt-5.5') {
    throw new Error(`Built-in terminal override did not persist correctly: ${JSON.stringify(builtInOverride)}`)
  }
  if (!builtInSnapshot || builtInSnapshot.launchCount !== 1 || builtInSnapshot.pid !== 4101 || builtInSnapshot.status !== 'running') {
    throw new Error(`Built-in save unexpectedly disturbed the running PTY session: ${JSON.stringify(builtInSnapshot)}`)
  }

  const restartToApplyVisible = await page.getByText('Restart To Apply').count()
  if (restartToApplyVisible < 1) {
    throw new Error('Built-in terminal UI did not surface the restart-to-apply state after saving.')
  }

  await page.getByRole('button', { name: 'Restart To Apply' }).click()
  await page.waitForTimeout(400)

  const afterBuiltInRestart = await page.evaluate(() => window.__terminalConfigValidation.getState())
  const restartedBuiltIn = afterBuiltInRestart.snapshots['codex-cli']
  if (!restartedBuiltIn || restartedBuiltIn.launchCount !== 2 || restartedBuiltIn.pid !== 6201 || restartedBuiltIn.startupCommand !== 'codex --model gpt-5.5') {
    throw new Error(`Built-in restart did not relaunch with the updated config: ${JSON.stringify(restartedBuiltIn)}`)
  }

  await page.getByRole('button', { name: 'Custom CLI 1' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Show Details' }).click()
  await page.getByLabel('Shell').fill('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')
  await page.getByLabel('Shell Arguments').fill('-NoLogo\n-ExecutionPolicy\nBypass')
  await page.getByLabel('Working Directory').fill('E:\\jobs\\agent')
  await page.getByLabel('Startup Command').fill('npm run agent')
  await page.getByRole('button', { name: 'Save Config' }).click()
  await page.waitForTimeout(400)

  const afterCustomSave = await page.evaluate(() => window.__terminalConfigValidation.getState())
  const customSettings = afterCustomSave.settings.customTerminalPanels.find(panel => panel.id === 'custom-cli-alpha')
  const customSnapshot = afterCustomSave.snapshots['custom-cli-alpha']
  if (
    !customSettings ||
    customSettings.shell !== 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' ||
    customSettings.cwd !== 'E:\\jobs\\agent' ||
    customSettings.startupCommand !== 'npm run agent' ||
    JSON.stringify(customSettings.shellArgs) !== JSON.stringify(['-NoLogo', '-ExecutionPolicy', 'Bypass'])
  ) {
    throw new Error(`Custom terminal config did not persist correctly: ${JSON.stringify(customSettings)}`)
  }
  if (!customSnapshot || customSnapshot.launchCount !== 2 || customSnapshot.pid !== 5101 || customSnapshot.shell !== customSettings.shell) {
    throw new Error(`Custom terminal save unexpectedly restarted the running session: ${JSON.stringify(customSnapshot)}`)
  }

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(
    JSON.stringify({
      builtInOverride,
      builtInRestartLaunchCount: restartedBuiltIn.launchCount,
      customShell: customSettings.shell,
      customShellArgs: customSettings.shellArgs,
      customWorkingDirectory: customSettings.cwd,
      customStartupCommand: customSettings.startupCommand
    })
  )
}
