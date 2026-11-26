/**
 * Ease of use (version 1.1). She is across the room dancing, so:
 * - Today has one big "Start today's practice" that walks through the day's blocks, saying what's
 *   next ("Next: Verse 1, Rap, 75% speed") in the iPad's English voice.
 * - Every rep starts with a spoken "5, 6, 7, 8"; reps loop on their own (a short pause, a fresh
 *   count-in) until she taps I did it, Next or Pause. Those buttons are big enough to hit from a step
 *   away. Nothing is ever spoken over her track or a video.
 * - Spoken cues and sound effects have their own volume and mute (Today → Sounds).
 * - A 30-second tour for her on first run, offered on Today and never in the way.
 */
import type { Page } from '@playwright/test'
import { COUNT_IN_WORDS } from '../src/model/countin'
import { planDay, planInputFrom } from '../src/model/plan'
import { cueFor, sessionItems } from '../src/model/session'
import { checkScreen, expect, expectRoute, readSave, seedSave, setUpSave, tap, today } from './helpers'
import { nothingSpokenOverMedia, sounds, spoken, test, words } from './voice'

/** Main buttons she taps from a step away. */
const BIG_PX = 88

async function fakeSeeks(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const fake = (window as unknown as { __ytFake?: { players: { destroyed: boolean; seeks: number[] }[] } }).__ytFake
    return (fake?.players ?? []).filter((p) => !p.destroyed).flatMap((p) => p.seeks)
  })
}
async function anyPlaying(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const fake = (window as unknown as { __ytFake?: { players: { destroyed: boolean; playing: boolean }[] } }).__ytFake
    return (fake?.players ?? []).some((p) => !p.destroyed && p.playing)
  })
}
const countWords = async (page: Page) => (await words(page)).filter((w) => COUNT_IN_WORDS.includes(w)).length

