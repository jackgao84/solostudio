/**
 * The listening run (version 1.1): on a light day, a block where her track plays from the top with
 * the lyrics hidden while she imagines performing it, eyes closed. A cue says to close her eyes before
 * the music and to open them after it; nothing is said while it plays. Not on other days.
 */
import { checkScreen, expect, expectRoute, holdGate, loadTrack, seedSave, setUpSave, tap } from './helpers'
import { nothingSpokenOverMedia, test, words } from './voice'

test('a light day has a listening run: eyes closed, no words on screen, her whole track', async ({ page }) => {
  test.setTimeout(120_000)
  await seedSave(page, setUpSave({ lightToday: true }))
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 10)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  const block = page.locator('.block[data-type="listen"]')
  await expect(block).toHaveCount(1)
  await expect(block.locator('.block__title')).toHaveText('Listening run')
  await expect(block.locator('.headset-note')).toHaveCount(0)
  await tap(block.getByRole('button', { name: /^Start/ }))
  await expectRoute(page, /^\/block\/.+-listen$/)
  await checkScreen(page, 'kid', 'listening run')

  await tap(page.getByRole('button', { name: 'Play your track' }))
  await expect.poll(() => words(page)).toEqual([expect.stringMatching(/close your eyes/i)])
  await expect.poll(() => page.evaluate(() => !document.querySelector<HTMLAudioElement>('audio.track-audio')!.paused), { timeout: 10_000 }).toBe(true)
  expect(await page.evaluate(() => document.querySelector<HTMLAudioElement>('audio.track-audio')!.currentTime)).toBeLessThan(2)
  await expect(page.locator('.listen-eyes')).toBeVisible()
  await expect(page.locator('.lyric-line, .lyrics, .showtime-lyric')).toHaveCount(0)
  await checkScreen(page, 'kid', 'listening run playing')

  await expect(page.locator('.listen-done')).toBeVisible({ timeout: 20_000 })
  await expect.poll(() => words(page)).toEqual([expect.stringMatching(/close your eyes/i), expect.stringMatching(/open your eyes/i)])
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('no listening run on an ordinary day', async ({ page }) => {
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await expect(page.locator('.block').first()).toBeVisible()
  await expect(page.locator('.block[data-type="listen"]')).toHaveCount(0)
})
