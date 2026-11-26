/**
 * Honest video messages (version 1.3), in WebKit at iPad sizes:
 *  - offline: "Videos need the internet", and the video comes back by itself once the iPad is online;
 *  - online, but YouTube's player doesn't load (its script fails, or the player never gets ready):
 *    the video didn't load, with Try again and Open in YouTube, and a word to ask a grown-up to check
 *    YouTube isn't blocked on this iPad;
 *  - Test YouTube in the grown-ups' area says which case it is.
 * The checks cut YouTube's script on purpose; the browser's notes about those loads are expected.
 */
import { KID_COPY } from '../src/content/kid'
import { READY_TIMEOUT_MS } from '../src/media/youtube'
import { watchUrl } from '../src/media/youtube-util'
import { YOUTUBE_TEST_WORDS } from '../src/model/video-problems'
import { YT_API_STUB, assertYouTubeRules, checkScreen, expect, holdGate, seedSave, setUpSave, tap, test, ytPlayers } from './helpers'

const P = KID_COPY.practice
const API = 'https://www.youtube.com/iframe_api'
/** Loads these checks cut on purpose. */
const CUT = /iframe_api|Failed to load resource|Load failed|network connection|cancelled/i
const forget = (problems: string[]) => {
  for (let i = problems.length - 1; i >= 0; i--) if (CUT.test(problems[i])) problems.splice(i, 1)
}
const setOnline = (on: boolean) => {
  Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get: () => on })
  window.dispatchEvent(new Event(on ? 'online' : 'offline'))
}

test('offline: "Videos need the internet", and the video comes back by itself once the iPad is online', async ({ page, problems }) => {
  await page.addInitScript(setOnline, false)
  await page.route(API, (r) => r.abort())
  await page.goto('./#/room')
  const panel = page.locator('.yt-error')
  await expect(panel).toContainText(P.videoOffline)
  await expect(panel.getByRole('button', { name: P.tryAgain })).toHaveCount(0)
  await checkScreen(page, 'kid', 'a video while offline')

  await page.unroute(API)
  await page.evaluate(setOnline, true)
  await expect(page.locator('.yt-error')).toHaveCount(0)
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['PBhzOdOIFEY'])
  forget(problems)
})

test('online, but YouTube’s player doesn’t load: the video didn’t load, with Try again and Open in YouTube', async ({ page, problems }) => {
  await page.route(API, (r) => r.abort())
  await page.goto('./#/room')
  const panel = page.locator('.yt-error')
  await expect(panel).toContainText(P.videoNotLoaded)
  await expect(panel).not.toContainText(/internet/i)
  await expect(panel).toContainText(P.videoAskGrownUp)
  await expect(panel.locator('a.open-in-youtube')).toHaveAttribute('href', watchUrl('PBhzOdOIFEY'))
  await expect(panel.locator('a.open-in-youtube')).toHaveAttribute('target', '_blank')
  await checkScreen(page, 'kid', 'a video that didn’t load')

  // YouTube comes back: Try again plays it.
  await page.unroute(API)
  await tap(panel.getByRole('button', { name: P.tryAgain }))
  await expect(page.locator('.yt-error')).toHaveCount(0)
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['PBhzOdOIFEY'])
  await assertYouTubeRules(page, 'after Try again')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await ytPlayers(page))[0]?.playing, { timeout: 15_000 }).toBe(true)
  forget(problems)
})

test('the same honest message on a practice step', async ({ page, problems }) => {
  await seedSave(page, setUpSave())
  await page.route(API, (r) => r.abort())
  await page.goto('./#/practice/sec-2/dance-follow-75')
  const panel = page.locator('.yt-error')
  await expect(panel).toContainText(P.videoNotLoaded)
  await expect(panel).not.toContainText(/internet/i)
  await expect(panel.getByRole('button', { name: P.tryAgain })).toBeVisible()
  await checkScreen(page, 'kid', 'a practice step whose video didn’t load')
  forget(problems)
})

test('YouTube’s script loads but the player never gets ready: after a while, the video didn’t load', async ({ page }) => {
  await page.clock.install()
  await page.route(API, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: YT_API_STUB.replace("fire('onReady')", 'void 0') }))
  await page.goto('./#/room')
  await expect(page.locator('.room iframe')).toHaveCount(1)
  await expect(page.locator('.yt-error')).toHaveCount(0)
  await page.clock.fastForward(READY_TIMEOUT_MS + 1000)
  await expect(page.locator('.yt-error')).toContainText(P.videoNotLoaded)
  await expect(page.locator('.room iframe')).toHaveCount(0)
})

test('Test YouTube in the grown-ups’ area says which case it is', async ({ page, problems }) => {
  test.setTimeout(90_000)
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await holdGate(page)
  const go = page.getByRole('button', { name: 'Test YouTube' })
  const result = page.locator('.yt-test-result')

  await page.evaluate(setOnline, false)
  await tap(go)
  await expect(result).toHaveAttribute('data-result', 'offline')
  await expect(result).toHaveText(YOUTUBE_TEST_WORDS.offline)

  await page.evaluate(setOnline, true)
  await page.route(API, (r) => r.abort())
  await tap(go)
  await expect(result).toHaveAttribute('data-result', 'blocked')
  await expect(result).toHaveText(YOUTUBE_TEST_WORDS.blocked)

  await page.unroute(API)
  await tap(go)
  await expect(result).toHaveAttribute('data-result', 'works')
  await expect(result).toHaveText(YOUTUBE_TEST_WORDS.works)
  await assertYouTubeRules(page, 'Test YouTube')
  await checkScreen(page, 'grownup', 'Test YouTube')

  await page.evaluate(() => ((window as unknown as { __ytFakeErrors: Record<string, number> }).__ytFakeErrors = { PBhzOdOIFEY: 150 }))
  await tap(go)
  await expect(result).toHaveAttribute('data-result', 'video')
  await expect(result).toHaveText(YOUTUBE_TEST_WORDS.video)
  forget(problems)
})