test('one big Start walks through the day, with cues, count-ins and reps that loop', async ({ page }) => {
  test.setTimeout(180_000)
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/today')
  const day = planDay(planInputFrom(save)!, today())!
  const items = sessionItems(save, day, today())

  // One main action on Today.
  const start = page.getByRole('button', { name: 'Start today’s practice' })
  await expect(start).toBeVisible()
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(BIG_PX)
  await expect(page.locator('[data-screen="today"] .btn--primary')).toHaveCount(1)

  // The warm-up: said out loud, its steps on screen, a big Next.
  await tap(start)
  await expectRoute(page, /^\/block\//)
  await expect.poll(() => words(page)).toEqual([cueFor(items[0], save)])
  await expect(page.locator('.routine-step').first()).toBeVisible()
  const next = page.getByRole('button', { name: 'Next', exact: true })
  expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(BIG_PX)
  await checkScreen(page, 'kid', 'session: warm-up')

  // The next item is practice: its cue, then 5, 6, 7, 8, then the music, all by itself.
  await tap(next)
  const p1 = items[1]
  expect(p1.kind).toBe('practice')
  if (p1.kind !== 'practice') return
  await expectRoute(page, `/practice/${p1.sectionId}/${p1.stepId}`)
  await expect.poll(() => countWords(page)).toBe(4)
  const said = await words(page)
  expect(said.slice(1, 6)).toEqual([cueFor(p1, save), ...COUNT_IN_WORDS])
  await expect.poll(() => anyPlaying(page)).toBe(true)
  for (const name of ['Pause', 'Next', 'I did it']) {
    const b = page.getByRole('button', { name, exact: true })
    await expect(b).toBeVisible()
    expect((await b.boundingBox())!.height, name).toBeGreaterThanOrEqual(BIG_PX)
  }
  await checkScreen(page, 'kid', 'session: practice')

  // When the rep ends: a short pause, a fresh count-in, and the same part again.
  const seeksBefore = (await fakeSeeks(page)).length
  await expect.poll(() => countWords(page), { timeout: 40_000 }).toBe(8)
  await expect.poll(() => anyPlaying(page)).toBe(true)
  expect((await fakeSeeks(page)).length).toBeGreaterThan(seeksBefore)

  // Pause: the music stops and nothing more is said until she plays again.
  await tap(page.getByRole('button', { name: 'Pause', exact: true }))
  await expect.poll(() => anyPlaying(page)).toBe(false)
  const quiet = (await spoken(page)).length
  await page.waitForTimeout(3000)
  expect((await spoken(page)).length).toBe(quiet)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()

  // Next: on to the next item without ticking anything.
  const before = (await readSave(page)).progress
  await tap(page.getByRole('button', { name: 'Next', exact: true }))
  await expect.poll(async () => (await words(page)).includes(cueFor(items[2], save))).toBe(true)
  expect((await readSave(page)).progress).toEqual(before)

  // I did it: ticks the rung and moves on.
  const p2 = items[2]
  if (p2.kind === 'practice') {
    await expectRoute(page, `/practice/${p2.sectionId}/${p2.stepId}`)
    await tap(page.getByRole('button', { name: 'I did it', exact: true }))
    await expect.poll(async () => (await readSave(page)).progress[p2.sectionId]?.[p2.stepId.split('-')[0] as 'rap' | 'dance' | 'together']?.done ?? []).toContain(p2.stepId)
    await expect.poll(async () => (await words(page)).includes(cueFor(items[3], save))).toBe(true)
  }
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('reps loop on their own outside the session too, with a count-in before every one', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/practice/sec-1/rap-say')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(() => countWords(page)).toBe(4)
  await expect.poll(() => anyPlaying(page)).toBe(true)
  await expect.poll(() => countWords(page), { timeout: 40_000 }).toBe(8)
  await expect.poll(() => anyPlaying(page)).toBe(true)
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('spoken cues and sound effects each have their own volume and mute', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/today')
  await tap(page.getByRole('button', { name: 'Sounds' }))
  await expectRoute(page, '/sounds')
  await checkScreen(page, 'kid', 'sounds')

  const voice = page.locator('.sound-card[data-sound="voice"]')
  const effects = page.locator('.sound-card[data-sound="effects"]')
  await tap(voice.getByRole('button', { name: 'Quieter' }))
  await tap(voice.getByRole('button', { name: 'Try it' }))
  await expect.poll(async () => (await spoken(page)).at(-1)?.volume).toBeCloseTo(0.8, 5)
  await tap(effects.getByRole('button', { name: 'Louder' }))
  await expect.poll(async () => (await readSave(page)).sound.effectsVolume).toBeCloseTo(0.8, 5)
  await tap(effects.getByRole('button', { name: 'Try it' }))
  await expect.poll(async () => (await sounds(page)).at(-1)?.volume).toBeCloseTo(0.8, 5)

  // Muted: nothing is said, but the count-in still shows on screen.
  await tap(voice.getByRole('switch', { name: 'Spoken cues' }))
  await tap(effects.getByRole('switch', { name: 'Sound effects' }))
  const saved = await readSave(page)
  expect([saved.sound.voiceOn, saved.sound.effectsOn]).toEqual([false, false])
  const heard = (await spoken(page)).length
  const played = (await sounds(page)).length
  await tap(effects.getByRole('button', { name: 'Try it' }))
  await page.goto('./#/practice/sec-1/rap-say')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect(page.locator('.count-in')).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => anyPlaying(page), { timeout: 10_000 }).toBe(true)
  expect((await spoken(page)).length).toBe(heard)
  expect((await sounds(page)).length).toBe(played)
})

test('a 30-second tour for her on first run, offered on Today and never in the way', async ({ page }) => {
  test.setTimeout(90_000)
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  const card = page.locator('.tour-card')
  await expect(card).toBeVisible()
  await expect(page.locator('.block').first()).toBeVisible()
  await checkScreen(page, 'kid', 'today with the tour offered')
  await tap(card.getByRole('button', { name: 'Take the tour' }))
  await expectRoute(page, '/tour')
  await checkScreen(page, 'kid', 'tour')

  // It moves on by itself and lasts about 30 seconds.
  const slides = page.locator('.tour-slide')
  const first = await slides.getAttribute('data-slide')
  const t0 = Date.now()
  await expect(slides).not.toHaveAttribute('data-slide', first!, { timeout: 10_000 })
  await expect(page.locator('.tour-end')).toBeVisible({ timeout: 40_000 })
  expect(Date.now() - t0).toBeGreaterThan(20_000)
  expect(Date.now() - t0).toBeLessThan(38_000)
  await tap(page.getByRole('button', { name: 'Let’s go' }))
  await expectRoute(page, '/today')
  await expect(card).toHaveCount(0)
  expect((await readSave(page)).tour.seen).toBe(true)

  // "Not now" puts it away for good too.
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await tap(page.locator('.tour-card').getByRole('button', { name: 'Not now' }))
  await expect(page.locator('.tour-card')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.block').first()).toBeVisible()
  await expect(page.locator('.tour-card')).toHaveCount(0)
})
