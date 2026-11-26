/**
 * Her parts feed the path (version 1.3), by touch, at iPad sizes:
 *  - with no grown-up sections, her saved parts on the mirrored follow-along are the dance lessons on
 *    her path, in the order they appear in the video, and a part lesson opens in the practice room;
 *  - Start today's practice opens them in the practice room: the coach names the part and its speed,
 *    the loop goes round with the count-in, and I did it ticks it and moves on;
 *  - with no parts yet, the dance block opens the practice room on the mirrored follow-along with a
 *    short hint on making a loop, read aloud in the coach's voice;
 *  - a rap lesson on a part with no lines plays the listen-and-read video and her track, with the
 *    same loop buttons, and never says it must wait for the words;
 *  - grown-up sections, once they exist, work as now.
 */
import type { Page } from '@playwright/test'
import { KID_COPY } from '../src/content/kid'
import { COUNT_IN_WORDS } from '../src/model/countin'
import { isDone, lessonPath, pathKey } from '../src/model/path'
import { SKILL_LESSON_IDS, defaultSave, type MyPart, type SaveData } from '../src/storage/schema'
import { WAIT_FOR_GROWNUP } from '../tests/fixtures/grownup-words'
import { assertYouTubeRules, checkScreen, expect, expectRoute, readSave, seedSave, setUpSave, tap, ytPlayers } from './helpers'
import { nothingSpokenOverMedia, spoken, test } from './voice'

function part(id: string, name: string, from: number, over: Partial<MyPart> = {}): MyPart {
  return { id, name, source: 'ref-mirrored', from, to: from + 2, done: [], createdAt: `2031-03-07T10:0${id.length}:00.000Z`, ...over }
}

/** Nothing set up by a grown-up; the skill lessons heard, so this is about her parts. */
function noSetup(parts: MyPart[]): SaveData {
  const d = defaultSave()
  d.parts = parts
  d.lessons.done = [...SKILL_LESSON_IDS]
  d.tour.seen = true
  return d
}

const clipsSaid = async (page: Page) => (await spoken(page)).filter((u) => u.clip).map((u) => u.text)

test('with no grown-up sections, her follow-along parts are the dance lessons on her path, in video order', async ({ page }) => {
  const save = noSetup([part('b', 'Wave', 40), part('a', 'Spin', 12), part('t', 'Hands', 5, { source: 'ref-tutorialParts' })])
  await seedSave(page, save)
  await page.goto('./')
  // She has made parts, so the app opens on home.
  await expectRoute(page, '/today')
  await expect(page.locator('main')).not.toContainText(WAIT_FOR_GROWNUP)
  const path = lessonPath(save)
  const open = await page.locator('.lesson-path > .path-list .path-item').evaluateAll((els) => els.map((e) => e.getAttribute('data-key')))
  expect(open).toEqual(path.filter((i) => !isDone(save, i)).map(pathKey))
  expect(open).toEqual(['part:a', 'part:b', 'showtime'])
  await expect(page.locator('.lesson-path .path-item')).toHaveCount(path.length)
  await expect(page.locator('.path-item[data-key="part:a"]')).toContainText('Spin')
  await expect(page.locator('.path-item[data-key="part:a"] .lamp')).toHaveCount(3)
  await page.locator('.lesson-path').scrollIntoViewIfNeeded()
  await checkScreen(page, 'kid', 'home with her parts on the path')

  await tap(page.locator('.path-item[data-key="part:b"]').getByRole('button').first())
  await expectRoute(page, '/room')
  await expect(page.locator('.room-part')).toContainText('Wave')
  await expect(page.locator('.loop-status')).toBeVisible()
})

