/**
 * Narration (version 1.2), in WebKit at iPad sizes:
 *  - a lesson is read aloud in the coach's recorded voice, line by line, exactly the words on screen;
 *    the line being read is lit; she can pause it, replay a line or skip to the next;
 *  - cues are in the coach's voice too (the count-in included); only a custom section name is left
 *    to the iPad's own voice, between the coach's "Next" and the rest of the cue;
 *  - a grown-up can turn narration off: the lesson is then text only;
 *  - nothing is ever said over her track or a video.
 */
import { KID_COPY } from '../src/content/kid'
import { LADDER_COPY } from '../src/content/ladders'
import { LESSONS } from '../src/content/lessons'
import { lessonScript } from '../src/content/narration'
import { COUNT_IN_WORDS } from '../src/model/countin'
import { stepById } from '../src/model/ladders'
import { planDay, planInputFrom } from '../src/model/plan'
import { cueFor, sessionItems } from '../src/model/session'
import { fill } from '../src/ui/dom'
import { checkScreen, expect, expectRoute, holdGate, readSave, seedSave, setUpSave, tap, today } from './helpers'
import { nothingSpokenOverMedia, spoken, test } from './voice'

const clipsSaid = async (page: import('@playwright/test').Page) => (await spoken(page)).filter((u) => u.clip).map((u) => u.text)

test('a lesson is read aloud in the coach’s voice, word for word, and she can pause, replay or skip it', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  save.lessons.done = []
  await seedSave(page, save)
  await page.goto('./#/today')
  await tap(page.getByRole('button', { name: 'Lessons', exact: true }))
  await tap(page.locator('.lesson-card[data-lesson="counting"]'))
  await expectRoute(page, '/lesson/counting')
  const script = lessonScript(LESSONS.find((l) => l.id === 'counting')!)

  // What she reads is what she hears: the title first, then the first paragraph by itself.
  await expect.poll(async () => (await page.locator('.narrated').allTextContents()).map((t) => t.trim())).toEqual(script)
  await expect.poll(() => clipsSaid(page), { timeout: 20_000 }).toEqual(script.slice(0, 2))
  await expect(page.locator('.narrated.is-reading')).toHaveText(script[1])
  await checkScreen(page, 'kid', 'a lesson read aloud')

  // Pause: nothing more is said. Play carries on with the same line.
  const narrator = page.locator('.narrator')
  await tap(narrator.getByRole('button', { name: 'Pause', exact: true }))
  const n = (await clipsSaid(page)).length
  await page.waitForTimeout(2500)
  expect((await clipsSaid(page)).length).toBe(n)
  await tap(narrator.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await clipsSaid(page)).slice(n)).toEqual([script[1]])

  // Replay says this line again; Skip moves on to the next one.
  await tap(narrator.getByRole('button', { name: 'Replay', exact: true }))
  await expect.poll(async () => (await clipsSaid(page)).slice(n + 1)).toEqual([script[1]])
  await tap(narrator.getByRole('button', { name: 'Skip', exact: true }))
  await expect.poll(async () => (await clipsSaid(page)).slice(n + 2)).toEqual([script[2]])
  await expect(page.locator('.narrated.is-reading')).toHaveText(script[2])
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('cues are in the coach’s voice; only a custom section name is left to the iPad’s voice', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  const day = planDay(planInputFrom(save)!, today())!
  const items = sessionItems(save, day, today())
  const first = items[1]
  expect(first.kind).toBe('practice')
  if (first.kind !== 'practice') return
  save.sections.find((s) => s.id === first.sectionId)!.name = 'Sparkle part'
  await seedSave(page, save)
  await page.goto('./#/today')

  await tap(page.getByRole('button', { name: 'Start today’s practice' }))
  await expect.poll(async () => (await spoken(page)).map((u) => [u.text, !!u.clip])).toEqual([[cueFor(items[0], save), true]])
  await tap(page.getByRole('button', { name: 'Next', exact: true }))
  await expect.poll(async () => (await spoken(page)).filter((u) => COUNT_IN_WORDS.includes(u.text)).length, { timeout: 20_000 }).toBe(4)
  const step = stepById(first.stepId)!
  const rest = fill(KID_COPY.cues.nextStep.split('{section}, ')[1], { ladder: LADDER_COPY[step.ladder].name, speed: Math.round(step.speed * 100) })
  expect((await spoken(page)).slice(1, 8).map((u) => [u.text, !!u.clip])).toEqual([
    ['Next', true],
    ['Sparkle part', false],
    [rest, true],
    ...COUNT_IN_WORDS.map((w) => [w, true]),
  ])
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('a grown-up can turn narration off: the lesson is then text only', async ({ page }) => {
  test.setTimeout(60_000)
  const save = setUpSave()
  save.tour.seen = true
  save.lessons.done = []
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Lessons and narration' }))
  await expectRoute(page, '/grownups/lessons')
  const read = page.getByRole('switch', { name: 'Read lessons aloud' })
  await expect(read).toHaveAttribute('aria-checked', 'true')
  await checkScreen(page, 'grownup', 'lessons and narration')
  await tap(read)
  await expect(read).toHaveAttribute('aria-checked', 'false')
  expect((await readSave(page)).narration.on).toBe(false)
  await tap(page.getByRole('button', { name: 'Done' }))
  await tap(page.getByRole('button', { name: 'Back to practice' }))

  await tap(page.getByRole('button', { name: 'Lessons', exact: true }))
  await tap(page.locator('.lesson-card[data-lesson="breathing"]'))
  await expectRoute(page, '/lesson/breathing')
  await expect(page.locator('.narrated').first()).toBeVisible()
  await expect(page.locator('.narrator')).toHaveCount(0)
  await page.waitForTimeout(3000)
  expect(await clipsSaid(page)).toEqual([])
})
