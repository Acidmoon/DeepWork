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
      logPreviewVisible
    })
  )
}
