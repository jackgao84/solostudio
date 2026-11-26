/**
 * Practising a section: lines lighting up in time with the player at 75%, the fade-out step, breath
 * marks, from-memory steps with a peek, the dance steps (tutorial, mirrored follow-along at 50%, from
 * memory with her track only), the together ladder linked with the section before, the quick tests,
 * and marking a section shaky. Her track is a YouTube stand-in here (as before a grown-up loads it).
 */
import { LINE_LEAD, activeLine, lineStarts } from '../src/model/sync'
import { PRE_ROLL } from '../src/model/timing'
import { lyricLine } from '../tests/fixtures/placeholders'
import {
  COUNT_MIN_FONT_PX,
  LYRIC_MIN_FONT_PX,
  assertYouTubeRules,
  checkScreen,
  expect,
  expectRoute,
  readSave,
  seedSave,
  setUpSave,
  tap,
  test,
  ytPlayers,
} from './helpers'

const STAND_IN = 'JSFG-IE8n_c'

test.beforeEach(async ({ page }) => {
  await seedSave(page, setUpSave())
})

test('lines light up in time with the player at 75%', async ({ page }) => {
  const save = setUpSave()
  const section = save.sections[0]
  // Version 1.4: "Say it with the words" plays Voice guide; "From memory, slow" still plays the stand-in at 75%.
  await page.goto('./#/practice/sec-1/rap-memory-75')
  await expect(page.locator('.lyric-line')).toHaveCount(4)
  await expect(page.locator('.speed')).toContainText('75%')
  const lyricPx = await page.locator('.lyric-line').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(lyricPx).toBeGreaterThanOrEqual(LYRIC_MIN_FONT_PX)
  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === STAND_IN)?.rate).toBe(0.75)
  const players = await ytPlayers(page)
  expect(players.find((p) => p.videoId === STAND_IN)!.vars.playsinline).toBe(1)
  const starts = lineStarts(section.lines.map((l) => l.time), { start: section.track.start!, end: section.track.end! })!
  let checked = 0
  let off = 0
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(450)
    const sample = await page.evaluate((id) => {
      const fake = (window as unknown as { __ytFake: { players: { videoId: string; destroyed: boolean; playing: boolean; pos: number; base: number; rate: number }[] } }).__ytFake
      const p = fake.players.find((x) => x.videoId === id && !x.destroyed)!
      const t = p.playing ? p.pos + ((performance.now() - p.base) / 1000) * p.rate : p.pos
      const el = document.querySelector('.lyric-line.is-active')
      return { t, active: el ? Number(el.getAttribute('data-index')) : -1 }
    }, STAND_IN)
    const expected = activeLine(starts, sample.t, 0.75)
    checked++
    if (sample.active !== expected) {
      off++
      // Only a frame either side of a line change may disagree.
      const near = starts.some((s) => Math.abs(s - LINE_LEAD * 0.75 - sample.t) < 0.1)
      expect(near, `line ${sample.active} lit at ${sample.t.toFixed(2)} s; expected ${expected}`).toBe(true)
    }
  }
  expect(checked).toBe(14)
  expect(off).toBeLessThanOrEqual(2)
  await expect(page.locator('.lyric-line.is-active')).toHaveCount(1)
  await assertYouTubeRules(page, 'say it with the words')
})

test('the fade-out step hides a few words at a time until she has it from memory', async ({ page }) => {
  await page.goto('./#/practice/sec-1/rap-fade')
  const hidden = page.locator('.lyrics .word.is-hidden')
  await expect(page.locator('.lyrics .word').first()).toBeVisible()
  await expect(hidden).toHaveCount(0)
  let last = 0
  for (let round = 0; round < 12 && (await page.locator('.lyrics .word:not(.is-hidden)').count()) > 0; round++) {
    await tap(page.getByRole('button', { name: 'I did it' }))
    await expect.poll(() => hidden.count()).toBeGreaterThan(last)
    const now = await hidden.count()
    // A few at a time: at most 3 more per line (4 lines).
    expect(now - last).toBeLessThanOrEqual(12)
    last = now
  }
  expect(await page.locator('.lyrics .word:not(.is-hidden)').count()).toBe(0)
  await expectRoute(page, '/practice/sec-1/rap-fade')
  await tap(page.getByRole('button', { name: 'I did it' }))
  await expectRoute(page, '/practice/sec-1/rap-memory-75')
  expect((await readSave(page)).progress['sec-1'].rap.done).toContain('rap-fade')
})

test('from memory: the words are hidden, and a peek shows them for a moment', async ({ page }) => {
  await page.goto('./#/practice/sec-1/rap-memory-100')
  await expect(page.locator('.speed')).toContainText('100%')
  const shown = page.locator('.lyrics .word:not(.is-hidden)')
  await expect(page.locator('.lyrics .word').first()).toBeAttached()
  await expect(shown).toHaveCount(0)
  await tap(page.getByRole('button', { name: 'Peek' }))
  await expect.poll(() => shown.count()).toBeGreaterThan(0)
  await expect.poll(() => shown.count(), { timeout: 8000 }).toBe(0)
})

