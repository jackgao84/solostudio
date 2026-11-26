/**
 * Setup as a wizard (version 1.2), by touch, at iPad sizes:
 *  - a fresh iPad: three steps (her track, all her lines in one box, a tap as each section starts on
 *    one play of her track) and she can practise; nothing else is required;
 *  - it can be paused and picked up again where it was left;
 *  - the optional steps: the mirrored follow-along tapped the same way, line timing spread evenly,
 *    the beat worked out from her track and checked against a click (half, double, nudge; no tapping
 *    by hand), and the dates, minutes and her walk-on time.
 */
import { addDays } from '../src/model/dates'
import { lyricLine, meaningLine } from '../tests/fixtures/placeholders'
import { TRACK_FILE, checkScreen, expect, expectRoute, holdGate, readSave, seedSave, setUpSave, tap, test, today, typeInto, wav } from './helpers'
import { sounds } from './voice'

const BOX = ['[Verse 1]', lyricLine(1, 'Verse 1'), lyricLine(2, 'Verse 1'), `= ${meaningLine(2, 'Verse 1')}`, lyricLine(3, 'Verse 1'), lyricLine(4, 'Verse 1')].join('\n')

test('a fresh iPad: her track, her lines, the section starts, and she can practise', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('./')
  await expectRoute(page, '/welcome')
  await holdGate(page)
  await tap(page.getByRole('button', { name: /^Set up/ }))
  await expectRoute(page, '/grownups/setup')
  const steps = page.locator('.wizard-step')
  await expect(steps).toHaveCount(7)
  for (const s of ['track', 'lines', 'starts']) await expect(page.locator(`.wizard-step[data-step="${s}"]`)).toHaveAttribute('data-required', 'true')
  await expect(page.locator('.wizard-step[data-step="track"]')).toHaveClass(/is-open/)
  await checkScreen(page, 'grownup', 'setup: her track')

  // 1. Her track.
  await page.locator('input[type="file"][name="track"]').setInputFiles({ name: TRACK_FILE, mimeType: 'audio/wav', buffer: wav(16) })
  await expect(page.locator('.wizard-step[data-step="track"]')).toHaveClass(/is-done/)
  await expect(page.locator('.wizard-step[data-step="lines"]')).toHaveClass(/is-open/)

  // 2. All her lines in one box, the format shown with placeholders; a chip adds a section name.
  const box = page.locator('textarea[name="songText"]')
  await expect(box).toHaveAttribute('placeholder', /\[Verse 1\][\s\S]*Line 1 of Verse 1[\s\S]*= /)
  await tap(page.locator('.section-chips').getByRole('button', { name: 'Chorus', exact: true }))
  await expect(box).toHaveValue(/\[Chorus\]/)
  await box.fill(`${BOX}\n[Chorus]\n${lyricLine(1, 'Chorus')}\n${lyricLine(2, 'Chorus')}`)
  await checkScreen(page, 'grownup', 'setup: her lines')
  await tap(page.getByRole('button', { name: 'Save her lines' }))
  await expect(page.locator('.wizard-step[data-step="lines"]')).toHaveClass(/is-done/)
  let save = await readSave(page)
  expect(save.sections.map((s) => [s.name, s.lines.length])).toEqual([
    ['Verse 1', 4],
    ['Chorus', 2],
  ])
  expect(save.sections[0].lines[1].meaning).toBe(meaningLine(2, 'Verse 1'))

  // 3. One play of her track, a tap as each section starts.
  const starts = page.locator('.wizard-step[data-step="starts"]')
  await expect(starts).toHaveClass(/is-open/)
  await tap(starts.getByRole('button', { name: 'Play her track' }))
  await page.waitForTimeout(1000)
  await tap(starts.getByRole('button', { name: 'Verse 1 starts now' }))
  await page.waitForTimeout(2500)
  await tap(starts.getByRole('button', { name: 'Chorus starts now' }))
  await checkScreen(page, 'grownup', 'setup: section starts')
  await expect(starts).toHaveClass(/is-done/)
  save = await readSave(page)
  const [v1, ch] = save.sections
  expect(v1.track.start!).toBeGreaterThan(0.3)
  expect(v1.track.end).toBeCloseTo(ch.track.start!, 5)
  expect(ch.track.start! - v1.track.start!).toBeGreaterThan(1.5)
  expect(ch.track.end).toBeCloseTo(16, 0)
  // Nudges afterwards move a start and the end before it together.
  await tap(starts.locator('.start-row[data-section="' + ch.id + '"]').getByRole('button', { name: 'Later by 0.1 seconds' }))
  save = await readSave(page)
  expect(save.sections[1].track.start).toBeCloseTo(ch.track.start! + 0.1, 5)
  expect(save.sections[0].track.end).toBeCloseTo(ch.track.start! + 0.1, 5)
  // The lines are spread evenly as a first guess.
  const times = save.sections[0].lines.map((l) => l.time!)
  expect(times[0]).toBeCloseTo(save.sections[0].track.start!, 5)
  for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1])

  // Usable now: nothing else is required.
  expect(save.setup.complete).toBe(true)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await expectRoute(page, '/today')
  await expect(page.getByRole('button', { name: 'Start today’s practice' })).toBeVisible()

  // Paused here: it picks up at the next step.
  await page.reload()
  await holdGate(page)
  await tap(page.getByRole('button', { name: /^Carry on setting up/ }))
  await expectRoute(page, '/grownups/setup')
  await expect(page.locator('.wizard-step[data-step="follow"]')).toHaveClass(/is-open/)
})

