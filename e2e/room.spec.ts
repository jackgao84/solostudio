/**
 * The practice room (version 1.3): practice that needs no setup, by touch, at iPad sizes.
 *  - A fresh iPad opens on a welcome with a big Practice room button; nothing there or in the room
 *    tells her a grown-up must set something up first.
 *  - She picks any video (the mirrored follow-along, the tutorials, the performance, the original,
 *    listen-and-read) or her track once it is on the iPad, and plays it with the speed control.
 *  - She makes her own loop by tapping Loop start and Loop end while it plays, nudges it, and the loop
 *    then repeats with the count-in (5, 6, 7, 8 said while nothing plays).
 *  - She names and saves a loop as one of her parts, picks it later, and ticks "I did it" on it at
 *    50, 75 and 100% speed. Her parts are hers to rename or delete.
 *  - Home has a big Practice room button next to Start today's practice.
 */
import type { Page } from '@playwright/test'
import { COUNT_IN_WORDS } from '../src/model/countin'
import { defaultSave, type MyPart } from '../src/storage/schema'
import { WAIT_FOR_GROWNUP } from '../tests/fixtures/grownup-words'
import { assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, loadTrack, readSave, seedSave, setUpSave, tap, trackAudio, typeInto, ytPlayers } from './helpers'
import { nothingSpokenOverMedia, spoken, test } from './voice'

const BIG_PX = 88

/** The fake YouTube player for this video (not destroyed). */
async function yt(page: Page, id: string) {
  return (await ytPlayers(page)).find((p) => p.videoId === id)
}

/** Where the YouTube stand-in for this video was told to seek. */
function seeksOf(page: Page, id: string): Promise<number[]> {
  return page.evaluate((id) => {
    const fake = (window as unknown as { __ytFake?: { players: { videoId: string; destroyed: boolean; seeks: number[] }[] } }).__ytFake
    return (fake?.players ?? []).filter((p) => !p.destroyed && p.videoId === id).flatMap((p) => p.seeks)
  }, id)
}

const countsSaid = async (page: Page) => (await spoken(page)).filter((u) => COUNT_IN_WORDS.includes(u.text)).length

/** These buttons are on screen as it opens, without scrolling, and big enough to hit from a step away. */
async function onScreenAndBig(page: Page, label: string, names: string[]): Promise<void> {
  const vh = page.viewportSize()!.height
  expect(await page.evaluate(() => window.scrollY), `${label}: opens at the top`).toBe(0)
  for (const name of names) {
    const b = page.getByRole('button', { name, exact: true }).first()
    await expect(b, `${label}: ${name}`).toBeVisible()
    const box = (await b.boundingBox())!
    expect(box.y, `${label}: ${name} top`).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height, `${label}: "${name}" is on screen without scrolling`).toBeLessThanOrEqual(vh)
    expect(box.height, `${label}: ${name} height`).toBeGreaterThanOrEqual(BIG_PX)
  }
}

function withParts(...parts: Partial<MyPart>[]) {
  const d = defaultSave()
  d.parts = parts.map((p, i) => ({ id: `part-${i + 1}`, name: `Part ${i + 1}`, source: 'ref-mirrored', from: 10 + i * 10, to: 13 + i * 10, done: [], createdAt: new Date(2031, 2, 7, 10, i).toISOString(), ...p }))
  return d
}

test('a fresh iPad opens on a welcome with the practice room, and nothing says to wait for a grown-up', async ({ page }) => {
  await page.goto('./')
  await expectRoute(page, '/welcome')
  await expect(page.locator('[data-screen="welcome"]')).toBeVisible()
  await expect(page.locator('main')).not.toContainText(WAIT_FOR_GROWNUP)
  await onScreenAndBig(page, 'welcome', ['Practice room'])
  await checkScreen(page, 'kid', 'welcome')

  await tap(page.getByRole('button', { name: 'Practice room', exact: true }))
  await expectRoute(page, '/room')
  await expect(page.locator('[data-screen="room"]')).toBeVisible()
  // The mirrored follow-along is ready to play, and every video is there to pick.
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['PBhzOdOIFEY'])
  await expect(page.locator('.room-sources [role="radio"]')).toHaveCount(9)
  await expect(page.locator('.room-sources [data-source="ref-mirrored"]')).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.room-sources [data-source="track"]')).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText(WAIT_FOR_GROWNUP)
  await onScreenAndBig(page, 'practice room', ['Play'])
  await assertYouTubeRules(page, 'practice room')
  await checkScreen(page, 'kid', 'practice room')
})