test('she marks where to breathe by tapping between words', async ({ page }) => {
  await page.goto('./#/practice/sec-1/rap-say')
  const before = (await readSave(page)).sections[0].lines[1].breaths
  expect(before).toEqual([])
  await tap(page.getByRole('switch', { name: 'Mark breaths' }))
  const gaps = page.locator('.lyric-line[data-index="1"] .gap')
  await expect(gaps).toHaveCount(4)
  await checkScreen(page, 'kid', 'marking breaths')
  await tap(gaps.nth(2))
  await expect(page.locator('.lyric-line[data-index="1"] .breath')).toHaveCount(1)
  await expect.poll(async () => (await readSave(page)).sections[0].lines[1].breaths).toEqual([2])
  await tap(gaps.nth(2))
  await expect.poll(async () => (await readSave(page)).sections[0].lines[1].breaths).toEqual([])
  await tap(page.getByRole('switch', { name: 'Mark breaths' }))
  await expect(page.locator('.gap')).toHaveCount(0)
  // The seeded breath on line 1 still shows.
  await expect(page.locator('.lyric-line[data-index="0"] .breath')).toHaveCount(1)
})

test('dance: the tutorial part, then the mirrored video at 50%, then from memory with her track only', async ({ page }) => {
  await page.goto('./#/practice/sec-1/dance-watch')
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['FIl3O1uBjQQ'])
  await expect(page.locator('.counts')).toHaveCount(0)
  await assertYouTubeRules(page, 'tutorial')

  await page.goto('./#/practice/sec-1/dance-follow-50')
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['PBhzOdOIFEY'])
  await expect(page.locator('.speed')).toContainText('50%')
  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(async () => (await ytPlayers(page))[0]?.rate).toBe(0.5)
  await expect(page.locator('.counts')).toBeVisible()
  const nowPx = await page.locator('.counts .count').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(nowPx).toBeGreaterThanOrEqual(COUNT_MIN_FONT_PX)
  await expect(page.locator('.counts .count.is-now')).toHaveCount(1)
  await assertYouTubeRules(page, 'mirrored follow-along')
  await checkScreen(page, 'kid', 'mirrored follow-along')

  await page.goto('./#/practice/sec-1/dance-memory')
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual([STAND_IN])
  await expect(page.locator('.counts')).toBeVisible()
  await expect(page.locator('.lyrics .word:not(.is-hidden)')).toHaveCount(0)
})

test('together: half energy at 75%, then linked with the section before', async ({ page }) => {
  await page.goto('./#/practice/sec-2/together-mark-75')
  await expect(page.locator('.energy')).toBeVisible()
  await expect(page.locator('.speed')).toContainText('75%')
  await expect(page.getByRole('switch', { name: 'Show the words' })).toBeVisible()

  await page.goto('./#/practice/sec-2/together-linked')
  await expect(page.locator('.link-note')).toBeVisible()
  await tap(page.getByRole('button', { name: 'Play' }))
  const save = setUpSave()
  const from = Math.max(0, save.sections[0].track.start! - PRE_ROLL)
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __ytFake: { players: { seeks: number[]; destroyed: boolean }[] } }).__ytFake.players.filter((p) => !p.destroyed).flatMap((p) => p.seeks)))).toContain(from)
})

test('quick tests: missing words, and the counts from memory', async ({ page }) => {
  await page.goto('./#/quiz/sec-1/words')
  const blanks = page.locator('.blank')
  expect(await blanks.count()).toBeGreaterThanOrEqual(4)
  await expect(page.locator('.blank.is-revealed')).toHaveCount(0)
  await tap(blanks.first())
  await expect(page.locator('.blank.is-revealed')).toHaveCount(1)
  await checkScreen(page, 'kid', 'missing words')
  await tap(page.getByRole('button', { name: 'Show all' }))
  await expect(page.locator('.blank:not(.is-revealed)')).toHaveCount(0)
  await expect(page.locator('.lyric-line').first()).toContainText(lyricLine(1, 'Verse 1'))
  await tap(page.getByRole('button', { name: 'New blanks' }))
  await expect(page.locator('.blank.is-revealed')).toHaveCount(0)

  await page.goto('./#/quiz/sec-1/counts')
  await expect(page.locator('.counts')).toHaveCount(0)
  await tap(page.getByRole('button', { name: 'Play' }))
  await tap(page.getByRole('button', { name: 'Show the counts' }))
  await expect(page.locator('.counts')).toBeVisible()
  await checkScreen(page, 'kid', 'counts from memory')
})

test('her section page: three ladders she ticks herself, and "this feels shaky"', async ({ page }) => {
  const save = setUpSave()
  save.progress['sec-1'] = { rap: { done: ['rap-listen', 'rap-say'], fade: 0, finishedAt: null, review: null }, dance: { done: [], fade: 0, finishedAt: null, review: null }, together: { done: [], fade: 0, finishedAt: null, review: null }, shaky: false, shakyDue: null }
  await seedSave(page, save)
  await page.goto('./#/sections')
  await expect(page.locator('.section-card')).toHaveCount(3)
  await checkScreen(page, 'kid', 'sections')
  await tap(page.getByRole('button', { name: 'Open Verse 1' }))
  await expectRoute(page, '/section/sec-1')
  await expect(page.locator('.ladder')).toHaveCount(3)
  await expect(page.locator('.ladder[data-ladder="rap"] .rung.is-done')).toHaveCount(2)
  await expect(page.locator('.ladder[data-ladder="dance"] .rung')).toHaveCount(5)
  await expect(page.locator('.ladder[data-ladder="together"] .rung')).toHaveCount(4)
  await checkScreen(page, 'kid', 'section')
  const text = await page.locator('[data-screen="section"]').innerText()
  expect(text).not.toMatch(/%(?! speed)|\bscore|\bpoints?\b|\bstars?\b|\bstreak/i)
  await tap(page.getByRole('switch', { name: 'This feels shaky' }))
  await expect.poll(async () => (await readSave(page)).progress['sec-1'].shaky).toBe(true)
  await tap(page.locator('.ladder[data-ladder="dance"] .rung').first())
  await expectRoute(page, '/practice/sec-1/dance-watch')
})
