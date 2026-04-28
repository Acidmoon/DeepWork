async page => {
  const screenshotPath = '__SCREENSHOT_PATH__'
  await page.getByRole('button', { name: 'A Artifacts Open Artifacts' }).click()
  await page.waitForTimeout(300)

  const searchBox = page.getByRole('textbox', { name: '搜索查询' })
  await searchBox.fill('111')
  await page.waitForTimeout(300)

  const sessionResults = await page.getByText('1 搜索结果').count()
  const deepseekSessionVisible = await page.getByRole('button', { name: /用户询问数字111含义/ }).count()
  const minimaxSessionVisible = await page.getByRole('button', { name: /MiniMax Agent/ }).count()
  if (sessionResults < 1 || deepseekSessionVisible !== 1 || minimaxSessionVisible !== 0) {
    throw new Error(`Search verification failed: sessionResults=${sessionResults}, deepseek=${deepseekSessionVisible}, minimax=${minimaxSessionVisible}`)
  }

  await page.getByRole('button', { name: '预览' }).nth(1).click()
  await page.waitForTimeout(400)
  const jsonPreviewVisible = await page.getByText('"messageCount": 1').count()
  if (jsonPreviewVisible < 1) {
    throw new Error('JSON preview did not render after selecting preview target.')
  }

  await page.getByRole('checkbox').nth(0).check()
  await page.waitForTimeout(200)
  const selectedCountAfterCheck = await page.getByText('1 已选数量').count()
  const previewStillJson = await page.getByText('"messageCount": 1').count()
  if (selectedCountAfterCheck < 1 || previewStillJson < 1) {
    throw new Error(`Selection/preview separation failed: selected=${selectedCountAfterCheck}, preview=${previewStillJson}`)
  }

  await page.getByRole('combobox', { name: '内容类型' }).selectOption('logs/')
  await page.waitForTimeout(300)
  await searchBox.fill('session-0001')
  await page.waitForTimeout(300)
  const logResultVisible = await page.getByText('1 搜索结果').count()
  await page.getByRole('button', { name: '预览' }).click()
  await page.waitForTimeout(400)
  const logPreviewVisible = await page.getByText('electron-vite dev').count()
  if (logResultVisible < 1 || logPreviewVisible < 1) {
    throw new Error(`Log filter/preview failed: results=${logResultVisible}, preview=${logPreviewVisible}`)
  }

  await page.getByRole('combobox', { name: '内容类型' }).selectOption('artifacts/')
  await page.waitForTimeout(300)
  await searchBox.fill('')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '查看全部范围' }).click()
  await page.waitForTimeout(300)

  const minimaxSessionButton = page.getByRole('button', { name: /MiniMax Agent/ })
  const minimaxSessionVisibleBefore = await minimaxSessionButton.count()
  if (minimaxSessionVisibleBefore !== 1) {
    throw new Error(`Expected MiniMax session to become visible after switching to all scopes, received ${minimaxSessionVisibleBefore}`)
  }

  await minimaxSessionButton.click()
  await page.waitForTimeout(300)
  await page.getByRole('combobox', { name: '目标线程' }).selectOption({ label: 'Release Planning Thread' })
  await page.getByRole('button', { name: '调整到其他线程' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: '当前线程' }).click()
  await page.waitForTimeout(300)

  const activeThreadSessionCount = await page.getByText('3 搜索结果').count()
  if (activeThreadSessionCount < 1) {
    throw new Error(`Expected three sessions after reassigning MiniMax into the active thread, received ${activeThreadSessionCount}`)
  }

  await page.locator('.nav-item__button').filter({ hasText: 'Codex CLI' }).click()
  await page.waitForTimeout(400)

  const activeThreadBadgeVisible = await page.getByText('当前线程: Release Planning Thread').count()
  if (activeThreadBadgeVisible < 1) {
    throw new Error(`Terminal toolbar did not show the active thread badge. count=${activeThreadBadgeVisible}`)
  }

  await page.evaluate(() => {
    window.__workspaceRegressionValidation.enqueuePrompts('CLI Follow Up')
  })
  await page.getByRole('button', { name: '新建线程' }).click()
  await page.waitForFunction(() => window.__workspaceRegressionValidation.getState().snapshot.activeThreadTitle === 'CLI Follow Up')
  await page.waitForTimeout(300)

  const newThreadBadgeVisible = await page.getByText('当前线程: CLI Follow Up').count()
  if (newThreadBadgeVisible < 1) {
    throw new Error(`New thread creation from terminal toolbar did not update the active thread badge. count=${newThreadBadgeVisible}`)
  }

  await page.locator('.nav-item__button').filter({ hasText: 'Artifacts' }).click()
  await page.waitForTimeout(400)
  const createdThreadVisible = await page.getByText('CLI Follow Up').count()
  if (createdThreadVisible < 1) {
    throw new Error(`Created thread was not visible in the workspace thread list. count=${createdThreadVisible}`)
  }

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(
    JSON.stringify({
      sessionResults,
      deepseekSessionVisible,
      minimaxSessionVisible,
      jsonPreviewVisible,
      selectedCountAfterCheck,
      previewStillJson,
      logResultVisible,
      logPreviewVisible,
      minimaxSessionVisibleBefore,
      activeThreadSessionCount,
      activeThreadBadgeVisible,
      newThreadBadgeVisible,
      createdThreadVisible
    })
  )
}
