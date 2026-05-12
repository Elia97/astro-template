import { test, expect } from '@playwright/test'

test.describe('home page', () => {
  test('loads with expected title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Astro/i)
  })

  test('does NOT have .dark class on <html> by default', async ({ page }) => {
    await page.goto('/')
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).not.toContain('dark')
  })

  test('injects anti-FOUC dark mode script in the head', async ({ page }) => {
    await page.goto('/')
    const headHtml = await page.evaluate(() => document.head.innerHTML)
    expect(headHtml).toContain("localStorage.getItem('theme')")
  })

  test('view transitions ClientRouter is enabled', async ({ page }) => {
    await page.goto('/')
    const headHtml = await page.evaluate(() => document.head.innerHTML)
    // ClientRouter inietta uno script (o meta) che contiene la parola
    // "transition" — verifica generica ma sufficiente come smoke check.
    expect(headHtml).toMatch(/transition/i)
  })

  test('applies bg-background utility to body', async ({ page }) => {
    await page.goto('/')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    // Background del tema light deve essere quasi bianco (oklch(1 0 0)) → browser
    // lo renderizza in rgb(255, 255, 255) o oklch(1 0 0). Verifica non sia "transparent".
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(bg).not.toBe('transparent')
  })
})
