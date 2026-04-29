async page => {
  const screenshotPath = '__SCREENSHOT_PATH__'
  await page.getByRole('button', { name: 'A Artifacts Open Artifacts' }).click()
  await page.waitForTimeout(300)

  const normalizedMetadataState = await page.evaluate(() => {
    const snapshot = window.__workspaceRegressionValidation.getState().snapshot
    const retrievalAudit = snapshot.artifacts.find((artifact) => artifact.id === 'retrieval_audit_codex-cli__session-0001') ?? null
    const manualNote = snapshot.artifacts.find((artifact) => artifact.id === 'text_0003') ?? null
    const sideResearchThread = snapshot.threads.find((thread) => thread.threadId === 'thread-side-research') ?? null
    return {
      retrievalAuditKind: retrievalAudit?.metadata?.artifactKind ?? null,
      retrievalAuditScopeId: retrievalAudit?.metadata?.sessionScopeId ?? null,
      retrievalOutcome: retrievalAudit?.metadata?.retrievalOutcome ?? null,
      manualArtifactKind: manualNote?.metadata?.artifactKind ?? null,
      manualThreadId: manualNote?.metadata?.threadId ?? null,
      sideResearchScopeCount: sideResearchThread?.scopeCount ?? null
    }
  })
  if (
    normalizedMetadataState.retrievalAuditKind !== 'retrieval-audit' ||
    normalizedMetadataState.retrievalAuditScopeId !== 'codex-cli__session-0001' ||
    normalizedMetadataState.retrievalOutcome !== 'selected_scope' ||
    normalizedMetadataState.manualArtifactKind !== 'manual-save' ||
    normalizedMetadataState.manualThreadId !== 'thread-side-research' ||
    normalizedMetadataState.sideResearchScopeCount !== 2
  ) {
    throw new Error(`Normalized artifact metadata fixture was not wired correctly: ${JSON.stringify(normalizedMetadataState)}`)
  }

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
  await page.locator('summary').filter({ hasText: '线程与修复' }).click()
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

  await page.getByRole('textbox', { name: '新线程标题' }).fill('CLI Follow Up')
  await page.getByRole('button', { name: '新建线程' }).click()
  await page.waitForFunction(() => window.__workspaceRegressionValidation.getState().snapshot.activeThreadTitle === 'CLI Follow Up')
  await page.waitForTimeout(300)

  const createdThreadState = await page.evaluate(() => {
    const snapshot = window.__workspaceRegressionValidation.getState().snapshot
    return {
      activeThreadId: snapshot.activeThreadId,
      threadCount: snapshot.threads.length
    }
  })
  const createdThreadVisible = await page.locator('.artifact-row--thread').filter({ hasText: 'CLI Follow Up' }).count()
  if (createdThreadVisible < 1) {
    throw new Error(`Created thread was not visible in the workspace thread list. count=${createdThreadVisible}`)
  }

  const createdThreadRow = page.locator('.artifact-row--thread').filter({ hasText: 'CLI Follow Up' })
  await createdThreadRow.getByRole('button', { name: '重命名' }).click()
  await page.getByRole('textbox', { name: '线程标题' }).fill('CLI Follow Up Renamed')
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForFunction(() => window.__workspaceRegressionValidation.getState().snapshot.activeThreadTitle === 'CLI Follow Up Renamed')
  await page.waitForTimeout(300)

  const renamedThreadState = await page.evaluate(() => {
    const snapshot = window.__workspaceRegressionValidation.getState().snapshot
    const renamedThread = snapshot.threads.find(thread => thread.title === 'CLI Follow Up Renamed') ?? null
    return {
      activeThreadId: snapshot.activeThreadId,
      activeThreadTitle: snapshot.activeThreadTitle,
      renamedThreadId: renamedThread?.threadId ?? null
    }
  })
  const renamedThreadVisible = await page.locator('.artifact-row--thread').filter({ hasText: 'CLI Follow Up Renamed' }).count()
  if (
    renamedThreadVisible < 1 ||
    renamedThreadState.activeThreadId !== createdThreadState.activeThreadId ||
    renamedThreadState.renamedThreadId !== createdThreadState.activeThreadId
  ) {
    throw new Error(
      `Inline rename did not preserve the created thread identity: ${JSON.stringify({
        createdThreadId: createdThreadState.activeThreadId,
        activeThreadId: renamedThreadState.activeThreadId,
        renamedThreadId: renamedThreadState.renamedThreadId,
        renamedThreadVisible
      })}`
    )
  }

  const releasePlanningThreadRow = page.locator('.artifact-row--thread').filter({ hasText: 'Release Planning Thread' })
  await releasePlanningThreadRow.getByRole('button', { name: '继续' }).click()
  await page.waitForFunction(() => window.__workspaceRegressionValidation.getState().snapshot.activeThreadTitle === 'Release Planning Thread')
  await page.waitForTimeout(300)

  const afterActivation = await page.evaluate(() => {
    const snapshot = window.__workspaceRegressionValidation.getState().snapshot
    const releasePlanningThread = snapshot.threads.find(thread => thread.threadId === 'thread-release-planning') ?? null
    const renamedThread = snapshot.threads.find(thread => thread.threadId === snapshot.threads.find(item => item.title === 'CLI Follow Up Renamed')?.threadId) ?? null
    return {
      activeThreadTitle: snapshot.activeThreadTitle,
      threadCount: snapshot.threads.length,
      releasePlanningScopeCount: releasePlanningThread?.scopeCount ?? null,
      renamedThreadTitle: renamedThread?.title ?? null
    }
  })
  if (
    afterActivation.activeThreadTitle !== 'Release Planning Thread' ||
    afterActivation.threadCount !== createdThreadState.threadCount ||
    afterActivation.releasePlanningScopeCount !== 3 ||
    afterActivation.renamedThreadTitle !== 'CLI Follow Up Renamed'
  ) {
    throw new Error(`Workspace snapshot drifted after create/rename/activate flows: ${JSON.stringify(afterActivation)}`)
  }

  await page.locator('.nav-item__button').filter({ hasText: 'Codex CLI' }).click()
  await page.waitForTimeout(400)

  const continuityStatusVisible = await page.getByText('已链接上下文').count()
  const activeThreadBadgeVisible = await page.getByText('当前线程: Release Planning Thread').count()
  const inspectWorkspaceButtonVisible = await page.getByRole('button', { name: '检查 Workspace' }).count()
  const manageThreadsButtonVisible = await page.getByRole('button', { name: '在 Workspace 中管理线程' }).count()
  if (continuityStatusVisible !== 0 || activeThreadBadgeVisible !== 0 || inspectWorkspaceButtonVisible !== 0 || manageThreadsButtonVisible !== 0) {
    throw new Error(
      `Terminal panel still exposed removed continuity UI: ${JSON.stringify({
        continuityStatusVisible,
        activeThreadBadgeVisible,
        inspectWorkspaceButtonVisible,
        manageThreadsButtonVisible
      })}`
    )
  }

  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(
    JSON.stringify({
      sessionResults,
      deepseekSessionVisible,
      minimaxSessionVisible,
      normalizedMetadataState,
      jsonPreviewVisible,
      selectedCountAfterCheck,
      previewStillJson,
      logResultVisible,
      logPreviewVisible,
      minimaxSessionVisibleBefore,
      activeThreadSessionCount,
      createdThreadId: createdThreadState.activeThreadId,
      renamedThreadTitle: renamedThreadState.activeThreadTitle,
      releasePlanningScopeCount: afterActivation.releasePlanningScopeCount,
      continuityStatusVisible,
      activeThreadBadgeVisible,
      inspectWorkspaceButtonVisible,
      manageThreadsButtonVisible
    })
  )
}
