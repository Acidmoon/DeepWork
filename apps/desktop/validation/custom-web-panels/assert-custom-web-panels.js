async page => {
  const screenshotPath = '__SCREENSHOT_PATH__'

  const minimaxVisible = await page.getByRole('button', { name: 'MiniMax Web', exact: true }).count()
  if (minimaxVisible !== 1) {
    throw new Error(`Expected MiniMax built-in web panel to be visible in navigation, count=${minimaxVisible}`)
  }

  await page.getByRole('button', { name: 'MiniMax Web', exact: true }).click()
  await page.waitForTimeout(400)

  const initialMinimaxState = await page.evaluate(() => window.__customWebValidation.getState())
  const initialMinimax = initialMinimaxState.snapshots['minimax-web']
  if (!initialMinimax || initialMinimax.enabled !== true || initialMinimax.lastError !== null) {
    throw new Error(`MiniMax did not start as an enabled managed panel: ${JSON.stringify(initialMinimax)}`)
  }

  await page.getByLabel('Address').fill('https://agent.minimaxi.com/')
  await page.getByRole('button', { name: 'Go' }).click()
  await page.waitForTimeout(400)

  const browsedMinimaxState = await page.evaluate(() => window.__customWebValidation.getState())
  const browsedMinimax = browsedMinimaxState.snapshots['minimax-web']
  if (
    !browsedMinimax ||
    browsedMinimax.currentUrl !== 'https://agent.minimaxi.com/' ||
    browsedMinimaxState.settings.webPanels['minimax-web']?.homeUrl
  ) {
    throw new Error(`MiniMax runtime navigation did not stay separate from saved home URL: ${JSON.stringify({ browsedMinimax, settings: browsedMinimaxState.settings.webPanels['minimax-web'] })}`)
  }

  await page.getByRole('button', { name: 'Show Details' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Disable Panel' }).click()
  await page.waitForTimeout(400)

  const disabledMinimaxState = await page.evaluate(() => window.__customWebValidation.getState())
  const disabledMinimax = disabledMinimaxState.snapshots['minimax-web']
  const disabledMinimaxOverride = disabledMinimaxState.settings.webPanels['minimax-web']
  const minimaxEnableVisible = await page.getByRole('button', { name: 'Enable Panel' }).count()
  const minimaxDisabledHeadingVisible = await page.getByText('Disabled Web Panel').count()
  if (
    !disabledMinimax ||
    disabledMinimax.enabled !== false ||
    disabledMinimaxOverride?.enabled !== false ||
    minimaxEnableVisible < 1 ||
    minimaxDisabledHeadingVisible < 1
  ) {
    throw new Error(`MiniMax disable did not produce reserved state: ${JSON.stringify({ disabledMinimax, disabledMinimaxOverride, minimaxEnableVisible, minimaxDisabledHeadingVisible })}`)
  }

  await page.getByRole('button', { name: 'Enable Panel' }).click()
  await page.waitForTimeout(400)

  const reenabledMinimaxState = await page.evaluate(() => window.__customWebValidation.getState())
  const reenabledMinimax = reenabledMinimaxState.snapshots['minimax-web']
  const reenabledMinimaxOverride = reenabledMinimaxState.settings.webPanels['minimax-web']
  if (!reenabledMinimax || reenabledMinimax.enabled !== true || reenabledMinimax.currentUrl !== 'https://chat.minimax.io/' || reenabledMinimaxOverride?.enabled !== true) {
    throw new Error(`MiniMax re-enable did not restore managed lifecycle from saved home: ${JSON.stringify({ reenabledMinimax, reenabledMinimaxOverride })}`)
  }

  await page.evaluate(() => {
    window.__customWebValidation.enqueuePrompts('javascript:alert(1)', 'https://news.ycombinator.com/')
  })
  await page.getByRole('button', { name: /Add Web/ }).click()
  await page.waitForTimeout(400)

  const initialState = await page.evaluate(() => window.__customWebValidation.getState())
  const customPanel = initialState.settings.customWebPanels[0]
  if (!customPanel) {
    throw new Error('Custom web panel was not persisted after Add Web.')
  }
  if (customPanel.homeUrl !== 'https://news.ycombinator.com/' || customPanel.partition !== `persist:${customPanel.id}` || customPanel.enabled !== true) {
    throw new Error(`Unexpected initial custom panel state: ${JSON.stringify(customPanel)}`)
  }

  const customPanelVisible = await page.getByRole('button', { name: 'news.ycombinator.com' }).count()
  if (customPanelVisible !== 1) {
    throw new Error(`Expected the new custom web panel to appear in navigation, count=${customPanelVisible}`)
  }

  await page.getByLabel('Address').fill('docs.example.com/guides')
  await page.getByRole('button', { name: 'Go' }).click()
  await page.waitForTimeout(400)

  const browsedState = await page.evaluate(() => window.__customWebValidation.getState())
  const browsedPanel = browsedState.snapshots[customPanel.id]
  if (!browsedPanel || browsedPanel.currentUrl !== 'https://docs.example.com/guides' || browsedState.settings.customWebPanels[0].homeUrl !== 'https://news.ycombinator.com/') {
    throw new Error(`Address-bar browsing did not preserve runtime/persisted URL separation: ${JSON.stringify({ browsedPanel, saved: browsedState.settings.customWebPanels[0] })}`)
  }

  await page.getByLabel('Address').fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Go' }).click()
  await page.waitForTimeout(250)

  const rejectedBrowseState = await page.evaluate(() => window.__customWebValidation.getState())
  if (rejectedBrowseState.snapshots[customPanel.id]?.currentUrl !== 'https://docs.example.com/guides') {
    throw new Error(`Unsafe address input unexpectedly changed runtime navigation state: ${JSON.stringify(rejectedBrowseState.snapshots[customPanel.id])}`)
  }

  await page.getByRole('button', { name: 'Show Details' }).click()
  await page.getByLabel('Home URL').fill('docs.example.com')
  await page.getByLabel('Partition').fill('temp:docs-portal')
  await page.getByRole('button', { name: 'Save Config' }).click()
  await page.waitForTimeout(400)

  const savedState = await page.evaluate(() => window.__customWebValidation.getState())
  const savedPanel = savedState.settings.customWebPanels[0]
  const savedSnapshot = savedState.snapshots[customPanel.id]
  if (savedPanel.homeUrl !== 'https://docs.example.com/' || savedPanel.partition !== 'temp:docs-portal' || savedPanel.enabled !== true) {
    throw new Error(`Config save did not persist the expected values: ${JSON.stringify(savedPanel)}`)
  }
  if (!savedSnapshot || savedSnapshot.currentUrl !== 'https://docs.example.com/guides') {
    throw new Error(`Saving the home URL unexpectedly reset the live browsing address: ${JSON.stringify(savedSnapshot)}`)
  }

  const ephemeralVisible = await page.getByText('Ephemeral Session').count()
  if (ephemeralVisible < 1) {
    throw new Error('Session mode did not switch to ephemeral after saving a non-persist partition.')
  }

  await page.getByRole('button', { name: 'Disable Panel' }).click()
  await page.waitForTimeout(400)

  const disabledState = await page.evaluate(() => window.__customWebValidation.getState())
  const disabledPanel = disabledState.settings.customWebPanels[0]
  if (!disabledPanel || disabledPanel.enabled !== false) {
    throw new Error(`Custom web panel did not persist the disabled state: ${JSON.stringify(disabledPanel)}`)
  }

  const enableButtonVisible = await page.getByRole('button', { name: 'Enable Panel' }).count()
  const disabledHeadingVisible = await page.getByText('Disabled Web Panel').count()
  if (enableButtonVisible < 1 || disabledHeadingVisible < 1) {
    throw new Error(`Disabled custom web panel UI did not render as expected: enable=${enableButtonVisible}, heading=${disabledHeadingVisible}`)
  }

  await page.getByRole('button', { name: 'Enable Panel' }).click()
  await page.waitForTimeout(400)

  const reenabledState = await page.evaluate(() => window.__customWebValidation.getState())
  const reenabledPanel = reenabledState.settings.customWebPanels[0]
  if (!reenabledPanel || reenabledPanel.enabled !== true) {
    throw new Error(`Custom web panel did not re-enable correctly: ${JSON.stringify(reenabledPanel)}`)
  }
  if (reenabledState.snapshots[customPanel.id]?.currentUrl !== 'https://docs.example.com/') {
    throw new Error(`Re-enabled custom web panel did not restart from the saved home URL: ${JSON.stringify(reenabledState.snapshots[customPanel.id])}`)
  }

  await page.getByLabel('Panel Name').fill('Docs Portal')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(400)

  const renamedVisible = await page.getByRole('button', { name: 'Docs Portal' }).count()
  const renamedState = await page.evaluate(() => window.__customWebValidation.getState())
  const renamedPanel = renamedState.settings.customWebPanels[0]
  if (renamedVisible !== 1 || !renamedPanel || renamedPanel.title !== 'Docs Portal') {
    throw new Error(`Rename did not propagate through navigation and settings: visible=${renamedVisible}, state=${JSON.stringify(renamedPanel)}`)
  }

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.waitForTimeout(400)

  const deletedCount = await page.getByRole('button', { name: 'Docs Portal' }).count()
  const finalState = await page.evaluate(() => window.__customWebValidation.getState())
  if (deletedCount !== 0 || finalState.settings.customWebPanels.length !== 0) {
    throw new Error(`Delete did not remove the custom panel cleanly: visible=${deletedCount}, state=${JSON.stringify(finalState.settings.customWebPanels)}`)
  }

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(
    JSON.stringify({
      createdPanelId: customPanel.id,
      browsedCurrentUrl: browsedPanel.currentUrl,
      savedHomeUrl: savedPanel.homeUrl,
      savedPartition: savedPanel.partition,
      renamedTitle: renamedPanel.title,
      deletedCount,
      finalCustomWebPanels: finalState.settings.customWebPanels.length
    })
  )
}