test('she picks any video and plays it with the speed control', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('./#/room')
  await expectRoute(page, '/room')
  for (const [name, id] of [
    ['Tutorial', 'vVWmbpHj4Eg'],
    ['Tutorial with counts', 'FIl3O1uBjQQ'],
    ['Performance', 'XD00TJ-6WSw'],
    ['Original', 'JSFG-IE8n_c'],
    ['Listen and read', '6DBtz2enWSA'],
    ['Mirrored follow-along', 'PBhzOdOIFEY'],
  ] as const) {
    const chip = page.locator('.room-sources').getByRole('radio', { name, exact: true })
    await tap(chip)
    await expect(chip).toHaveAttribute('aria-checked', 'true')
    // Only the picked video is on the page.
    await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual([id])
  }
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await yt(page, 'PBhzOdOIFEY'))?.playing, { timeout: 15_000 }).toBe(true)
  await tap(page.getByRole('button', { name: 'Slower' }))
  await expect(page.locator('.room .speed')).toHaveText('75% speed')
  await expect.poll(async () => (await yt(page, 'PBhzOdOIFEY'))?.rate).toBe(0.75)
  await tap(page.getByRole('button', { name: 'Slower' }))
  await expect(page.locator('.room .speed')).toHaveText('50% speed')
  await expect.poll(async () => (await yt(page, 'PBhzOdOIFEY'))?.rate).toBe(0.5)
  await tap(page.getByRole('button', { name: 'Pause', exact: true }))
  await expect.poll(async () => (await yt(page, 'PBhzOdOIFEY'))?.playing).toBe(false)
  await assertYouTubeRules(page, 'practice room at half speed')
})

test('her track joins the list once it is on the iPad, and plays at her speed with the pitch kept', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('./')
  await expectRoute(page, '/welcome')
  await holdGate(page)
  await loadTrack(page, 12)
  await page.goto('./#/room')
  const mine = page.locator('.room-sources').getByRole('radio', { name: 'My track', exact: true })
  await expect(mine).toBeVisible()
  await tap(mine)
  await expect(page.locator('.room .track-art')).toBeVisible()
  await expect(page.locator('.room iframe')).toHaveCount(0)
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await trackAudio(page))?.paused, { timeout: 10_000 }).toBe(false)
  await tap(page.getByRole('button', { name: 'Slower' }))
  await expect(page.locator('.room .speed')).toHaveText('95% speed')
  await expect.poll(async () => (await trackAudio(page))?.rate).toBeCloseTo(0.95, 5)
  expect((await trackAudio(page))?.preservesPitch).toBe(true)
  await checkScreen(page, 'kid', 'practice room on her track')
})

test('she makes her own loop with Loop start and Loop end, nudges it, and it repeats with the count-in', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('./#/room')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await yt(page, 'PBhzOdOIFEY'))?.playing, { timeout: 15_000 }).toBe(true)
  await page.waitForTimeout(800)
  await tap(page.getByRole('button', { name: 'Loop start', exact: true }))
  await expect(page.locator('.loop-row')).toContainText('Loop end')
  await page.waitForTimeout(1600)
  await tap(page.getByRole('button', { name: 'Loop end', exact: true }))
  const status = page.locator('.loop-status')
  await expect(status).toBeVisible()

  // The loop comes round with 5, 6, 7, 8 each time, said while nothing plays.
  await expect.poll(() => countsSaid(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(4)
  await expect.poll(async () => (await yt(page, 'PBhzOdOIFEY'))?.playing, { timeout: 15_000 }).toBe(true)
  const seeks = (await seeksOf(page, 'PBhzOdOIFEY')).length
  await expect.poll(() => countsSaid(page), { timeout: 30_000 }).toBeGreaterThanOrEqual(8)
  expect((await seeksOf(page, 'PBhzOdOIFEY')).length).toBeGreaterThan(seeks)
  expect(await nothingSpokenOverMedia(page)).toEqual([])

  // Nudges move either end.
  const before = (await status.textContent())!
  await tap(page.getByRole('button', { name: 'Loop start later' }))
  await expect(status).not.toHaveText(before)
  const moved = (await status.textContent())!
  await tap(page.getByRole('button', { name: 'Loop end earlier' }))
  await expect(status).not.toHaveText(moved)
  await checkScreen(page, 'kid', 'practice room with her loop')
  await assertYouTubeRules(page, 'practice room with her loop')

  await tap(page.getByRole('button', { name: 'Stop the loop' }))
  await expect(status).toHaveCount(0)
})

