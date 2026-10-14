// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

// The production build (vite build + vite preview): it keeps working offline once the service
// worker has precached the app, the engine worker, the WebAssembly and the city table; and the
// forecast screens appear within their time budgets. Each test starts with an empty browser.

const ID = 'perfprofile'
const PROFILE = {
  id: ID,
  birth: { name: 'Asha', date: '1990-05-12', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.9719, longitude: 77.5937, place: 'Bengaluru, Karnataka, India' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

/** The h1 of each screen, so a measurement waits for the new screen rather than the one leaving. */
const TITLE = {
  today: /^[A-Z][a-z]+day, \d{1,2} [A-Z][a-z]+/,
  week: /–/,
  month: /^[A-Z][a-z]+ \d{4}$/,
  year: /^\d{4}$/,
} as const
type View = keyof typeof TITLE

const forecastNav = (page: Page) => page.locator('nav[aria-label="Forecasts"]:visible')

async function seed(context: BrowserContext) {
  await context.addInitScript((profile) => {
    if (!localStorage.getItem('jyotish-daily:profiles:v1')) {
      localStorage.setItem('jyotish-daily:profiles:v1', JSON.stringify({ profiles: [profile], activeId: profile.id }))
    }
  }, PROFILE)
}

/**
 * performance.now() at the first animation frame showing `view` with its own rating: the title
 * matches and no "Updating" spinner says an older result is still standing in for it.
 */
async function shownAt(page: Page, view: View): Promise<number> {
  const handle = await page.waitForFunction(({ source }) => {
    const main = document.querySelector('main')
    const title = main?.querySelector('h1')?.textContent?.trim() ?? ''
    const rated = [...(main?.querySelectorAll('h2') ?? [])].some((h) => /^(Favourable|Mixed|Challenging)$/.test(h.textContent?.trim() ?? ''))
    const updating = [...(main?.querySelectorAll('header [role="status"]') ?? [])].some((s) => s.textContent === 'Updating')
    return new RegExp(source).test(title) && rated && !updating ? performance.now() : false
  }, { source: TITLE[view].source }, { polling: 'raf', timeout: 30_000 })
  return (await handle.jsonValue()) as number
}

const now = (page: Page) => page.evaluate(() => performance.now())

function report(label: string, ms: number) {
  const text = `${label}: ${Math.round(ms)} ms`
  console.log(text)
  test.info().annotations.push({ type: 'timing', description: text })
}

test('works offline after the first visit: forecasts, chart and city search', async ({ page, context }) => {
  await seed(context)
  await page.goto(`./#/p/${ID}/today`)
  await shownAt(page, 'today')
  // The service worker precaches everything while installing and takes control when it activates.
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  await context.setOffline(true)
  // Anything that still tries the network (the service worker included) fails outright.
  await context.route('**/*', (route) => route.abort('internetdisconnected'))
  await page.reload()
  await shownAt(page, 'today')
  await expect(page.getByRole('region', { name: 'Moon today' })).toContainText('Tara bala')

  await forecastNav(page).getByRole('link', { name: 'Year' }).click()
  await shownAt(page, 'year')
  await expect(page.getByRole('heading', { name: 'Muntha', level: 2 })).toBeVisible()
  await forecastNav(page).getByRole('link', { name: 'Chart' }).click()
  await expect(page.getByRole('region', { name: 'Vimsottari dasha timeline' })).toBeVisible()

  await page.goto('./#/new')
  await page.getByRole('combobox', { name: 'Town or city' }).fill('Mysuru')
  await expect(page.getByRole('option').first()).toContainText('Mysuru')
})

test('forecasts appear within their time budgets', async ({ page, context }) => {
  // Cold start: nothing cached, so this includes the page, the worker, the WebAssembly and the day.
  await seed(context)
  await page.goto(`./#/p/${ID}/today`)
  const cold = await shownAt(page, 'today')
  report('Today, cold page load (navigation start to rating)', cold)
  expect(cold).toBeLessThan(3_000) // target 1.5 s

  const times: Partial<Record<View, number>> = {}
  for (const view of ['week', 'month', 'year', 'today'] as const) {
    const start = await now(page)
    await forecastNav(page).getByRole('link', { name: view === 'today' ? 'Today' : view[0].toUpperCase() + view.slice(1) }).click()
    times[view] = (await shownAt(page, view)) - start
    report(`Switch to ${view}${view === 'today' ? ' (cached)' : view === 'year' ? '' : ' (prefetched)'}`, times[view]!)
  }
  expect(times.year!).toBeLessThan(6_000) // target 3 s
  expect(times.today!).toBeLessThan(1_000)

  // A year the worker has not computed yet, on a warm engine.
  await forecastNav(page).getByRole('link', { name: 'Year' }).click()
  await shownAt(page, 'year')
  const title = page.getByRole('main').getByRole('heading', { level: 1 })
  const year = Number(await title.textContent())
  const start = await now(page)
  await page.getByRole('button', { name: 'Next year' }).click()
  await expect(title).toHaveText(String(year + 1))
  const next = (await shownAt(page, 'year')) - start
  report('Next year (not computed yet, warm engine)', next)
  expect(next).toBeLessThan(6_000)
})

test('the first forecast after creating a profile is quick', async ({ page }) => {
  await page.goto('./#/new')
  await page.getByLabel('Name', { exact: true }).fill('Asha')
  await page.getByLabel('Date', { exact: true }).fill('1990-05-12')
  await page.getByLabel('Local time').fill('06:00')
  const place = page.getByRole('combobox', { name: 'Town or city' })
  await place.fill('Bengaluru')
  await page.getByRole('option').first().click()
  await expect(page.getByTestId('chosen-place')).toHaveText('Bengaluru, Karnataka, India')
  const start = await now(page)
  await page.getByRole('button', { name: 'Save and see today' }).click()
  const ms = (await shownAt(page, 'today')) - start
  report('Today, from "Save and see today" to rating', ms)
  expect(ms).toBeLessThan(3_000) // target 1.5 s
})

test('the Content Security Policy blocks nothing the app needs', async ({ page, context }) => {
  await seed(context)
  // Record every violation the browser reports, from the first script onwards.
  await context.addInitScript(() => {
    const store: string[] = []
    ;(window as unknown as { __csp: string[] }).__csp = store
    document.addEventListener('securitypolicyviolation', (e) => store.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  const consoleViolations: string[] = []
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) consoleViolations.push(m.text()) })
  await page.goto('./')
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  for (const view of ['today', 'week', 'month', 'year'] as const) {
    await page.goto(`./#/p/${ID}/${view}`)
    await shownAt(page, view)
  }
  for (const route of [`#/p/${ID}/chart`, `#/p/${ID}/report`, '#/match', '#/new', '#/settings', '#/about']) {
    await page.goto(`./${route}`)
    await page.locator('main h1').first().waitFor({ timeout: 30_000 })
  }
  // City search loads the bundled table with fetch (connect-src).
  await page.goto('./#/new')
  await page.getByRole('combobox').first().fill('Mysuru')
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 })
  const recorded = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)
  expect([...recorded, ...consoleViolations]).toEqual([])
})