test('today’s session opens her parts in the practice room, and I did it ticks each one', async ({ page }) => {
  test.setTimeout(120_000)
  const save = noSetup([part('a', 'Spin', 12), part('b', 'Wave', 40)])
  await seedSave(page, save)
  await page.goto('./#/today')
  const dance = page.locator('.today-lessons .block[data-type="dance"]')
  await expect(dance).toHaveCount(2)
  await expect(dance.first()).toContainText('Spin')
  await tap(page.getByRole('button', { name: 'Start today’s practice' }))
  await expectRoute(page, /^\/block\//)
  await tap(page.getByRole('button', { name: 'Next', exact: true }))

  // Her first part: the coach names it and its speed, then the loop goes round with the count-in.
  await expectRoute(page, '/room')
  await expect(page.locator('.room-part')).toContainText('Spin')
  await expect(page.locator('.room .speed')).toHaveText('50% speed')
  await expect.poll(async () => (await spoken(page)).map((u) => u.text).slice(1, 4), { timeout: 15_000 }).toEqual(['Next', 'Spin', 'Dance, 50% speed'])
  await expect.poll(async () => (await spoken(page)).filter((u) => COUNT_IN_WORDS.includes(u.text)).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(4)
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === 'PBhzOdOIFEY')?.playing, { timeout: 15_000 }).toBe(true)
  await checkScreen(page, 'kid', 'a part in the session')
  await assertYouTubeRules(page, 'a part in the session')

  await tap(page.getByRole('button', { name: 'I did it', exact: true }))
  await expect.poll(async () => (await readSave(page)).parts.find((p) => p.id === 'a')?.done).toEqual([0.5])
  // On to the next part.
  await expect(page.locator('.room-part')).toContainText('Wave')
  await tap(page.getByRole('button', { name: 'Next', exact: true }))
  await expectRoute(page, /^\/block\//)
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('with no parts yet, the dance block opens the practice room on the follow-along with a hint read aloud', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('./')
  await expectRoute(page, '/welcome')
  // Nothing set up at all: the welcome leads to home, where today's practice is ready.
  await tap(page.getByRole('button', { name: KID_COPY.welcome.go, exact: true }))
  await expectRoute(page, '/today')
  await expect(page.locator('main')).not.toContainText(WAIT_FOR_GROWNUP)
  await expect.poll(() => page.locator('.today-lessons .block').evaluateAll((els) => els.map((e) => e.getAttribute('data-type')))).toEqual(['warmup', 'dance', 'cooldown'])
  await checkScreen(page, 'kid', 'home with nothing set up')

  const save = await readSave(page)
  save.lessons.done = [...SKILL_LESSON_IDS]
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/today')
  await tap(page.getByRole('button', { name: 'Start today’s practice' }))
  await tap(page.getByRole('button', { name: 'Next', exact: true }))
  await expectRoute(page, '/room')
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['PBhzOdOIFEY'])
  const hint = page.locator('.room-hint')
  await expect(hint).toBeVisible()
  await expect(hint).toContainText('Loop start')
  await expect.poll(() => clipsSaid(page), { timeout: 20_000 }).toEqual(expect.arrayContaining([KID_COPY.room.hint1, KID_COPY.room.hint2]))
  await expect(page.locator('main')).not.toContainText(WAIT_FOR_GROWNUP)
  await checkScreen(page, 'kid', 'the practice room with the hint')
  await assertYouTubeRules(page, 'the practice room with the hint')
  await tap(page.getByRole('button', { name: 'Next', exact: true }))
  await expectRoute(page, /^\/block\//)
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('a rap lesson on a part with no lines plays the listen-and-read video and her track, with the same loop buttons', async ({ page }) => {
  test.setTimeout(90_000)
  const save = setUpSave()
  save.tour.seen = true
  save.sections[0].lines = []
  await seedSave(page, save)

  await page.goto('./#/learn/sec-1/rap')
  await expect(page.locator('.lesson-video iframe')).toBeVisible()
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toContain('6DBtz2enWSA')
  await expect(page.locator('.lesson-gap')).toContainText(KID_COPY.learn.wordsInVideo)
  await expect(page.locator('main')).not.toContainText(WAIT_FOR_GROWNUP)
  await expect(page.getByRole('button', { name: 'Loop start', exact: true })).toBeVisible()
  await checkScreen(page, 'kid', 'a rap lesson with no lines')

  for (const [step, id] of [
    ['rap-listen', '6DBtz2enWSA'],
    ['rap-say', '6DBtz2enWSA'],
    ['rap-memory-75', 'JSFG-IE8n_c'],
  ] as const) {
    await page.goto(`./#/practice/sec-1/${step}`)
    await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId), { message: step }).toEqual([id])
    await expect(page.getByRole('button', { name: 'Loop start', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Loop end', exact: true })).toBeVisible()
    await expect(page.locator('main')).not.toContainText(KID_COPY.practice.noLines)
    await expect(page.locator('main')).not.toContainText(WAIT_FOR_GROWNUP)
    await checkScreen(page, 'kid', `rap with no lines: ${step}`)
  }
})

test('grown-up sections, once they exist, work as now: her parts stay in the practice room', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  save.parts = [part('a', 'Spin', 12)]
  await seedSave(page, save)
  await page.goto('./#/today')
  const without = { ...save, parts: [] }
  const keys = await page.locator('.lesson-path > .path-list .path-item').evaluateAll((els) => els.map((e) => e.getAttribute('data-key')))
  expect(keys).toEqual(lessonPath(without).filter((i) => !isDone(without, i)).map(pathKey))
  await expect(page.locator('.lesson-path .path-item')).toHaveCount(lessonPath(without).length)
  await expect(page.locator('.lesson-path [data-key^="part:"]')).toHaveCount(0)
  await expect(page.locator('.today-lessons .block[data-type="dance"]').first()).toContainText('Verse 1')
  await tap(page.getByRole('button', { name: 'Practice room', exact: true }))
  await expect(page.locator('.my-part')).toHaveCount(1)
})
