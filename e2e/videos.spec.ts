/**
 * From the owner's iPad test of 1.1: videos saved under Videos never appeared in her screens, because
 * a step only played a video once that section had been marked on it. In 1.2 no step is blocked by
 * missing marks, and nothing ever tells her a grown-up must mark a video first:
 *  - a video saved in setup plays in her lesson with no section marked on it;
 *  - tutorials and the listen-and-read video play from the start, with the speed control and her own
 *    "loop this bit" buttons (tap where the loop starts and ends while it plays);
 *  - where marks exist, they cue the video to that section.
 */
import { ytPlayers, assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, seedSave, setUpSave, tap, test, typeInto } from './helpers'

const NO_MARKS = /mark .*video|mark this part on one|needs to mark/i

test('a video saved in setup plays in her lesson with no section marked on it', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  for (const s of save.sections) s.refs = {}
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Videos' }))
  await expectRoute(page, '/grownups/refs')
  const row = page.locator('.ref-row[data-ref-id="ref-mirrored"]')
  await typeInto(row.locator('input[name="youtubeId"]'), 'https://www.youtube.com/watch?v=XD00TJ-6WSw')
  await tap(row.getByRole('button', { name: 'Save' }))
  await tap(page.getByRole('button', { name: 'Done' }))
  await tap(page.getByRole('button', { name: 'Back to practice' }))

  await page.goto('./#/practice/sec-1/dance-follow-50')
  await expect(page.locator('.player-area iframe')).toBeVisible()
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toContain('XD00TJ-6WSw')
  await expect(page.locator('main')).not.toContainText(NO_MARKS)
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === 'XD00TJ-6WSw')?.playing, { timeout: 15_000 }).toBe(true)
  await assertYouTubeRules(page, 'an unmarked follow-along')
  await checkScreen(page, 'kid', 'an unmarked follow-along')
})

test('tutorials and listen-and-read play from the start with speed and her own loop', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  for (const s of save.sections) s.refs = {}
  await seedSave(page, save)

  // The listen-and-read video, unmarked: it plays, the words are there, nothing asks for marks.
  await page.goto('./#/practice/sec-1/rap-listen')
  await expect(page.locator('.player-area iframe')).toBeVisible()
  await expect(page.locator('.lyric-line')).toHaveCount(4)
  await expect(page.locator('main')).not.toContainText(NO_MARKS)

  // The tutorial, unmarked: from the start, no 8-count over it, her own loop.
  await page.goto('./#/practice/sec-2/dance-watch')
  await expect(page.locator('.player-area iframe')).toBeVisible()
  await expect(page.locator('.counts')).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText(NO_MARKS)
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  const tutorial = async () => (await ytPlayers(page)).find((p) => p.videoId === 'FIl3O1uBjQQ')
  await expect.poll(async () => (await tutorial())?.playing, { timeout: 15_000 }).toBe(true)
  await page.waitForTimeout(1200)
  await tap(page.getByRole('button', { name: 'Loop from here' }))
  await page.waitForTimeout(1500)
  await tap(page.getByRole('button', { name: 'Loop to here' }))
  await expect(page.locator('.loop-status')).toBeVisible()
  await checkScreen(page, 'kid', 'a tutorial with her own loop')
  const seeks = (await tutorial())!.seeks.length
  // It goes round: back to where the loop starts, again and again.
  await expect.poll(async () => (await tutorial())!.seeks.length, { timeout: 20_000 }).toBeGreaterThan(seeks)
  await tap(page.getByRole('button', { name: 'Stop the loop' }))
  await expect(page.locator('.loop-status')).toHaveCount(0)

  // The speed control works on it too.
  await tap(page.getByRole('button', { name: 'Slower' }))
  await expect(page.locator('.speed')).toContainText('75%')
})

test('where marks exist they simply cue the video to the section', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/practice/sec-2/dance-follow-75')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  const marked = save.sections[1].refs['ref-mirrored']!.start!
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === 'PBhzOdOIFEY')?.seeks.at(-1) ?? -1, { timeout: 15_000 }).toBeGreaterThan(marked - 3)
})
