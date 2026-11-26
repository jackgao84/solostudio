/**
 * Fun that rewards effort only (version 1.1): her stage lighting up as she ticks steps (and fully on
 * show day), a switch-on sound and a cheer, a light stick in her colour pulsing on the beat beside the
 * 8-count (never on the video), the D-day countdown, Build the line, naming her stage and choosing its
 * colours, and confetti for her first full Showtime, once.
 */
import type { Page } from '@playwright/test'
import { assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, loadTrack, readSave, seedSave, setUpSave, tap, typeInto } from './helpers'
import { sounds, test } from './voice'

const played = async (page: Page) => (await sounds(page)).map((s) => s.name)

test('her stage lights up step by step, and completely on show day', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  save.progress['sec-1'] = {
    rap: { done: ['rap-listen', 'rap-say'], fade: 0, finishedAt: null, review: null },
    dance: { done: ['dance-watch'], fade: 0, finishedAt: null, review: null },
    together: { done: [], fade: 0, finishedAt: null, review: null },
    shaky: false,
    shakyDue: null,
  }
  await seedSave(page, save)
  await page.goto('./#/sections')
  await expect(page.locator('.rig')).toHaveCount(3)
  await expect(page.locator('.rig[data-section="sec-1"] .lamp')).toHaveCount(14)
  await expect(page.locator('.rig[data-section="sec-1"] .lamp.is-on')).toHaveCount(3)
  await expect(page.locator('.rig[data-section="sec-2"] .lamp.is-on')).toHaveCount(0)
  await checkScreen(page, 'kid', 'her stage')
  const text = await page.locator('[data-screen="sections"]').innerText()
  expect(text).not.toMatch(/%|\bpoints?\b|\bstars?\b|\bscore|\bstreak|\bleader/i)

  const showDay = setUpSave({ showInDays: 0 })
  showDay.tour.seen = true
  await seedSave(page, showDay)
  await page.goto('./#/sections')
  await expect(page.locator('.rig .lamp')).toHaveCount(42)
  await expect(page.locator('.rig .lamp:not(.is-on)')).toHaveCount(0)
  await expect(page.locator('.stage-lights')).toHaveClass(/is-show-day/)
  await checkScreen(page, 'kid', 'her stage on show day')
})

test('a ticked step switches on a light with a sound; a finished ladder gets a cheer', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  save.progress['sec-1'] = {
    rap: { done: ['rap-listen', 'rap-say', 'rap-fade', 'rap-memory-75'], fade: 0, finishedAt: null, review: null },
    dance: { done: [], fade: 0, finishedAt: null, review: null },
    together: { done: [], fade: 0, finishedAt: null, review: null },
    shaky: false,
    shakyDue: null,
  }
  await seedSave(page, save)
  await page.goto('./#/practice/sec-2/rap-listen')
  await tap(page.getByRole('button', { name: 'I did it' }))
  await expectRoute(page, '/practice/sec-2/rap-say')
  await expect(page.locator('.celebrate')).toContainText('Chorus')
  await expect.poll(() => played(page)).toEqual(['light-on'])
  await checkScreen(page, 'kid', 'a light switched on')

  await page.goto('./#/practice/sec-1/rap-memory-100')
  await tap(page.getByRole('button', { name: 'I did it' }))
  await expectRoute(page, '/section/sec-1')
  await expect(page.locator('.celebrate')).toBeVisible()
  await expect.poll(() => played(page)).toEqual(['light-on', 'light-on', 'cheer'])
})

test('a light stick in her colour pulses on the beat beside the 8-count', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  save.stage.stick = 'lime'
  await seedSave(page, save)
  await page.goto('./#/practice/sec-1/dance-follow-50')
  const stick = page.locator('.counts .light-stick')
  await expect(stick).toBeVisible()
  await expect(stick).toHaveAttribute('data-colour', 'lime')
  await tap(page.getByRole('button', { name: 'Play' }))
  const beats = new Set<string>()
  for (let i = 0; i < 30 && beats.size < 3; i++) {
    beats.add((await stick.getAttribute('data-beat')) ?? '')
    await page.waitForTimeout(250)
  }
  expect(beats.size, 'the stick pulses with the count').toBeGreaterThanOrEqual(3)
  await assertYouTubeRules(page, 'light stick beside the video')
  await checkScreen(page, 'kid', 'light stick')
})

