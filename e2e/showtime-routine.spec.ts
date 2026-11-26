/**
 * The Showtime routine (version 1.1), on her own track: backstage breathing with a circle (4 s in,
 * 6 s out), "I'm excited!", the walk to her spot with a countdown, the opening pose held for a spoken
 * "5, 6, 7, 8", her track from the top, the ending pose, a bow, applause, and walking off. Then one
 * thing that went well, one to work on, and Up Anyway if someone watched.
 *
 * The audience (a gentle crowd before her track, applause after it) is optional and never plays over
 * her track; nothing is spoken over it either. The walk-on and the bow can be practised on their own.
 * A grown-up chose 1 breath and a 3-second walk here, to keep the check short.
 */
import type { Page } from '@playwright/test'
import { AUDIENCE_SOUNDS } from '../src/audio/audience'
import { COUNT_IN_WORDS } from '../src/model/countin'
import { checkScreen, expect, holdGate, loadTrack, readSave, seedSave, setUpSave, tap } from './helpers'
import { nothingSpokenOverMedia, sounds, test, words } from './voice'

const TRACK_SECONDS = 10

async function stepNow(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    if (document.querySelector('.showtime-stage')) return 'track'
    return document.querySelector('.routine-stage')?.getAttribute('data-step') ?? null
  })
}

/** The audience sounds played so far (other effects, such as a celebration, are left out). */
async function audience(page: Page) {
  return (await sounds(page)).filter((p) => (AUDIENCE_SOUNDS as readonly string[]).includes(p.name))
}

async function ready(page: Page, opts: { audience?: boolean } = {}): Promise<void> {
  const save = setUpSave()
  save.showtime = { breaths: 1, walkOnSeconds: 3 }
  save.sound.audience = opts.audience ?? true
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, TRACK_SECONDS)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await tap(page.getByRole('button', { name: 'Showtime' }))
}

test('the whole routine, in order, with the audience before and after her track', async ({ page }) => {
  test.setTimeout(150_000)
  await ready(page)
  await checkScreen(page, 'kid', 'showtime start')
  await expect(page.getByRole('switch', { name: 'Audience sound' })).toHaveAttribute('aria-checked', 'true')
  await tap(page.getByRole('button', { name: 'Start' }))

  // Backstage: the breathing circle, in for 4 seconds, then out.
  await expect(page.locator('.routine-stage[data-step="breathe"]')).toBeVisible()
  const circle = page.locator('.breath-circle')
  await expect(circle).toHaveAttribute('data-phase', 'in')
  const inAt = Date.now()
  await checkScreen(page, 'kid', 'backstage breathing')
  await expect(circle).toHaveAttribute('data-phase', 'out', { timeout: 6000 })
  expect(Date.now() - inAt).toBeGreaterThan(3000)
  expect(Date.now() - inAt).toBeLessThan(5500)

  const seen: string[] = []
  let trackAt = 0
  let trackEndAt = 0
  const t0 = Date.now()
  while (Date.now() - t0 < 90_000) {
    const s = await stepNow(page)
    if (s && seen[seen.length - 1] !== s) {
      seen.push(s)
      if (s === 'track') trackAt = await page.evaluate(() => Date.now())
      if (s !== 'track' && seen.includes('track') && !trackEndAt) trackEndAt = await page.evaluate(() => Date.now())
      if (s !== 'track') await checkScreen(page, 'kid', `routine: ${s}`)
    }
    if (await page.locator('.reflect').isVisible()) break
    await page.waitForTimeout(100)
  }
  expect(seen).toEqual(['breathe', 'excited', 'walk', 'pose', 'track', 'endPose', 'bow', 'applause', 'walkOff'])

  // What she heard: "I'm excited", the walk, the opening pose and its count, then the bow.
  const said = await words(page)
  const at = (re: RegExp) => said.findIndex((w) => re.test(w))
  expect(at(/excited/i)).toBeGreaterThanOrEqual(0)
  expect(at(/walk to your spot/i)).toBeGreaterThan(at(/excited/i))
  expect(at(/opening pose/i)).toBeGreaterThan(at(/walk to your spot/i))
  const counted = said.slice(at(/opening pose/i) + 1, at(/opening pose/i) + 5)
  expect(counted).toEqual(COUNT_IN_WORDS)
  expect(at(/bow/i)).toBeGreaterThan(at(/opening pose/i))
  expect(await nothingSpokenOverMedia(page)).toEqual([])

  // The crowd before her track, the applause after it, nothing during it.
  const played = await audience(page)
  expect(played.map((p) => p.name)).toEqual(['crowd', 'applause'])
  expect(played[0].at).toBeLessThan(trackAt)
  expect(played[1].at).toBeGreaterThanOrEqual(trackEndAt - 50)

  // Afterwards, as before, and Up Anyway if someone watched.
  const reflect = page.locator('.reflect')
  await expect(reflect).toBeVisible()
  await tap(page.getByRole('radiogroup', { name: 'One thing that went well' }).getByRole('radio').first())
  await tap(reflect.getByRole('button', { name: 'Next' }))
  await tap(page.getByRole('radiogroup', { name: 'One thing to work on next' }).getByRole('radio').first())
  await tap(reflect.getByRole('button', { name: 'Save' }))
  await expect(page.locator('.reflect-saved')).toBeVisible()
  await tap(page.getByRole('button', { name: 'Someone watched me' }))
  await expect(page.locator('a.upanyway-link')).toHaveAttribute('href', (await readSave(page)).settings.upAnywayUrl)
  await checkScreen(page, 'kid', 'showtime after')
})

test('the walk-on and the bow on their own; no audience when it is switched off', async ({ page }) => {
  test.setTimeout(120_000)
  await ready(page, { audience: false })
  await expect(page.getByRole('switch', { name: 'Audience sound' })).toHaveAttribute('aria-checked', 'false')

  // The walk-on: the countdown to her spot, then the opening pose and its count. No music.
  await tap(page.getByRole('button', { name: 'Practise the walk-on' }))
  await expect(page.locator('.routine-stage[data-step="walk"]')).toBeVisible()
  await expect(page.locator('.walk-count')).toHaveText('3')
  await expect(page.locator('.routine-stage[data-step="pose"]')).toBeVisible({ timeout: 6000 })
  await expect.poll(async () => (await words(page)).filter((w) => COUNT_IN_WORDS.includes(w)).length).toBe(4)
  await expect(page.locator('.routine-done')).toBeVisible({ timeout: 8000 })
  expect(await page.evaluate(() => document.querySelector<HTMLAudioElement>('audio.track-audio')?.paused ?? true)).toBe(true)
  await checkScreen(page, 'kid', 'walk-on done')

  // The bow: ending pose, bow, applause, walk off.
  await tap(page.getByRole('button', { name: 'Practise the bow' }))
  const seen: string[] = []
  const t0 = Date.now()
  while (Date.now() - t0 < 30_000 && !(await page.locator('.routine-done').isVisible())) {
    const s = await stepNow(page)
    if (s && seen[seen.length - 1] !== s) seen.push(s)
    await page.waitForTimeout(100)
  }
  expect(seen).toEqual(['endPose', 'bow', 'applause', 'walkOff'])
  expect(await audience(page)).toEqual([])

  // Switching the audience on is remembered.
  await tap(page.getByRole('switch', { name: 'Audience sound' }))
  await expect.poll(async () => (await readSave(page)).sound.audience).toBe(true)
  await tap(page.getByRole('button', { name: 'Practise the bow' }))
  await expect.poll(async () => (await audience(page)).map((s) => s.name), { timeout: 15_000 }).toEqual(['applause'])
})
