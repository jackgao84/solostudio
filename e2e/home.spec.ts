/**
 * Lessons are the home page (version 1.2):
 *  - the top shows only the big "Start today's practice", the D-day and today's lessons;
 *  - her whole lesson path sits below: finished lessons folded away, the next one marked, each
 *    section lesson with its stage lights (one lamp per rung, lit when ticked);
 *  - a section lesson has a short intro read aloud, the right video for that part (no marks needed)
 *    and its rungs, each practised with the count-in;
 *  - "Start today's practice" runs today's lessons as the guided session, a skill lesson coming
 *    just before the first practice that needs it;
 *  - a lesson that needs something setup hasn't covered says so plainly and offers that step;
 *  - with no dates set yet, today's lessons are simply the next ones on her path.
 */
import { SECTION_LESSON_COPY } from '../src/content/learn'
import { LADDERS } from '../src/model/ladders'
import { isDone, lessonPath, pathKey } from '../src/model/path'
import { tickStep } from '../src/model/progress'
import { emptyProgress } from '../src/storage/schema'
import { checkScreen, expect, expectRoute, press, readSave, seedSave, setUpSave, tap, today } from './helpers'
import { spoken, test } from './voice'

test('the top of home is Start, the D-day and today’s lessons; the path sits below', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  let p = emptyProgress()
  for (const s of LADDERS.rap) p = tickStep(p, 'rap', s.id, today())
  p = tickStep(p, 'dance', 'dance-watch', today())
  save.progress['sec-1'] = p
  await seedSave(page, save)
  await page.goto('./#/today')

  const top = page.locator('.home-top')
  await expect(top.locator(':scope > *')).toHaveCount(3)
  await expect(top.locator(':scope > *').nth(0).getByRole('button', { name: 'Start today’s practice' })).toBeVisible()
  await expect(top.locator(':scope > *').nth(1)).toHaveClass(/dday-row/)
  await expect(top.locator(':scope > *').nth(2)).toHaveClass(/today-lessons/)
  await expect(top.locator('.dday')).toHaveText('D-30')
  await expect(top.locator('.block').first()).toBeVisible()
  const topBox = (await top.boundingBox())!
  const pathBox = (await page.locator('.lesson-path').boundingBox())!
  expect(pathBox.y).toBeGreaterThanOrEqual(topBox.y + topBox.height - 1)
  await checkScreen(page, 'kid', 'home')

  // The path: every lesson in order, the finished ones folded away, her stage lights on each part.
  const path = lessonPath(save)
  await expect(page.locator('.path-item')).toHaveCount(path.length)
  const keysIn = (sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => e.getAttribute('data-key')))
  expect(await keysIn('details.path-done .path-item')).toEqual(path.filter((i) => isDone(save, i)).map(pathKey))
  expect(await keysIn('.lesson-path > .path-list .path-item')).toEqual(path.filter((i) => !isDone(save, i)).map(pathKey))
  const done = page.locator('details.path-done')
  await expect(done).not.toHaveAttribute('open', /.*/)
  await expect(done.locator('.path-item[data-key="section:sec-1:rap"]')).toHaveCount(1)
  await expect(done.locator('.path-item[data-key="skill:counting"]')).toHaveCount(1)
  await expect(page.locator('.path-item.is-next')).toHaveAttribute('data-key', 'section:sec-1:dance')
  const dance = page.locator('.path-item[data-key="section:sec-1:dance"]')
  await expect(dance.locator('.lamp')).toHaveCount(LADDERS.dance.length)
  await expect(dance.locator('.lamp.is-lit')).toHaveCount(1)
  await page.locator('.lesson-path').scrollIntoViewIfNeeded()
  await checkScreen(page, 'kid', 'home: the lesson path')
})

test('a section lesson: its intro read aloud, its video with no marks, its rungs with the count-in', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  for (const s of save.sections) s.refs = {}
  await seedSave(page, save)
  await page.goto('./#/today')
  await tap(page.locator('.path-item[data-key="section:sec-2:dance"]').getByRole('button').first())
  await expectRoute(page, '/learn/sec-2/dance')
  await expect.poll(async () => (await spoken(page)).filter((u) => u.clip).map((u) => u.text)[0], { timeout: 15_000 }).toBe(SECTION_LESSON_COPY.dance.intro[0])
  await expect(page.locator('.lesson-video iframe')).toBeVisible()
  await expect(page.locator('.rung')).toHaveCount(LADDERS.dance.length)
  await checkScreen(page, 'kid', 'a section lesson')
  await tap(page.getByRole('button', { name: /^Practise/ }).first())
  await expectRoute(page, '/practice/sec-2/dance-watch')
  await expect(page.locator('.player-area iframe')).toBeVisible()
})

test('Start today’s practice runs today’s lessons, a skill lesson just before the practice that needs it', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  save.lessons.done = []
  await seedSave(page, save)
  await page.goto('./#/today')
  await expect(page.locator('.today-lessons .today-skill').first()).toBeVisible()
  await tap(page.getByRole('button', { name: 'Start today’s practice' }))
  await expectRoute(page, /^\/block\//)
  await tap(page.getByRole('button', { name: 'Next', exact: true }))
  await expectRoute(page, '/lesson/counting')
  await expect.poll(async () => (await spoken(page)).some((u) => u.clip && u.text === 'Counting the music')).toBe(true)
  await tap(page.locator('.lesson-side').getByRole('button', { name: 'Next', exact: true }))
  await expect.poll(async () => (await readSave(page)).lessons.done).toEqual(['counting'])
  await expectRoute(page, /^\/lesson\/(voice-warm-up|learning-a-dance)$/)
})

test('a lesson that needs something setup hasn’t covered says so and offers that step', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  save.sections[0].lines = []
  await seedSave(page, save)
  await page.goto('./#/learn/sec-1/rap')
  const gap = page.locator('.lesson-gap')
  await expect(gap).toBeVisible()
  await expect(gap).toContainText('words')
  await checkScreen(page, 'kid', 'a lesson waiting on setup')
  await press(gap.getByRole('button', { name: /hold to open that step/i }), 2300)
  await expectRoute(page, '/grownups/setup')
  await expect(page.locator('.wizard-step[data-step="lines"]')).toHaveClass(/is-open/)
})

test('with no dates set yet, today’s lessons are the next ones on her path', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  save.show = null
  save.plan = null
  await seedSave(page, save)
  await page.goto('./#/today')
  await expect(page.getByRole('button', { name: 'Start today’s practice' })).toBeVisible()
  await expect(page.locator('.dday')).toHaveCount(0)
  const blocks = page.locator('.today-lessons .block')
  await expect(blocks.first()).toHaveAttribute('data-type', 'warmup')
  await expect(blocks.last()).toHaveAttribute('data-type', 'cooldown')
  expect(await blocks.count()).toBeGreaterThanOrEqual(4)
  await checkScreen(page, 'kid', 'home with no dates yet')
})
