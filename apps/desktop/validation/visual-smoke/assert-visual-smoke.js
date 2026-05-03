async page => {
  const artifactsDir = '__ARTIFACTS_DIR__'
  const screenshot = name => `${artifactsDir}/${name}.png`

  async function requireVisible(selector, label) {
    const locator = page.locator(selector).first()
    await locator.waitFor({ state: 'visible', timeout: 5000 })
    const box = await locator.boundingBox()
    if (!box || box.width < 2 || box.height < 2) {
      throw new Error(`${label} is not visibly sized: ${JSON.stringify(box)}`)
    }
  }

  async function requireNonBlank(selector, label) {
    const summary = await page.locator(selector).first().evaluate(element => {
      const rect = element.getBoundingClientRect()
      const text = element.textContent?.trim() ?? ''
      return {
        width: rect.width,
        height: rect.height,
        textLength: text.length,
        background: getComputedStyle(element).backgroundImage
      }
    })

    if (summary.width < 80 || summary.height < 80) {
      throw new Error(`${label} is too small: ${JSON.stringify(summary)}`)
    }
    if (summary.background.includes('gradient')) {
      throw new Error(`${label} still uses a decorative gradient background: ${summary.background}`)
    }
  }

  async function assertNoCriticalOverlap(rootSelector, label) {
    const overlap = await page.locator(rootSelector).evaluate(root => {
      const items = Array.from(root.querySelectorAll('button, input, textarea, select, .state-pill, .mini-pill'))
        .filter(element => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return (
            !element.closest('details:not([open])') &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            rect.width > 2 &&
            rect.height > 2
          )
        })
        .map(element => {
          const rect = element.getBoundingClientRect()
          return {
            label:
              element.getAttribute('aria-label') ||
              element.getAttribute('title') ||
              element.textContent?.trim() ||
              element.tagName,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }
        })

      for (let index = 0; index < items.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
          const left = items[index]
          const right = items[nextIndex]
          const overlapX = Math.min(left.right, right.right) - Math.max(left.left, right.left)
          const overlapY = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top)
          if (overlapX > 2 && overlapY > 2) {
            return { left, right, overlapX, overlapY }
          }
        }
      }

      return null
    })

    if (overlap) {
      throw new Error(`${label} contains overlapping controls: ${JSON.stringify(overlap)}`)
    }
  }

  async function assertToolbarStable(label) {
    await requireVisible('.canvas__toolbar', `${label} toolbar`)
    await assertNoCriticalOverlap('.canvas__toolbar', `${label} toolbar`)
    const toolbarHeight = await page.locator('.canvas__toolbar').evaluate(element => element.getBoundingClientRect().height)
    if (toolbarHeight < 40 || toolbarHeight > 112) {
      throw new Error(`${label} toolbar height is outside the expected stable range: ${toolbarHeight}`)
    }
  }

  async function ensureDetailsOpen(label) {
    const showDetails = page.getByRole('button', { name: 'Show Details' })
    if ((await showDetails.count()) > 0) {
      await showDetails.first().click()
    }
    await requireVisible('.stage-drawer', label)
  }

  await requireVisible('.shell', 'workbench shell')
  await requireVisible('.sidebar', 'sidebar')
  await requireVisible('.status-bar', 'status line')
  await requireVisible('.home-workspace', 'home workspace chooser')
  await page.locator('.home-workspace .stat-block strong').filter({ hasText: 'No workspace selected' }).first().waitFor({ state: 'visible', timeout: 5000 })
  await page.getByRole('button', { name: 'Choose Workspace' }).waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('Quick Open Saved Workspaces').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('Default Project').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('Archive Notes').waitFor({ state: 'visible', timeout: 5000 })
  await page.locator('.home-profile-row').filter({ hasText: 'Default Project' }).getByRole('button', { name: 'Open' }).click()
  await page.getByText('Resume Current Workspace').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('Release Planning Thread').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByRole('button', { name: 'Open In Workspace' }).waitFor({ state: 'visible', timeout: 5000 })
  await assertToolbarStable('initial')

  await page.getByRole('button', { name: 'DeepSeek Web', exact: true }).click()
  await page.waitForTimeout(400)
  await requireVisible('.web-panel-host', 'web primary host')
  await assertToolbarStable('web')
  await page.screenshot({ path: screenshot('web-light'), fullPage: true })

  await ensureDetailsOpen('web details inspector')
  await requireVisible('.web-panel-host', 'web primary host')
  await requireNonBlank('.web-panel-host', 'web primary host')
  await assertToolbarStable('web details')
  await page.screenshot({ path: screenshot('web-inspector-light'), fullPage: true })

  await page.getByRole('button', { name: 'Codex CLI', exact: true }).click()
  await page.waitForTimeout(500)
  await requireVisible('.terminal-host', 'terminal host')
  await requireNonBlank('.terminal-host', 'terminal host')
  await assertToolbarStable('terminal')
  await ensureDetailsOpen('terminal details inspector')
  await page.getByText('Retrieval Context').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('Thread local').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('deepseek-web__a-chat-s-9b9f89a2-ceff').waitFor({ state: 'visible', timeout: 5000 })

  const rawArtifactContentVisible = await page.getByText('你只发了数字').count()
  if (rawArtifactContentVisible > 0) {
    throw new Error('Terminal retrieval summary rendered raw artifact content instead of bounded metadata.')
  }

  await page.evaluate(() => window.__visualSmokeValidation.setTerminalRetrievalScenario('global-fallback'))
  await page.getByText('Global fallback selected').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('manual-note__research-note').waitFor({ state: 'visible', timeout: 5000 })

  await page.evaluate(() => window.__visualSmokeValidation.setTerminalRetrievalScenario('global-preferred'))
  await page.getByText('Global preferred selected').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('minimax-web__minimax-agent').waitFor({ state: 'visible', timeout: 5000 })

  await page.evaluate(() => window.__visualSmokeValidation.setTerminalRetrievalScenario('no-match'))
  await page.getByText('No match').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('No scope attached').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByText('Reason: no candidates met threshold').waitFor({ state: 'visible', timeout: 5000 })

  const deprecatedContinuityChrome = {
    linkedContext: await page.getByText('Linked Context').count(),
    currentThread: await page.getByText('Current Thread: Release Planning Thread').count(),
    openWorkspaceButton: await page.getByRole('button', { name: 'Open In Workspace' }).count(),
    manageThreadsButton: await page.getByRole('button', { name: 'Manage Threads In Workspace' }).count()
  }
  if (
    deprecatedContinuityChrome.linkedContext !== 0 ||
    deprecatedContinuityChrome.currentThread !== 0 ||
    deprecatedContinuityChrome.openWorkspaceButton !== 0 ||
    deprecatedContinuityChrome.manageThreadsButton !== 0
  ) {
    throw new Error(`Terminal panel exposed deprecated continuity chrome: ${JSON.stringify(deprecatedContinuityChrome)}`)
  }

  await assertNoCriticalOverlap('.stage-drawer', 'terminal inspector')
  await page.screenshot({ path: screenshot('terminal-inspector-light'), fullPage: true })

  await page.getByRole('button', { name: 'Artifacts', exact: true }).click()
  await requireVisible('.workspace-inspector', 'workspace inspector')
  await requireVisible('.artifact-list', 'workspace list')
  await assertToolbarStable('workspace')
  await assertNoCriticalOverlap('.workspace-inspector', 'workspace inspector')
  await page.screenshot({ path: screenshot('workspace-light'), fullPage: true })

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await requireVisible('.settings-surface', 'settings surface')
  await page.getByLabel('Scrollback Lines').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByLabel('Copy On Selection').waitFor({ state: 'visible', timeout: 5000 })
  await page.getByLabel('Confirm Multi-line Paste').waitFor({ state: 'visible', timeout: 5000 })
  await assertToolbarStable('settings')
  await assertNoCriticalOverlap('.settings-surface', 'settings surface')
  await page.getByLabel('Display Theme').selectOption('dark')
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
  await page.screenshot({ path: screenshot('settings-dark'), fullPage: true })

  await page.setViewportSize({ width: 900, height: 720 })
  await page.getByRole('button', { name: 'DeepSeek Web', exact: true }).click()
  await page.waitForTimeout(400)
  await assertToolbarStable('constrained web')
  await requireVisible('.sidebar', 'constrained sidebar')
  await requireVisible('.web-panel-host', 'constrained web host')
  await ensureDetailsOpen('constrained web inspector')
  await assertNoCriticalOverlap('.canvas__toolbar', 'constrained web toolbar')
  await assertNoCriticalOverlap('.stage-drawer', 'constrained web inspector')
  await page.screenshot({ path: screenshot('web-constrained-dark'), fullPage: true })

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByLabel('Display Language').selectOption('zh-CN')
  await page.getByText('应用设置').waitFor({ state: 'visible', timeout: 5000 })
  await assertNoCriticalOverlap('.settings-surface', 'Simplified Chinese settings surface')
  await page.screenshot({ path: screenshot('settings-dark-zh'), fullPage: true })

  const summary = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    toolbarControls: document.querySelectorAll('.canvas__toolbar button, .canvas__toolbar input').length,
    navRows: document.querySelectorAll('.nav-item').length,
    screenshots: [
      'web-light.png',
      'web-inspector-light.png',
      'terminal-inspector-light.png',
      'workspace-light.png',
      'settings-dark.png',
      'web-constrained-dark.png',
      'settings-dark-zh.png'
    ]
  }))

  console.log(JSON.stringify(summary))
}
