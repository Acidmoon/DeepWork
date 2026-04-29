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

  if (
    syncedState.snapshot.contextEntries.length !== 1 ||
    syncedState.snapshot.threads.length !== 1 ||
    syncedState.snapshot.activeThreadTitle !== 'Workspace Sync Thread' ||
    sessionVisible !== 1 ||
    resultsVisible < 1
  ) {
    throw new Error(
      `Workspace resync did not expose the captured web context and thread state. contexts=${syncedState.snapshot.contextEntries.length}, threads=${syncedState.snapshot.threads.length}, activeThread=${syncedState.snapshot.activeThreadTitle}, sessionVisible=${sessionVisible}, resultsVisible=${resultsVisible}`
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

  await page.locator('.nav-item__button').filter({ hasText: 'DeepSeek Web' }).click()
  await page.waitForTimeout(400)

  const linkedContinuityVisible = await page.getByText('已链接上下文').count()
  const inspectWorkspaceVisible = await page.getByRole('button', { name: '检查 Workspace' }).count()
  if (linkedContinuityVisible !== 0 || inspectWorkspaceVisible !== 0) {
    throw new Error(
      `Managed web panel still exposed removed continuity UI. linked=${linkedContinuityVisible}, inspect=${inspectWorkspaceVisible}`
    )
  }

  const manageThreadsVisible = await page.getByRole('button', { name: '在 Workspace 中管理线程' }).count()
  if (manageThreadsVisible !== 0) {
    throw new Error(
      `Managed web toolbar exposed unexpected thread mutation controls: ${JSON.stringify({
        manageThreadsVisible
      })}`
    )
  }

  await page.locator('.nav-item__button').filter({ hasText: 'Artifacts' }).click()
  await page.waitForTimeout(400)
  await page.locator('summary').filter({ hasText: '线程与修复' }).click()
  await page.waitForTimeout(250)
  await page.locator('.artifact-row--thread').filter({ hasText: 'Side Research' }).getByRole('button', { name: '继续' }).click()
  await page.waitForFunction(() => window.__workspaceWebCaptureValidation.getState().snapshot.activeThreadTitle === 'Side Research')
  await page.waitForTimeout(250)
  await page.locator('.nav-item__button').filter({ hasText: 'DeepSeek Web' }).click()
  await page.waitForTimeout(400)

  const afterThreadSwitch = await page.evaluate(() => window.__workspaceWebCaptureValidation.getState())
  if (
    afterThreadSwitch.snapshot.activeThreadTitle !== 'Side Research' ||
    afterThreadSwitch.webSnapshot.threadTitle !== 'Workspace Sync Thread'
  ) {
    throw new Error(
      `Managed web continuity drifted after switching the active thread: ${JSON.stringify({
        activeThreadTitle: afterThreadSwitch.snapshot.activeThreadTitle,
        linkedThreadTitle: afterThreadSwitch.webSnapshot.threadTitle
      })}`
    )
  }

  await page.locator('.nav-item__button').filter({ hasText: 'Artifacts' }).click()
  await page.waitForTimeout(400)

  const jumpedSessionVisible = await page.getByRole('button', { name: /Workspace sync regression chat/ }).count()
  if (jumpedSessionVisible !== 1) {
    throw new Error(`Workspace jump did not reopen the linked scope under a non-active thread. count=${jumpedSessionVisible}`)
  }

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(
    JSON.stringify({
      resyncCount: syncedState.resyncCount,
      artifactCount: syncedState.snapshot.artifactCount,
      contextCount: syncedState.snapshot.contextEntries.length,
      threadCount: syncedState.snapshot.threads.length,
      activeThreadTitle: syncedState.snapshot.activeThreadTitle,
      sessionVisible,
      userMessageVisible,
      assistantMessageVisible,
      searchedSessionVisible,
      transcriptPreviewVisible,
      linkedContinuityVisible,
      inspectWorkspaceVisible,
      manageThreadsVisible,
      switchedActiveThreadTitle: afterThreadSwitch.snapshot.activeThreadTitle,
      linkedThreadTitle: afterThreadSwitch.webSnapshot.threadTitle,
      jumpedSessionVisible
    })
  )
}
