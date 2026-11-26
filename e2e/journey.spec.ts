/**
 * The whole journey on a fresh iPad, by touch: the grown-ups' press-and-hold, setting the show and
 * plan, loading her track from Files, the default videos, a section with placeholder lines (one
 * Korean line with a meaning), marking it on her track and on a video by tapping while each plays,
 * nudging, tap-along at 75%, tap tempo, handing over, today's plan, the first rap step at 75%, the
 * next step on her own track at 75% with pitch kept, then Showtime from the top with "keep going"
 * and her two reflections.
 */
import { DEFAULT_REFS } from '../src/content/references'
import { addDays } from '../src/model/dates'
import { ROUTINE_AFTER_MS, routineBeforeMaxMs } from '../src/model/routine'
import { defaultShowtime } from '../src/storage/schema'
import { lyricLine, meaningLine } from '../tests/fixtures/placeholders'
import {
  TRACK_FILE,
  assertYouTubeRules,
  checkScreen,
  expect,
  expectRoute,
  holdGate,
  press,
  readSave,
  routeOf,
  tap,
  test,
  today,
  trackAudio,
  typeInto,
  typeLines,
  typeMeaning,
  wakeLock,
  wav,
  ytPlayers,
} from './helpers'

const SECTION = 'Verse 1'
const TRACK_SECONDS = 12