test('she names and saves a loop as one of her parts, picks it later, and ticks it at 50, 75 and 100%', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('./#/room')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await yt(page, 'PBhzOdOIFEY'))?.playing, { timeout: 15_000 }).toBe(true)
  await page.waitForTimeout(600)
  await tap(page.getByRole('button', { name: 'Loop start', exact: true }))
  await page.waitForTimeout(1600)
  await tap(page.getByRole('button', { name: 'Loop end', exact: true }))
  await expect(page.locator('.loop-status')).toBeVisible()

  await tap(page.getByRole('button', { name: 'Save as my part' }))
  const name = page.locator('input[name="partName"]')
  await expect(name).toHaveValue('My part 1')
  await checkScreen(page, 'kid', 'naming her part')
  await typeInto(name, 'Spin')
  await tap(page.getByRole('button', { name: 'Save my part' }))
  await expect(page.locator('.my-part')).toHaveCount(1)
  await expect(page.locator('.my-part')).toContainText('Spin')
  let save = await readSave(page)
  expect(save.parts).toHaveLength(1)
  const p = save.parts[0]
  expect(p).toMatchObject({ name: 'Spin', source: 'ref-mirrored', done: [] })
  expect(p.to - p.from).toBeGreaterThanOrEqual(1)

  // Later: she picks it, and ticks it at each speed.
  await page.reload()
  await expectRoute(page, '/room')
  await tap(page.getByRole('button', { name: 'Practise Spin' }))
  const head = page.locator('.room-part')
  await expect(head).toContainText('Spin')
  await expect(page.locator('.loop-status')).toBeVisible()
  await expect(page.locator('.room .speed')).toHaveText('50% speed')
  await expect(head.locator('.lamp.is-lit')).toHaveCount(0)
  await onScreenAndBig(page, 'a part picked', ['Play', 'I did it'])
  await checkScreen(page, 'kid', 'a part picked')
  for (const [speed, done, next] of [
    [50, [0.5], '75% speed'],
    [75, [0.5, 0.75], '100% speed'],
    [100, [0.5, 0.75, 1], '100% speed'],
  ] as const) {
    await tap(page.getByRole('button', { name: 'I did it', exact: true }))
    await expect.poll(async () => (await readSave(page)).parts[0].done, { message: `ticked at ${speed}%` }).toEqual(done)
    await expect(page.locator('.room .speed')).toHaveText(next)
    await expect(head.locator('.lamp.is-lit')).toHaveCount(done.length)
  }
  await expect(page.locator('.room-part__done')).toBeVisible()
  save = await readSave(page)
  expect(save.parts[0].name).toBe('Spin')
})

test('her parts are hers to rename or delete', async ({ page }) => {
  await seedSave(page, withParts({ name: 'Spin' }, { name: 'Wave', source: 'ref-tutorialParts' }))
  await page.goto('./#/room')
  await expect(page.locator('.my-part')).toHaveCount(2)
  await checkScreen(page, 'kid', 'her parts')

  await tap(page.getByRole('button', { name: 'Rename Spin' }))
  const field = page.locator('input[name="rename"]')
  await expect(field).toHaveValue('Spin')
  await typeInto(field, 'Big spin')
  await tap(page.locator('.my-part').getByRole('button', { name: 'Save', exact: true }))
  await expect(page.locator('.my-part').first()).toContainText('Big spin')
  await expect.poll(async () => (await readSave(page)).parts.map((p) => p.name)).toEqual(['Big spin', 'Wave'])

  await tap(page.getByRole('button', { name: 'Delete Wave' }))
  await tap(page.getByRole('button', { name: 'Yes, delete it' }))
  await expect(page.locator('.my-part')).toHaveCount(1)
  await expect.poll(async () => (await readSave(page)).parts.map((p) => p.name)).toEqual(['Big spin'])
})

test('home has a big Practice room button next to Start today’s practice', async ({ page }) => {
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/today')
  const start = page.locator('.home-top .today__start')
  const go = start.getByRole('button', { name: 'Start today’s practice' })
  const room = start.getByRole('button', { name: 'Practice room', exact: true })
  await onScreenAndBig(page, 'home', ['Start today’s practice', 'Practice room'])
  const a = (await go.boundingBox())!
  const b = (await room.boundingBox())!
  expect(Math.abs(a.y - b.y), 'side by side').toBeLessThan(4)
  await checkScreen(page, 'kid', 'home with the practice room')
  await tap(room)
  await expectRoute(page, '/room')
  await tap(page.getByRole('button', { name: 'Today', exact: true }))
  await expectRoute(page, '/today')
})