test('the optional steps: follow-along taps, the beat checked by ear, the dates and her walk-on time', async ({ page }) => {
  test.setTimeout(150_000)
  const seeded = setUpSave()
  seeded.tour.seen = true
  seeded.show = null
  seeded.plan = null
  seeded.tempo = { bpm: null, offset: null }
  for (const s of seeded.sections) s.refs = {}
  await seedSave(page, seeded)
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: /^(Set up|Carry on setting up)/ }))

  // The mirrored follow-along: one play, a tap as each section starts.
  await tap(page.locator('.wizard-step[data-step="follow"] .wizard-step__head'))
  const follow = page.locator('.wizard-step[data-step="follow"]')
  await expect(follow).toHaveClass(/is-open/)
  await expect(follow.locator('iframe')).toBeVisible()
  await tap(follow.getByRole('button', { name: 'Play the video' }))
  for (const name of ['Verse 1', 'Chorus', 'Dance Break']) {
    await page.waitForTimeout(700)
    await tap(follow.getByRole('button', { name: `${name} starts now` }))
  }
  await expect(follow).toHaveClass(/is-done/)
  let save = await readSave(page)
  for (const s of save.sections) expect(s.refs['ref-mirrored']?.start, s.name).not.toBeNull()

  // The beat: worked out from her track, checked against a click. No tapping by hand here.
  await tap(page.locator('.wizard-step[data-step="track"] .wizard-step__head'))
  await page.locator('input[type="file"][name="track"]').setInputFiles({ name: TRACK_FILE, mimeType: 'audio/wav', buffer: wav(20) })
  await tap(page.locator('.wizard-step[data-step="beat"] .wizard-step__head'))
  const beat = page.locator('.wizard-step[data-step="beat"]')
  await expect(beat.locator('.beat-bpm')).toHaveText(/^1[12]\d$/, { timeout: 30_000 })
  await expect(page.locator('.tap-tempo')).toHaveCount(0)
  const bpm = Number(await beat.locator('.beat-bpm').textContent())
  await tap(beat.getByRole('button', { name: 'Double' }))
  await expect(beat.locator('.beat-bpm')).toHaveText(String(bpm * 2))
  await tap(beat.getByRole('button', { name: 'Half' }))
  await expect(beat.locator('.beat-bpm')).toHaveText(String(bpm))
  await tap(beat.getByRole('button', { name: 'Play with a click' }))
  await expect.poll(async () => (await sounds(page)).filter((s) => s.name === 'click').length).toBeGreaterThan(2)
  await tap(beat.getByRole('button', { name: 'The 1 is later' }))
  await checkScreen(page, 'grownup', 'setup: the beat')
  await tap(beat.getByRole('button', { name: 'That’s the beat' }))
  await expect(beat).toHaveClass(/is-done/)
  save = await readSave(page)
  expect(save.tempo.bpm).toBeCloseTo(bpm, 0)
  expect(save.tempo.offset).not.toBeNull()

  // Dates, minutes and her walk-on time.
  await tap(page.locator('.wizard-step[data-step="dates"] .wizard-step__head'))
  const dates = page.locator('.wizard-step[data-step="dates"]')
  await typeInto(dates.locator('[name="showName"]'), 'Showcase')
  await dates.locator('[name="showDate"]').fill(addDays(today(), 25))
  await expect(dates.locator('[name="walkOnSeconds"]')).toHaveValue('5')
  await dates.locator('[name="walkOnSeconds"]').fill('7')
  await checkScreen(page, 'grownup', 'setup: dates')
  await tap(dates.getByRole('button', { name: 'Save dates' }))
  await expect(dates).toHaveClass(/is-done/)
  save = await readSave(page)
  expect(save.show).toEqual({ name: 'Showcase', date: addDays(today(), 25) })
  expect(save.plan?.startDate).toBe(today())
  expect(save.showtime.walkOnSeconds).toBe(7)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await expect(page.locator('.dday')).toHaveText('D-25')
})
