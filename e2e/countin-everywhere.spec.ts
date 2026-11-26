/**
 * "A spoken 5, 6, 7, 8 before every rep" (version 1.1) also covers recording a section (she has to
 * get from the iPad to her spot) and counts from memory: the count comes first, then the music, and
 * a recording starts with the music, after the count. Nothing is spoken over media.
 */
import { COUNT_IN_WORDS } from '../src/model/countin'
import { expect, holdGate, loadTrack, seedSave, setUpSave, tap } from './helpers'
import { nothingSpokenOverMedia, spoken, test } from './voice'

const counts = async (page: import('@playwright/test').Page) => (await spoken(page)).filter((u) => COUNT_IN_WORDS.includes(u.text))

test('recording a section starts with a count-in, then the music and the recording together', async ({ page }) => {
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
  await expect(page.locator('.count-in')).toBeVisible()
  await expect(page.locator('.rec-dot')).toHaveCount(0)
  await expect.poll(async () => (await counts(page)).map((u) => u.text)).toEqual(COUNT_IN_WORDS)
  await expect(page.locator('.rec-dot')).toBeVisible()
  await expect.poll(() => page.evaluate(() => !document.querySelector<HTMLAudioElement>('audio.track-audio')!.paused)).toBe(true)
  const startedAt = await page.evaluate(() => performance.now())
  expect((await counts(page)).at(-1)!.at).toBeLessThan(startedAt)
  await tap(page.getByRole('button', { name: 'Stop' }))
  await expect(page.locator('[data-view="review"]')).toBeVisible()
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('counts from memory starts with a count-in too', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/quiz/sec-1/counts')
  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(async () => (await counts(page)).length).toBe(4)
  await expect
    .poll(() =>
      page.evaluate(() => ((window as unknown as { __ytFake?: { players: { destroyed: boolean; playing: boolean }[] } }).__ytFake?.players ?? []).some((p) => !p.destroyed && p.playing)),
    )
    .toBe(true)
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})