test('from first launch to Showtime', async ({ page }) => {
  test.setTimeout(300_000)

  // 1. First launch: a welcome for her, and the grown-ups' gate. A quick tap doesn't open it.
  await page.goto('./')
  await expectRoute(page, '/welcome')
  await expect(page.locator('[data-screen="welcome"]')).toBeVisible()
  await checkScreen(page, 'kid', 'welcome')
  await press(page.locator('.gate-hold'), 300)
  await page.waitForTimeout(600)
  await expectRoute(page, '/welcome')
  await holdGate(page)
  await checkScreen(page, 'grownup', 'grown-ups home')

  // 2. Show and plan.
  await tap(page.getByRole('button', { name: 'Show and plan' }))
  await expectRoute(page, '/grownups/plan')
  const form = page.locator('form.plan-form')
  await typeInto(form.locator('[name="performerName"]'), 'Performer')
  await typeInto(form.locator('[name="showName"]'), 'Showcase')
  await form.locator('[name="showDate"]').fill(addDays(today(), 30))
  await form.locator('[name="holidayStart"]').fill(addDays(today(), 12))
  await expect(form.locator('[name="schoolMinutes"]')).toHaveValue('45')
  await expect(form.locator('[name="holidayMinutes"]')).toHaveValue('120')
  await checkScreen(page, 'grownup', 'show and plan')
  await tap(form.getByRole('button', { name: 'Save plan' }))
  await expect(page.locator('.saved-note')).toBeVisible()
  let save = await readSave(page)
  expect(save.show).toEqual({ name: 'Showcase', date: addDays(today(), 30) })
  expect(save.plan?.startDate).toBe(today())
  expect(save.plan?.holidayStart).toBe(addDays(today(), 12))
  expect(save.setup.complete).toBe(true)
  // Storage is asked to persist, once.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __persist: { calls: number } }).__persist.calls)).toBe(1)
  await tap(page.getByRole('button', { name: 'Done' }))
  await expectRoute(page, '/grownups')

  // 3. Her track, from Files.
  await tap(page.getByRole('button', { name: 'Her track' }))
  await expectRoute(page, '/grownups/track')
  await page.locator('input[type="file"][name="track"]').setInputFiles({ name: TRACK_FILE, mimeType: 'audio/wav', buffer: wav(TRACK_SECONDS) })
  await expect(page.locator('.track-file')).toContainText(TRACK_FILE)
  save = await readSave(page)
  expect(save.track.mediaId).not.toBeNull()
  expect(save.track.duration).toBeCloseTo(TRACK_SECONDS, 0)
  await checkScreen(page, 'grownup', 'her track')
  await tap(page.getByRole('button', { name: 'Done' }))

  // 4. The default videos are all there.
  await tap(page.getByRole('button', { name: 'Videos' }))
  await expectRoute(page, '/grownups/refs')
  await expect(page.locator('.ref-row')).toHaveCount(DEFAULT_REFS.length)
  for (const r of DEFAULT_REFS) await expect(page.locator(`.ref-row[data-ref-id="${r.id}"] input[name="youtubeId"]`)).toHaveValue(r.youtubeId)
  await checkScreen(page, 'grownup', 'videos')
  await tap(page.getByRole('button', { name: 'Done' }))

  // 5. A section with four placeholder lines; line 3 is Korean (by sound) with a meaning line.
  await tap(page.getByRole('button', { name: 'Sections' }))
  await expectRoute(page, '/grownups/sections')
  await typeInto(page.locator('[name="sectionName"]'), SECTION)
  await tap(page.getByRole('button', { name: 'Add section' }))
  await expectRoute(page, /^\/grownups\/section\/[\w-]+$/)
  const sectionId = routeOf(page).split('/').pop()!
  await typeLines(page.locator('[name="bulkLines"]'), [1, 2, 3, 4].map((n) => lyricLine(n, SECTION)))
  await tap(page.getByRole('button', { name: 'Add these lines' }))
  const rows = page.locator('.line-row')
  await expect(rows).toHaveCount(4)
  await rows.nth(2).locator('select[name="lang"]').selectOption('ko')
  await typeMeaning(rows.nth(2).locator('[name="meaning"]'), meaningLine(3, SECTION))
  await expect.poll(async () => (await readSave(page)).sections[0]?.lines.map((l) => [l.lyric, l.lang, l.meaning])).toEqual([
    [lyricLine(1, SECTION), 'en', ''],
    [lyricLine(2, SECTION), 'en', ''],
    [lyricLine(3, SECTION), 'ko', meaningLine(3, SECTION)],
    [lyricLine(4, SECTION), 'en', ''],
  ])
  await checkScreen(page, 'grownup', 'section editor')

  // 6. Mark it on her track by tapping while it plays, then nudge.
  await page.locator('select[name="markSource"]').selectOption('track')
  const trackMarks = page.locator('.marks[data-source="track"]')
  await tap(trackMarks.getByRole('button', { name: 'Play' }))
  await page.waitForTimeout(1200)
  await tap(trackMarks.getByRole('button', { name: 'Mark start' }))
  await page.waitForTimeout(2600)
  await tap(trackMarks.getByRole('button', { name: 'Mark end' }))
  await tap(trackMarks.getByRole('button', { name: 'Pause' }))
  save = await readSave(page)
  const marked = save.sections[0].track
  expect(marked.start).not.toBeNull()
  expect(marked.end).not.toBeNull()
  expect(marked.start!).toBeGreaterThan(0.3)
  expect(marked.start!).toBeLessThan(2.5)
  expect(marked.end! - marked.start!).toBeGreaterThan(1.5)
  expect(marked.end! - marked.start!).toBeLessThan(4.5)
  await tap(trackMarks.getByRole('button', { name: 'Move start later by 0.1 seconds' }))
  await tap(trackMarks.getByRole('button', { name: 'Move end earlier by 0.5 seconds' }))
  save = await readSave(page)
  expect(save.sections[0].track.start).toBeCloseTo(marked.start! + 0.1, 5)
  expect(save.sections[0].track.end).toBeCloseTo(marked.end! - 0.5, 5)

  // 7. And on the listen-and-read video, the same way.
  await page.locator('select[name="markSource"]').selectOption('ref-listen')
  const refMarks = page.locator('.marks[data-source="ref-listen"]')
  await expect(refMarks.locator('iframe')).toBeVisible()
  await assertYouTubeRules(page, 'marking a video')
  await tap(refMarks.getByRole('button', { name: 'Play' }))
  await page.waitForTimeout(1000)
  await tap(refMarks.getByRole('button', { name: 'Mark start' }))
  await page.waitForTimeout(2000)
  await tap(refMarks.getByRole('button', { name: 'Mark end' }))
  await tap(refMarks.getByRole('button', { name: 'Pause' }))
  save = await readSave(page)
  const onRef = save.sections[0].refs['ref-listen']
  expect(onRef.start).not.toBeNull()
  expect(onRef.end! - onRef.start!).toBeGreaterThan(1)

  // 8. Tap-along at 75%: one tap as each line starts.
  const tapalong = page.locator('.tapalong')
  await tapalong.locator('select[name="tapSpeed"]').selectOption('0.75')
  await tap(tapalong.getByRole('button', { name: 'Start tap-along' }))
  await expect.poll(async () => (await trackAudio(page))?.rate).toBe(0.75)
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(450)
    await tap(tapalong.getByRole('button', { name: 'Next line' }))
  }
  await expect(tapalong.locator('.tapalong-done')).toBeVisible()
  save = await readSave(page)
  const times = save.sections[0].lines.map((l) => l.time)
  for (const t of times) expect(t).not.toBeNull()
  for (let i = 1; i < times.length; i++) expect(times[i]!).toBeGreaterThan(times[i - 1]!)
  await tap(page.getByRole('button', { name: 'Done' }))
  await expectRoute(page, '/grownups/sections')
  await tap(page.getByRole('button', { name: 'Done' }))
  await expectRoute(page, '/grownups')

  // 9. Tap tempo along with her track, then tap on a "1".
  await tap(page.getByRole('button', { name: 'Tempo and counts' }))
  await expectRoute(page, '/grownups/tempo')
  await tap(page.getByRole('button', { name: 'Play' }))
  for (let i = 0; i < 9; i++) {
    await page.locator('.tap-tempo').tap()
    await page.waitForTimeout(470)
  }
  await expect(page.locator('.bpm')).toHaveText(/\d{2,3}/)
  await tap(page.getByRole('button', { name: 'This is a 1' }))
  await tap(page.getByRole('button', { name: 'Pause' }))
  save = await readSave(page)
  expect(save.tempo.bpm).toBeGreaterThan(90)
  expect(save.tempo.bpm).toBeLessThan(160)
  expect(save.tempo.offset).not.toBeNull()
  await checkScreen(page, 'grownup', 'tempo')
  await tap(page.getByRole('button', { name: 'Done' }))

  // 10. Hand over. Today's plan: the learning phase, warm-up first, cool-down last.
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await expectRoute(page, '/today')
  await expect(page.locator('.countdown')).toContainText('30')
  await expect(page.locator('.phase')).toBeVisible()
  const blocks = page.locator('.block')
  expect(await blocks.count()).toBeGreaterThanOrEqual(5)
  await expect(blocks.first()).toHaveAttribute('data-type', 'warmup')
  await expect(blocks.last()).toHaveAttribute('data-type', 'cooldown')
  await expect(page.locator('.block[data-type="rap"]').first()).toBeVisible()
  await expect(page.locator('.block[data-type="dance"]').first()).toBeVisible()
  await checkScreen(page, 'kid', 'today')
  expect((await wakeLock(page)).active).toBe(0)

  // 11. The rap block: the screen stays awake; the first step is "listen and read" at 75%.
  await tap(page.locator('.block[data-type="rap"]').first().getByRole('button', { name: /^Start/ }))
  await expectRoute(page, /^\/block\//)
  await expect(page.locator('.block-timer')).toBeVisible()
  await expect.poll(async () => (await wakeLock(page)).active).toBe(1)
  await checkScreen(page, 'kid', 'rap block')
  await tap(page.locator('.block-step').first())
  await expectRoute(page, `/practice/${sectionId}/rap-listen`)
  await expect(page.locator('.lyric-line')).toHaveCount(4)
  await expect(page.locator('.lyric-line').nth(0)).toContainText(lyricLine(1, SECTION))
  await expect(page.locator('.lyric-meaning')).toContainText(meaningLine(3, SECTION))
  await expect(page.locator('.counts')).toBeVisible()
  await expect(page.locator('.speed')).toContainText('75%')
  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === '6DBtz2enWSA')?.rate).toBe(0.75)
  await assertYouTubeRules(page, 'listen and read')
  await checkScreen(page, 'kid', 'listen and read')
  expect((await wakeLock(page)).active).toBe(1)
  await tap(page.getByRole('button', { name: 'I did it' }))
  // Version 1.4: "Say it with Voice guide" opens the practice room on Voice guide (no starts are tapped on it here).
  await expectRoute(page, '/room')
  await expect(page.locator('.room-sources [data-source="ref-voiceGuide"]')).toHaveAttribute('aria-checked', 'true')
  save = await readSave(page)
  expect(save.progress[sectionId].rap.done).toEqual(['rap-listen'])

  // 12. "I did it" there and on Karaoke, then "From memory, slow" over her own track at 75%, pitch
  // kept, lines lighting up in turn.
  await tap(page.getByRole('button', { name: 'I did it' }))
  await expect(page.locator('.room-sources [data-source="ref-karaoke"]')).toHaveAttribute('aria-checked', 'true')
  await tap(page.getByRole('button', { name: 'I did it' }))
  await expectRoute(page, `/practice/${sectionId}/rap-memory-75`)
  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(async () => (await trackAudio(page))?.paused).toBe(false)
  const audio = (await trackAudio(page))!
  expect(audio.rate).toBe(0.75)
  expect(audio.preservesPitch).toBe(true)
  await expect(page.locator('.lyric-line.is-active')).toHaveCount(1, { timeout: 15_000 })
  // "Again" starts the section over and records nothing.
  const before = await readSave(page)
  await tap(page.getByRole('button', { name: 'Again' }))
  await expectRoute(page, `/practice/${sectionId}/rap-memory-75`)
  expect((await readSave(page)).progress).toEqual(before.progress)
  await tap(page.getByRole('button', { name: 'Today' }))
  await expectRoute(page, '/today')
  await expect.poll(async () => (await wakeLock(page)).active).toBe(0)

  // 13. Showtime: her whole track from the top, no video, no pause; a slip gets "keep going".
  await tap(page.getByRole('button', { name: 'Showtime' }))
  await expectRoute(page, '/showtime')
  await expect(page.getByRole('switch', { name: 'Show the words' })).toBeVisible()
  await checkScreen(page, 'kid', 'showtime start')
  await tap(page.getByRole('button', { name: 'Start' }))
  // The routine comes first (backstage breathing, the walk-on, the opening pose): wait through it.
  const routineBefore = routineBeforeMaxMs(defaultShowtime())
  await expect(page.locator('.showtime-stage')).toBeVisible({ timeout: routineBefore + 10_000 })
  await expect.poll(async () => (await trackAudio(page))?.paused, { timeout: routineBefore + 10_000 }).toBe(false)
  const run = (await trackAudio(page))!
  expect(run.rate).toBe(1)
  expect(run.time).toBeLessThan(2)
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0)
  expect((await wakeLock(page)).active).toBe(1)
  await tap(page.locator('.showtime-stage'))
  await expect(page.locator('.keep-going')).toBeVisible()
  await checkScreen(page, 'kid', 'showtime running')

  // 14. When the track ends: one thing that went well, then one thing to work on next.
  const reflect = page.locator('.reflect')
  await expect(reflect).toBeVisible({ timeout: (TRACK_SECONDS + 10) * 1000 + ROUTINE_AFTER_MS })
  await checkScreen(page, 'kid', 'showtime reflect')
  await tap(page.getByRole('radiogroup', { name: 'One thing that went well' }).getByRole('radio').first())
  await tap(reflect.getByRole('button', { name: 'Next' }))
  await tap(page.getByRole('radiogroup', { name: 'One thing to work on next' }).getByRole('radio').first())
  await tap(reflect.getByRole('button', { name: 'Save' }))
  await expect(page.locator('.reflect-saved')).toBeVisible()
  save = await readSave(page)
  expect(save.reflections).toHaveLength(1)
  expect(save.reflections[0].kind).toBe('showtime')
  expect(save.reflections[0].target).toBe('run')
  expect(save.reflections[0].wentWell).not.toBe('')
  expect(save.reflections[0].workOn).not.toBe('')
})
