async page => {
  const screenshotPath = '__SCREENSHOT_PATH__'

  await page.getByRole('button', { name: 'A Artifacts Open Artifacts' }).click()
  await page.waitForTimeout(300)

  const initialState = await page.evaluate(() => window.__workspaceWebCaptureValidation.getState())
  if (initialState.resyncCount !== 0 || initialState.snapshot.artifactCount !== 0) {
    throw new Error(`Expected an empty workspace before sync, received resyncCount=${initialState.resyncCount}, artifactCount=${initialState.snapshot.artifactCount}`)
  }

  await page.getByRole('button', { name: '同步' }).click()
  await page.waitForFunction(() => {
    const state = window.__workspaceWebCaptureValidation.getState()
    return state.resyncCount === 1 && state.snapshot.artifactCount === 2
  })
  await page.waitForTimeout(400)

  const syncedState = await page.evaluate(() => window.__workspaceWebCaptureValidation.getState())
  const sessionButton = page.getByRole('button', { name: /Workspace sync regression chat/ })
  const sessionVisible = await sessionButton.count()
  const resultsVisible = await page.getByText('1 搜索结果').count()

  if (syncedState.snapshot.contextEntries.length !== 1 || sessionVisible !== 1 || resultsVisible < 1) {
    throw new Error(
      `Workspace resync did not expose the captured web context. contexts=${syncedState.snapshot.contextEntries.length}, sessionVisible=${sessionVisible}, resultsVisible=${resultsVisible}`
    )
  }

  await sessionButton.click()
  await page.waitForTimeout(300)

  const userMessageVisible = await page.getByText('Summarize the latest workspace sync fix.').count()
  const assistantMessageVisible = await page.getByText('workspace:resync and persists the refreshed web context').count()
  if (userMessageVisible < 1 || assistantMessageVisible < 1) {
    throw new Error(`Structured message preview did not render. user=${userMessageVisible}, assistant=${assistantMessageVisible}`)
  }

  const searchBox = page.getByRole('textbox', { name: '搜索查询' })
  await searchBox.fill('workspace sync regression')
  await page.waitForTimeout(300)
  const searchedSessionVisible = await page.getByRole('button', { name: /Workspace sync regression chat/ }).count()
  if (searchedSessionVisible !== 1) {
    throw new Error(`Metadata search did not keep the synced web session discoverable. searchedSessionVisible=${searchedSessionVisible}`)
  }

  await page.getByRole('button', { name: '预览' }).nth(1).click()
  await page.waitForTimeout(400)
  const transcriptPreviewVisible = await page.getByText('Workspace Sync now triggers workspace:resync and persists the refreshed web context.').count()
  if (transcriptPreviewVisible < 1) {
    throw new Error(`Transcript preview did not render after selecting the persisted artifact. count=${transcriptPreviewVisible}`)
  }

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(
    JSON.stringify({
      resyncCount: syncedState.resyncCount,
      artifactCount: syncedState.snapshot.artifactCount,
      contextCount: syncedState.snapshot.contextEntries.length,
      sessionVisible,
      userMessageVisible,
      assistantMessageVisible,
      searchedSessionVisible,
      transcriptPreviewVisible
    })
  )
}
