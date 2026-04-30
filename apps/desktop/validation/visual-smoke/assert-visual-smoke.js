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
  await requireVisible('.settings-placeholder-list', 'settings deferred placeholders')
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
