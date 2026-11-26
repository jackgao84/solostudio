/**
 * Filming with time to get ready (version 1.2), in WebKit:
 *  - recording a section: "Get to your spot" in the coach's voice with a visible countdown of the
 *    walk-on time (5 seconds by default), then "5, 6, 7, 8", then the recording and her track start
 *    together. Nothing records while she is getting ready, and nothing is said over the music;
 *  - Film my Showtime: the camera films the whole show after the walk-on and the opening pose's count,
 *    and the clip is kept with her run-throughs.
 */
import { KID_COPY } from '../src/content/kid'
import { COUNT_IN_WORDS } from '../src/model/countin'
import { expect, holdGate, loadTrack, readMedia, seedSave, setUpSave, tap, trackAudio } from './helpers'
import { nothingSpokenOverMedia, spoken, test } from './voice'

test('before recording a section: get to your spot with a countdown, then 5, 6, 7, 8, then recording', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 20)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await page.goto('./#/record/sec-1')
  await tap(page.getByRole('button', { name: 'Start camera' }))
  await expect(page.locator('video.camera-preview')).toBeVisible()
  await tap(page.getByRole('button', { name: 'Record' }))

  const ready = page.locator('.get-ready')
  await expect(ready).toBeVisible()
  await expect(ready).toContainText(KID_COPY.cues.getToSpot)
  await expect(ready.locator('.walk-on-count')).toHaveText('5')
  await expect(page.locator('.rec-dot')).toHaveCount(0)
  await expect(ready.locator('.walk-on-count')).toHaveText('4')
  await expect(page.locator('.rec-dot')).toHaveCount(0)

  await expect.poll(async () => (await spoken(page)).filter((u) => COUNT_IN_WORDS.includes(u.text)).length, { timeout: 15_000 }).toBe(4)
  await expect(page.locator('.rec-dot')).toBeVisible()
  await expect.poll(async () => (await trackAudio(page))?.paused).toBe(false)
  const said = await spoken(page)
  const cue = said.find((u) => u.text === KID_COPY.cues.getToSpot)!
  expect(cue.clip).toBe(true)
  const counts = said.filter((u) => COUNT_IN_WORDS.includes(u.text))
  expect(counts[0].at - cue.at).toBeGreaterThanOrEqual(4500)
  await tap(page.getByRole('button', { name: 'Stop' }))
  await expect(page.locator('[data-view="review"]')).toBeVisible()
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('Film my Showtime: filmed after the walk-on and the count, kept with her run-throughs', async ({ page }) => {
  test.setTimeout(120_000)
  const save = setUpSave()
  save.tour.seen = true
  save.showtime = { breaths: 1, walkOnSeconds: 3 }
  save.sound.audience = false
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 6)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await page.goto('./#/showtime')

  const film = page.getByRole('switch', { name: KID_COPY.showtime.film })
  await expect(film).toHaveAttribute('aria-checked', 'false')
  await tap(film)
  await expect(film).toHaveAttribute('aria-checked', 'true')
  await tap(page.getByRole('button', { name: 'Start', exact: true }))
  await expect.poll(() => page.evaluate(() => (window as unknown as { __camera: { constraints: unknown[] } }).__camera.constraints.length)).toBe(1)

  // The walk-on: nothing is filmed yet.
  await expect(page.locator('.routine-stage[data-step="walk"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.rec-dot')).toHaveCount(0)
  // Her track: filming.
  await expect.poll(async () => (await trackAudio(page))?.paused, { timeout: 30_000 }).toBe(false)
  await expect(page.locator('.rec-dot')).toBeVisible()

  await expect(page.locator('.reflect')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.film-saved')).toContainText('My clips')
  await expect.poll(async () => (await readMedia(page)).filter((m) => m.kind === 'clip').map((m) => m.group)).toEqual(['run'])
  await expect.poll(() => page.evaluate(() => (window as unknown as { __camera: { stopped: number } }).__camera.stopped)).toBeGreaterThan(0)
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})
