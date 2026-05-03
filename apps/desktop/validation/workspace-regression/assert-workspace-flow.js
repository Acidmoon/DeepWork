async page => {
  const screenshotPath = '__SCREENSHOT_PATH__'

  const waitForInspectionMode = async mode => {
    await page.waitForFunction(
      expectedMode => document.querySelector('.workspace-inspector')?.getAttribute('data-inspection-mode') === expectedMode,
      mode
    )
    await page.waitForTimeout(300)
  }

  const selectNavPanel = async label => {
    await page.locator('.nav-item__button').filter({ hasText: label }).click()
  }

  await selectNavPanel('Artifacts')
  await waitForInspectionMode('workspace')

  const normalizedMetadataState = await page.evaluate(() => {
    const snapshot = window.__workspaceRegressionValidation.getState().snapshot
    const retrievalAudit = snapshot.artifacts.find(artifact => artifact.id === 'retrieval_audit_codex-cli__session-0001') ?? null
    const manualNote = snapshot.artifacts.find(artifact => artifact.id === 'text_0003') ?? null
    const sideResearchThread = snapshot.threads.find(thread => thread.threadId === 'thread-side-research') ?? null
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

  const workspaceRoot = page.locator('.workspace-inspector[data-inspection-mode="workspace"]')
  const workspaceSourcesPane = workspaceRoot.locator('[data-pane="sources"]').first()
  const workspaceDetailPane = workspaceRoot.locator('[data-pane="detail"]').first()
  const workspaceRecordsPane = workspaceRoot.locator('[data-pane="records"]').first()
  const workspacePreviewPane = workspaceRoot.locator('[data-pane="preview"]').first()
  const workspaceSearchBox = page.getByRole('textbox', { name: '搜索查询' })

  await workspaceSearchBox.fill('111')
  await page.waitForTimeout(300)

  const workspaceHierarchy = await workspaceRoot.evaluate(node => ({
    inspectionMode: node.getAttribute('data-inspection-mode'),
    threadScope: node.getAttribute('data-thread-scope'),
    selectedOrigin: node.getAttribute('data-selected-origin'),
    searchActive: node.getAttribute('data-search-active'),
    panes: [...node.querySelectorAll('[data-pane]')].map(element => element.getAttribute('data-pane'))
  }))
  const workspacePaneSet = new Set(workspaceHierarchy.panes)
  if (
    workspaceHierarchy.inspectionMode !== 'workspace' ||
    workspaceHierarchy.threadScope !== 'active' ||
    workspaceHierarchy.selectedOrigin !== 'all' ||
    workspaceHierarchy.searchActive !== 'true' ||
    !workspacePaneSet.has('header') ||
    !workspacePaneSet.has('sources') ||
    !workspacePaneSet.has('detail') ||
    !workspacePaneSet.has('records') ||
    !workspacePaneSet.has('preview')
  ) {
    throw new Error(`Workspace hierarchy markers were not rendered as expected: ${JSON.stringify(workspaceHierarchy)}`)
  }

  const routineInspectionState = {
    sourceListVisible: await workspaceRoot.getByText('来源列表').count(),
    selectedDetailVisible: await workspaceRoot.getByText('来源详情').count(),
    timelineVisible: await workspaceRoot.getByText('对话时间线').count(),
    relatedRecordsVisible: await workspaceRoot.getByText('相关记录').count(),
    maintenanceSummaryVisible: await page.locator('summary').filter({ hasText: '工作区维护' }).count()
  }
  if (
    routineInspectionState.sourceListVisible < 1 ||
    routineInspectionState.selectedDetailVisible < 1 ||
    routineInspectionState.timelineVisible < 1 ||
    routineInspectionState.relatedRecordsVisible < 1 ||
    routineInspectionState.maintenanceSummaryVisible < 1
  ) {
    throw new Error(`Workspace reading flow was not visible before advanced sections opened: ${JSON.stringify(routineInspectionState)}`)
  }

  const deepseekSourceRow = workspaceSourcesPane.locator('.artifact-row--session').filter({ hasText: '用户询问数字111含义' })
  const minimaxSourceRow = workspaceSourcesPane.locator('.artifact-row--session').filter({ hasText: 'MiniMax Agent' })
  const sessionResults = await workspaceSourcesPane.locator('.artifact-row--session').count()
  const deepseekSessionVisible = await deepseekSourceRow.count()
  const minimaxSessionVisible = await minimaxSourceRow.count()
  if (sessionResults !== 1 || deepseekSessionVisible !== 1 || minimaxSessionVisible !== 0) {
    throw new Error(`Workspace search verification failed: ${JSON.stringify({ sessionResults, deepseekSessionVisible, minimaxSessionVisible })}`)
  }

  await deepseekSourceRow.click()
  await page.waitForTimeout(300)
  const workspaceSelectionStateAfterSelect = {
    selectedOrigin: await workspaceRoot.getAttribute('data-selected-origin'),
    sourceRowsVisible: await workspaceSourcesPane.locator('.artifact-row--session').count(),
    activeSourceRows: await workspaceSourcesPane.locator('.artifact-row--session.artifact-row--active').count(),
    sessionSummaryCards: await workspaceDetailPane.locator('.workspace-session-summary').count(),
    timelineCards: await workspaceDetailPane.locator('.session-message').count()
  }
  if (
    workspaceSelectionStateAfterSelect.selectedOrigin === 'all' ||
    workspaceSelectionStateAfterSelect.sourceRowsVisible !== 1 ||
    workspaceSelectionStateAfterSelect.activeSourceRows !== 1 ||
    workspaceSelectionStateAfterSelect.sessionSummaryCards !== 1 ||
    workspaceSelectionStateAfterSelect.timelineCards !== 1
  ) {
    throw new Error(`Workspace source selection did not activate the clarified detail flow: ${JSON.stringify(workspaceSelectionStateAfterSelect)}`)
  }

  const jsonArtifactRow = workspaceRecordsPane.locator('.artifact-row').filter({ hasText: '消息索引' }).first()
  await jsonArtifactRow.getByRole('button', { name: '预览' }).click()
  await page.waitForTimeout(400)
  const jsonPreviewVisible = await workspacePreviewPane.getByText('"messageCount": 1').count()
  if (jsonPreviewVisible < 1) {
    throw new Error('Workspace preview did not render the selected JSON artifact.')
  }

  await deepseekSourceRow.click()
  await page.waitForTimeout(300)
  const workspaceDeselectionState = {
    selectedOrigin: await workspaceRoot.getAttribute('data-selected-origin'),
    activeSourceRows: await workspaceSourcesPane.locator('.artifact-row--session.artifact-row--active').count(),
    sessionSummaryCards: await workspaceDetailPane.locator('.workspace-session-summary').count(),
    previewStillJson: await workspacePreviewPane.getByText('"messageCount": 1').count()
  }
  if (
    workspaceDeselectionState.selectedOrigin !== 'all' ||
    workspaceDeselectionState.activeSourceRows !== 0 ||
    workspaceDeselectionState.sessionSummaryCards !== 0 ||
    workspaceDeselectionState.previewStillJson < 1
  ) {
    throw new Error(`Workspace source deselection failed: ${JSON.stringify(workspaceDeselectionState)}`)
  }

  await workspaceRecordsPane.getByRole('checkbox').nth(0).check()
  await page.waitForTimeout(200)
  const selectedCountAfterCheck = await workspaceRecordsPane.getByText('1 已选数量').count()
  const previewStillJson = await workspacePreviewPane.getByText('"messageCount": 1').count()
  if (selectedCountAfterCheck < 1 || previewStillJson < 1) {
    throw new Error(`Selection and preview separation failed: ${JSON.stringify({ selectedCountAfterCheck, previewStillJson })}`)
  }

  await selectNavPanel('Logs')
  await waitForInspectionMode('logs')

  const logsRoot = page.locator('.workspace-inspector[data-inspection-mode="logs"]')
  const logsSourcesPane = logsRoot.locator('[data-pane="sources"]').first()
  const logsRecordsPane = logsRoot.locator('[data-pane="records"]').first()
  const logsPreviewPane = logsRoot.locator('[data-pane="preview"]').first()
  const logsSearchBox = page.getByRole('textbox', { name: '搜索查询' })

  await logsSearchBox.fill('session-0001')
  await page.waitForTimeout(300)

  const logsHierarchy = await logsRoot.evaluate(node => ({
    inspectionMode: node.getAttribute('data-inspection-mode'),
    threadScope: node.getAttribute('data-thread-scope'),
    selectedOrigin: node.getAttribute('data-selected-origin'),
    searchActive: node.getAttribute('data-search-active'),
    panes: [...node.querySelectorAll('[data-pane]')].map(element => element.getAttribute('data-pane'))
  }))
  const logsPaneSet = new Set(logsHierarchy.panes)
  if (
    logsHierarchy.inspectionMode !== 'logs' ||
    logsHierarchy.threadScope !== 'active' ||
    logsHierarchy.selectedOrigin !== 'all' ||
    logsHierarchy.searchActive !== 'true' ||
    !logsPaneSet.has('header') ||
    !logsPaneSet.has('sources') ||
    !logsPaneSet.has('records') ||
    !logsPaneSet.has('preview') ||
    logsPaneSet.has('detail')
  ) {
    throw new Error(`Logs hierarchy markers were not rendered as expected: ${JSON.stringify(logsHierarchy)}`)
  }

  const logSourcesHeadingVisible = await logsRoot.getByText('日志来源').count()
  const logRecordsHeadingVisible = await logsRoot.getByText('日志记录').count()
  const logPreviewHeadingVisible = await logsRoot.getByText('日志预览').count()
  const workspaceTimelineHeadingVisible = await logsRoot.getByText('对话时间线').count()
  const logResultVisible = await logsSourcesPane.locator('.artifact-row--session').count()
  const logSessionRow = logsSourcesPane.locator('.artifact-row--session').filter({ hasText: 'session-0001' }).first()
  const terminalTranscriptRow = logsRecordsPane.locator('.artifact-row').filter({ hasText: '终端转录' }).first()
  const retrievalAuditRow = logsRecordsPane.locator('.artifact-row').filter({ hasText: '检索审计' }).first()
  const terminalTranscriptMetaVisible = await terminalTranscriptRow.count()
  const retrievalAuditMetaVisible = await retrievalAuditRow.count()
  if (
    logSourcesHeadingVisible < 1 ||
    logRecordsHeadingVisible < 1 ||
    logPreviewHeadingVisible < 1 ||
    workspaceTimelineHeadingVisible !== 0 ||
    logResultVisible !== 1 ||
    terminalTranscriptMetaVisible < 1 ||
    retrievalAuditMetaVisible < 1
  ) {
    throw new Error(
      `Logs reading flow did not render clearly: ${JSON.stringify({
        logSourcesHeadingVisible,
        logRecordsHeadingVisible,
        logPreviewHeadingVisible,
        workspaceTimelineHeadingVisible,
        logResultVisible,
        terminalTranscriptMetaVisible,
        retrievalAuditMetaVisible
      })}`
    )
  }

  await logSessionRow.click()
  await page.waitForTimeout(300)
  const logSelectionStateAfterSelect = {
    selectedOrigin: await logsRoot.getAttribute('data-selected-origin'),
    activeSourceRows: await logsSourcesPane.locator('.artifact-row--session.artifact-row--active').count(),
    inlineSummaryCards: await logsRecordsPane.locator('.workspace-session-summary--inline').count()
  }
  if (
    logSelectionStateAfterSelect.selectedOrigin === 'all' ||
    logSelectionStateAfterSelect.activeSourceRows !== 1 ||
    logSelectionStateAfterSelect.inlineSummaryCards !== 1
  ) {
    throw new Error(`Log source selection did not activate as expected: ${JSON.stringify(logSelectionStateAfterSelect)}`)
  }

  await logSessionRow.click()
  await page.waitForTimeout(300)
  const logDeselectionState = {
    selectedOrigin: await logsRoot.getAttribute('data-selected-origin'),
    activeSourceRows: await logsSourcesPane.locator('.artifact-row--session.artifact-row--active').count(),
    inlineSummaryCards: await logsRecordsPane.locator('.workspace-session-summary--inline').count()
  }
  if (
    logDeselectionState.selectedOrigin !== 'all' ||
    logDeselectionState.activeSourceRows !== 0 ||
    logDeselectionState.inlineSummaryCards !== 0
  ) {
    throw new Error(`Log source deselection failed: ${JSON.stringify(logDeselectionState)}`)
  }

  await terminalTranscriptRow.getByRole('button', { name: '预览' }).click()
  await page.waitForTimeout(400)
  const logPreviewVisible = await logsPreviewPane.getByText('electron-vite dev').count()
  if (logPreviewVisible < 1) {
    throw new Error('Log preview did not render the terminal transcript.')
  }

  await selectNavPanel('Artifacts')
  await waitForInspectionMode('workspace')

  await workspaceSearchBox.fill('')
  await page.waitForTimeout(300)
  const searchClearedState = {
    searchActive: await workspaceRoot.getAttribute('data-search-active'),
    selectedOrigin: await workspaceRoot.getAttribute('data-selected-origin')
  }
  if (searchClearedState.searchActive !== 'false' || searchClearedState.selectedOrigin !== 'all') {
    throw new Error(`Workspace state did not reset after clearing the search: ${JSON.stringify(searchClearedState)}`)
  }

  await page.getByRole('button', { name: '查看全部范围' }).click()
  await page.waitForTimeout(300)
  await page.locator('summary').filter({ hasText: '线程与修复' }).click()
  await page.waitForTimeout(300)

  const minimaxSessionButton = workspaceSourcesPane.locator('.artifact-row--session').filter({ hasText: 'MiniMax Agent' })
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

  const activeThreadSessionCount = await workspaceSourcesPane.locator('.artifact-row--session').count()
  if (activeThreadSessionCount !== 3) {
    throw new Error(`Expected three visible sources after reassigning MiniMax into the active thread, received ${activeThreadSessionCount}`)
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
    throw new Error(`Workspace snapshot drifted after create, rename, and activate flows: ${JSON.stringify(afterActivation)}`)
  }

  await page.locator('summary').filter({ hasText: '工作区维护' }).click()
  await page.waitForTimeout(300)

  const beforeMaintenanceScan = await page.evaluate(() => JSON.stringify(window.__workspaceRegressionValidation.getState().snapshot))
  await page.getByRole('button', { name: '扫描' }).click()
  await page.waitForTimeout(300)
  const afterMaintenanceScan = await page.evaluate(() => JSON.stringify(window.__workspaceRegressionValidation.getState().snapshot))
  if (beforeMaintenanceScan !== afterMaintenanceScan) {
    throw new Error('Maintenance scan mutated the workspace snapshot.')
  }

  const maintenanceLabels = {
    missing: await page.getByText('缺失文件').count(),
    orphaned: await page.getByText('孤立记录').count(),
    stale: await page.getByText('派生索引过期').count(),
    duplicate: await page.getByText('重复 ID').count(),
    unsafe: await page.getByText('不安全路径').count()
  }
  if (
    maintenanceLabels.missing < 1 ||
    maintenanceLabels.orphaned < 1 ||
    maintenanceLabels.stale < 1 ||
    maintenanceLabels.duplicate < 1 ||
    maintenanceLabels.unsafe < 1
  ) {
    throw new Error(`Maintenance scan findings did not render: ${JSON.stringify(maintenanceLabels)}`)
  }

  await page.getByRole('button', { name: '重建索引' }).click()
  await page.waitForTimeout(300)
  const rebuildActionVisible = await page.getByText('Rebuilt derived workspace indexes.').count()
  const rebuildChangedFilesVisible = await page.getByText('2').count()
  if (rebuildActionVisible < 1 || rebuildChangedFilesVisible < 1) {
    throw new Error(`Maintenance rebuild result did not render: ${JSON.stringify({ rebuildActionVisible, rebuildChangedFilesVisible })}`)
  }

  await page.getByRole('button', { name: '准备安全修复' }).click()
  await page.getByRole('button', { name: '安全修复' }).click()
  await page.waitForTimeout(300)
  const repairActionVisible = await page.getByText('Removed unsafe or orphaned manifest reference markdown_missing.').count()
  const maintenanceCalls = await page.evaluate(() => window.__workspaceRegressionValidation.getState().maintenanceCalls)
  if (repairActionVisible < 1 || JSON.stringify(maintenanceCalls) !== JSON.stringify(['scan', 'rebuild', 'repair'])) {
    throw new Error(`Maintenance repair result did not render or calls drifted: ${JSON.stringify({ repairActionVisible, maintenanceCalls })}`)
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
      workspaceHierarchy,
      workspaceSelectionStateAfterSelect,
      workspaceDeselectionState,
      jsonPreviewVisible,
      selectedCountAfterCheck,
      previewStillJson,
      logsHierarchy,
      logResultVisible,
      logSourcesHeadingVisible,
      logRecordsHeadingVisible,
      logPreviewHeadingVisible,
      terminalTranscriptMetaVisible,
      retrievalAuditMetaVisible,
      logSelectionStateAfterSelect,
      logDeselectionState,
      logPreviewVisible,
      minimaxSessionVisibleBefore,
      activeThreadSessionCount,
      createdThreadId: createdThreadState.activeThreadId,
      renamedThreadTitle: renamedThreadState.activeThreadTitle,
      releasePlanningScopeCount: afterActivation.releasePlanningScopeCount,
      maintenanceLabels,
      maintenanceCalls,
      continuityStatusVisible,
      activeThreadBadgeVisible,
      inspectWorkspaceButtonVisible,
      manageThreadsButtonVisible
    })
  )
}