test('the D-day countdown on Today', async ({ page }) => {
  const save = setUpSave({ showInDays: 12 })
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/today')
  await expect(page.locator('.dday')).toHaveText('D-12')
  const day = setUpSave({ showInDays: 0 })
  day.tour.seen = true
  await seedSave(page, day)
  await page.goto('./#/today')
  await expect(page.locator('.dday')).toHaveText('D-DAY')
  await checkScreen(page, 'kid', 'today on show day')
})

test('build the line: shuffled word chips she taps back in order', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/section/sec-1')
  await tap(page.getByRole('button', { name: 'Build the line' }))
  await expectRoute(page, '/quiz/sec-1/build')
  await checkScreen(page, 'kid', 'build the line')
  const lines = save.sections[0].lines.map((l) => l.lyric.split(/\s+/))
  for (const [n, words] of lines.entries()) {
    const chips = page.locator('.word-chip:not(.is-placed)')
    const order = await chips.allInnerTexts()
    expect(order.length).toBe(words.length)
    expect(order).not.toEqual(words)
    // A chip that isn't next stays where it is.
    const wrongWord = order.find((w) => w !== words[0])!
    await tap(page.locator('.word-chip:not(.is-placed)', { hasText: new RegExp(`^${wrongWord}$`) }).first())
    await expect(page.locator('.built-line .built-word')).toHaveCount(0)
    for (const [i, w] of words.entries()) {
      await tap(page.locator('.word-chip:not(.is-placed)', { hasText: new RegExp(`^${w}$`) }).first())
      await expect(page.locator('.built-line .built-word')).toHaveCount(i + 1)
    }
    await expect(page.locator('.built-line')).toHaveText(words.join(' '))
    if (n < lines.length - 1) await tap(page.getByRole('button', { name: 'Next line' }))
  }
  await expect(page.locator('.all-built')).toBeVisible()
  await tap(page.getByRole('button', { name: 'I did it' }))
  await expectRoute(page, '/section/sec-1')
})

test('she names her stage and picks its colours', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/sections')
  await tap(page.getByRole('button', { name: 'Name your stage' }))
  await expectRoute(page, '/my-stage')
  await checkScreen(page, 'kid', 'my stage')
  await typeInto(page.locator('input[name="stageName"]'), 'The Glitter Stage')
  await tap(page.getByRole('radiogroup', { name: 'Stage colours' }).getByRole('radio', { name: 'Sunset' }))
  await tap(page.getByRole('radiogroup', { name: 'Light stick colour' }).getByRole('radio', { name: 'Cyan' }))
  await tap(page.getByRole('button', { name: 'Save my stage' }))
  await expectRoute(page, '/sections')
  await expect(page.locator('.stage-name')).toHaveText('The Glitter Stage')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunset')
  const after = await readSave(page)
  expect(after.stage).toEqual({ name: 'The Glitter Stage', theme: 'sunset', stick: 'cyan' })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunset')
})

test('confetti for her first full Showtime, and only the first', async ({ page }) => {
  test.setTimeout(180_000)
  const save = setUpSave()
  save.tour.seen = true
  save.showtime = { breaths: 1, walkOnSeconds: 3 }
  save.sound.audience = false
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 5)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await page.goto('./#/showtime')
  for (const first of [true, false]) {
    if (!first) await tap(page.getByRole('button', { name: 'Do another run-through' }))
    await tap(page.getByRole('button', { name: 'Start' }))
    await expect(page.locator('.reflect')).toBeVisible({ timeout: 70_000 })
    await expect(page.locator('.confetti')).toHaveCount(first ? 1 : 0)
    if (first) await checkScreen(page, 'kid', 'confetti')
    expect((await played(page)).filter((n) => n === 'confetti')).toHaveLength(1)
    expect((await readSave(page)).celebrated.firstShowtime).toBe(true)
  }
})
