async page => {
  const screenshotPath = '__SCREENSHOT_PATH__'

  await page.evaluate(() => {
    window.__customWebValidation.enqueuePrompts('https://news.ycombinator.com/')
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

  await page.getByRole('button', { name: 'Show Details' }).click()
  await page.getByLabel('Home URL').fill('docs.example.com')
  await page.getByLabel('Partition').fill('temp:docs-portal')
  await page.getByRole('button', { name: 'Save Config' }).click()
  await page.waitForTimeout(400)

  const savedState = await page.evaluate(() => window.__customWebValidation.getState())
  const savedPanel = savedState.settings.customWebPanels[0]
  if (savedPanel.homeUrl !== 'https://docs.example.com' || savedPanel.partition !== 'temp:docs-portal' || savedPanel.enabled !== true) {
    throw new Error(`Config save did not persist the expected values: ${JSON.stringify(savedPanel)}`)
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

  await page.evaluate(() => {
    window.__customWebValidation.enqueuePrompts('Docs Portal')
  })
  await page.getByRole('button', { name: 'news.ycombinator.com' }).click({ button: 'right' })
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.waitForTimeout(400)

  const renamedVisible = await page.getByRole('button', { name: 'Docs Portal' }).count()
  const renamedState = await page.evaluate(() => window.__customWebValidation.getState())
  const renamedPanel = renamedState.settings.customWebPanels[0]
  if (renamedVisible !== 1 || !renamedPanel || renamedPanel.title !== 'Docs Portal') {
    throw new Error(`Rename did not propagate through navigation and settings: visible=${renamedVisible}, state=${JSON.stringify(renamedPanel)}`)
  }

  await page.getByRole('button', { name: 'Docs Portal' }).click({ button: 'right' })
  await page.waitForTimeout(200)
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
      savedHomeUrl: savedPanel.homeUrl,
      savedPartition: savedPanel.partition,
      renamedTitle: renamedPanel.title,
      deletedCount,
      finalCustomWebPanels: finalState.settings.customWebPanels.length
    })
  )
}
