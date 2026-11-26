/**
 * Version 1.4, part 1: karaoke videos in the app, by touch, at iPad sizes.
 *  - The practice room has "Voice guide (light)" and "Karaoke (no voice)" under their own names.
 *  - A grown-up adds any YouTube video under a name they choose, renames, swaps and removes it, and
 *    the practice room shows every video by its name.
 *  - With no guide file the rap ladder fades the voice: the listen-and-read video, Voice guide,
 *    Karaoke, then her track (here the video standing in for it) from memory.
 *  - A rung whose karaoke video isn't marked on the section opens in the practice room on that video
 *    with her loop buttons, says how to find her part, and "I did it" ticks the rung. Back a step is
 *    always there and never counts against her.
 *  - A grown-up taps where each section starts on a karaoke video in one pass; the rung then plays
 *    it from the section.
 */
import type { Page } from '@playwright/test'
import { PRE_ROLL } from '../src/model/timing'
import { assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, readSave, seedSave, setUpSave, tap, typeInto, ytPlayers } from './helpers'
import { spoken, test } from './voice'

const LISTEN = '6DBtz2enWSA'
const VOICE_GUIDE = '81BPeeksFqo'
const KARAOKE = 'a03UskoIMxw'
const STAND_IN = 'JSFG-IE8n_c'
const BIG_PX = 88

const playing = async (page: Page) => (await ytPlayers(page)).map((p) => p.videoId)

function seeksOf(page: Page, id: string): Promise<number[]> {
  return page.evaluate((id) => {
    const fake = (window as unknown as { __ytFake?: { players: { videoId: string; destroyed: boolean; seeks: number[] }[] } }).__ytFake
    return (fake?.players ?? []).filter((p) => !p.destroyed && p.videoId === id).flatMap((p) => p.seeks)
  }, id)
}

function query(page: Page): URLSearchParams {
  return new URLSearchParams(new URL(page.url()).hash.split('?')[1] ?? '')
}

async function onScreenAndBig(page: Page, label: string, names: string[]): Promise<void> {
  const vh = page.viewportSize()!.height
  for (const name of names) {
    const b = page.getByRole('button', { name, exact: true }).first()
    await expect(b, `${label}: ${name}`).toBeVisible()
    const box = (await b.boundingBox())!
    expect(box.y + box.height, `${label}: "${name}" is on screen without scrolling`).toBeLessThanOrEqual(vh)
    expect(box.height, `${label}: ${name} height`).toBeGreaterThanOrEqual(BIG_PX)
  }
}

/** A seeded save whose sections aren't marked on either karaoke video. */
function unmarkedSave() {
  const save = setUpSave()
  for (const s of save.sections) {
    delete s.refs['ref-voiceGuide']
    delete s.refs['ref-karaoke']
  }
  return save
}

test('the practice room has both karaoke videos, by their names', async ({ page }) => {
  await page.goto('./#/room')
  await expectRoute(page, '/room')
  for (const [name, id] of [
    ['Voice guide (light)', VOICE_GUIDE],
    ['Karaoke (no voice)', KARAOKE],
  ] as const) {
    const chip = page.locator('.room-sources').getByRole('radio', { name, exact: true })
    await tap(chip)
    await expect(chip).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => playing(page)).toEqual([id])
  }
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === KARAOKE)?.playing, { timeout: 15_000 }).toBe(true)
  await assertYouTubeRules(page, 'the room on Karaoke')
  await checkScreen(page, 'kid', 'the room on Karaoke')
})

test('a grown-up adds a YouTube video under a name, renames, swaps and removes it; the room shows it by name', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('./')
  await expectRoute(page, '/welcome')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Videos' }))
  await expectRoute(page, '/grownups/refs')

  // Add one.
  const add = page.locator('.add-youtube')
  await typeInto(add.locator('input[name="videoName"]'), 'Slow karaoke')
  await typeInto(add.locator('input[name="videoLink"]'), 'https://www.youtube.com/watch?v=Ab3De6Gh9Jk')
  await tap(add.getByRole('button', { name: 'Add the video' }))
  await expect.poll(async () => (await readSave(page)).refs.find((r) => r.role === 'added')).toMatchObject({ label: 'Slow karaoke', youtubeId: 'Ab3De6Gh9Jk', kind: 'youtube' })
  const added = (await readSave(page)).refs.find((r) => r.role === 'added')!
  const row = page.locator(`.ref-row[data-ref-id="${added.id}"]`)
  await expect(row).toBeVisible()
  await checkScreen(page, 'grownup', 'videos with one added')

  // Rename it, and rename a default one too.
  await typeInto(row.locator('input[name="videoName"]'), 'Karaoke at half speed')
  await tap(row.getByRole('button', { name: 'Rename' }))
  const karaokeRow = page.locator('.ref-row[data-ref-id="ref-karaoke"]')
  await typeInto(karaokeRow.locator('input[name="videoName"]'), 'Karaoke')
  await tap(karaokeRow.getByRole('button', { name: 'Rename' }))
  await expect.poll(async () => (await readSave(page)).refs.find((r) => r.id === added.id)?.label).toBe('Karaoke at half speed')
  await expect.poll(async () => (await readSave(page)).refs.find((r) => r.id === 'ref-karaoke')?.label).toBe('Karaoke')

  // The room shows both by their names.
  await page.goto('./#/room')
  await expectRoute(page, '/room')
  const sources = page.locator('.room-sources')
  await expect(sources.getByRole('radio', { name: 'Karaoke at half speed', exact: true })).toBeVisible()
  await expect(sources.getByRole('radio', { name: 'Karaoke', exact: true })).toBeVisible()
  await expect(sources.getByRole('radio', { name: 'Karaoke (no voice)', exact: true })).toHaveCount(0)
  await tap(sources.getByRole('radio', { name: 'Karaoke at half speed', exact: true }))
  await expect.poll(() => playing(page)).toEqual(['Ab3De6Gh9Jk'])

  // Swap it, then remove it.
  await page.goto('./#/welcome')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Videos' }))
  await typeInto(row.locator('input[name="youtubeId"]'), 'Zz9Yy8Xx7Ww')
  await tap(row.getByRole('button', { name: 'Save', exact: true }))
  await expect.poll(async () => (await readSave(page)).refs.find((r) => r.id === added.id)?.youtubeId).toBe('Zz9Yy8Xx7Ww')
  await page.goto('./#/room')
  await tap(page.locator('.room-sources').getByRole('radio', { name: 'Karaoke at half speed', exact: true }))
  await expect.poll(() => playing(page)).toEqual(['Zz9Yy8Xx7Ww'])

  await page.goto('./#/welcome')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Videos' }))
  await tap(row.getByRole('button', { name: 'Remove' }))
  await tap(row.getByRole('button', { name: 'Yes, remove it' }))
  await expect.poll(async () => (await readSave(page)).refs.some((r) => r.id === added.id)).toBe(false)
  await expect(page.locator(`.ref-row[data-ref-id="${added.id}"]`)).toHaveCount(0)
  // The seven earlier videos can't be removed.
  await expect(page.locator('.ref-row[data-ref-id="ref-mirrored"]').getByRole('button', { name: 'Remove' })).toHaveCount(0)
  await page.goto('./#/room')
  await expect(page.locator('.room-sources').getByRole('radio', { name: 'Karaoke at half speed', exact: true })).toHaveCount(0)
})

test('with no guide file the rap ladder fades the voice: listen-and-read, Voice guide, Karaoke, then from memory', async ({ page }) => {
  test.setTimeout(90_000)
  await seedSave(page, setUpSave())
  for (const [step, name, id] of [
    ['rap-listen', 'Listen and read', LISTEN],
    ['rap-say', 'Say it with Voice guide', VOICE_GUIDE],
    ['rap-fade', 'Say it with Karaoke', KARAOKE],
    ['rap-memory-75', 'From memory, slow', STAND_IN],
  ] as const) {
    await page.goto(`./#/practice/sec-1/${step}`)
    await expectRoute(page, `/practice/sec-1/${step}`)
    await expect(page.locator('.practice__step')).toHaveText(name)
    await expect(page.locator('.lyric-line')).toHaveCount(4)
    await tap(page.getByRole('button', { name: 'Play', exact: true }))
    await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === id)?.playing, { message: step, timeout: 15_000 }).toBe(true)
    expect((await ytPlayers(page)).find((p) => p.videoId === id)!.rate, step).toBe(0.75)
    if (step === 'rap-say') {
      // Cued to the section where it is marked on that video.
      const marked = setUpSave().sections[0].refs['ref-voiceGuide']!.start!
      expect(await seeksOf(page, VOICE_GUIDE)).toContain(Math.max(0, Math.round((marked - PRE_ROLL) * 100) / 100))
      await assertYouTubeRules(page, 'say it with Voice guide')
      await checkScreen(page, 'kid', 'say it with Voice guide')
    }
  }
})

test('an unmarked karaoke video opens in the practice room with her loop buttons; back a step never counts against her', async ({ page }) => {
  test.setTimeout(90_000)
  await seedSave(page, unmarkedSave())
  await page.goto('./#/practice/sec-1/rap-listen')
  await tap(page.getByRole('button', { name: 'I did it', exact: true }))

  // "Say it with Voice guide" opens the practice room on Voice guide.
  await expectRoute(page, '/room')
  await expect.poll(() => Object.fromEntries(query(page))).toMatchObject({ section: 'sec-1', step: 'rap-say', source: 'ref-voiceGuide' })
  const head = page.locator('.room-step')
  await expect(head).toContainText('Verse 1')
  await expect(head).toContainText('Say it with Voice guide')
  await expect(page.locator('.room-sources [data-source="ref-voiceGuide"]')).toHaveAttribute('aria-checked', 'true')
  await expect.poll(() => playing(page)).toEqual([VOICE_GUIDE])
  await expect(page.locator('.room .speed')).toHaveText('75% speed')
  await expect(page.getByRole('button', { name: 'Loop start', exact: true })).toBeVisible()
  await onScreenAndBig(page, 'a rung in the room', ['Play', 'I did it'])
  await expect.poll(async () => (await spoken(page)).map((u) => u.text)).toContain('Find your part in this video. Tap Loop start where it begins, and Loop end where it finishes.')
  await assertYouTubeRules(page, 'a rung in the room')
  await checkScreen(page, 'kid', 'a rung in the room')

  // She makes her loop around her part and plays it.
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === VOICE_GUIDE)?.playing, { timeout: 15_000 }).toBe(true)
  await tap(page.getByRole('button', { name: 'Loop start', exact: true }))
  await page.waitForTimeout(1500)
  await tap(page.getByRole('button', { name: 'Loop end', exact: true }))
  await expect(page.getByRole('button', { name: 'Stop the loop' })).toBeVisible()

  // I did it ticks the rung and moves on: Karaoke isn't marked either, so the room again.
  await tap(page.getByRole('button', { name: 'I did it', exact: true }))
  await expect.poll(async () => (await readSave(page)).progress['sec-1'].rap.done).toEqual(['rap-listen', 'rap-say'])
  await expect.poll(() => Object.fromEntries(query(page))).toMatchObject({ section: 'sec-1', step: 'rap-fade', source: 'ref-karaoke' })
  await expect(page.locator('.room-step')).toContainText('Say it with Karaoke')
  await expect.poll(() => playing(page)).toEqual([KARAOKE])
  const before = await readSave(page)

  // Back a step: Voice guide again, and nothing she did is undone or logged against her.
  await tap(page.getByRole('button', { name: 'Back a step' }))
  await expect.poll(() => Object.fromEntries(query(page))).toMatchObject({ section: 'sec-1', step: 'rap-say', source: 'ref-voiceGuide' })
  await expect.poll(() => playing(page)).toEqual([VOICE_GUIDE])
  let after = await readSave(page)
  expect(after.progress).toEqual(before.progress)
  expect(after.activity).toEqual(before.activity)
  await tap(page.getByRole('button', { name: 'I did it', exact: true }))
  await expect.poll(() => Object.fromEntries(query(page))).toMatchObject({ step: 'rap-fade' })
  after = await readSave(page)
  expect(after.progress['sec-1'].rap.done).toEqual(['rap-listen', 'rap-say'])
  expect(after.progress['sec-1'].shaky).toBe(false)

  // From a rung on the practice screen too.
  await page.goto('./#/practice/sec-1/rap-memory-75')
  await expectRoute(page, '/practice/sec-1/rap-memory-75')
  await checkScreen(page, 'kid', 'from memory with Back a step')
  await tap(page.getByRole('button', { name: 'Back a step' }))
  await expectRoute(page, '/room')
  await expect.poll(() => Object.fromEntries(query(page))).toMatchObject({ step: 'rap-fade', source: 'ref-karaoke' })
  // The first rung has nothing before it.
  await page.goto('./#/practice/sec-1/rap-listen')
  await expectRoute(page, '/practice/sec-1/rap-listen')
  await expect(page.locator('.practice__step')).toHaveText('Listen and read')
  await expect(page.getByRole('button', { name: 'Back a step' })).toHaveCount(0)
})

test('a grown-up taps where each section starts on a karaoke video in one pass; the rung then plays it from there', async ({ page }) => {
  test.setTimeout(90_000)
  await seedSave(page, unmarkedSave())
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Videos' }))
  await expectRoute(page, '/grownups/refs')
  await tap(page.locator('.ref-row[data-ref-id="ref-karaoke"]').getByRole('button', { name: /^Tap section starts/ }))
  await expectRoute(page, '/grownups/taps/ref-karaoke')
  await expect.poll(() => playing(page)).toEqual([KARAOKE])
  await checkScreen(page, 'grownup', 'tapping section starts on Karaoke')
  await tap(page.getByRole('button', { name: 'Play the video' }))
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === KARAOKE)?.playing, { timeout: 15_000 }).toBe(true)
  // At least a second apart: a section is never shorter than that.
  for (const name of ['Verse 1', 'Chorus', 'Dance Break']) {
    await page.waitForTimeout(1500)
    await tap(page.getByRole('button', { name: `${name} starts now` }))
  }
  await expect.poll(async () => (await readSave(page)).sections.every((s) => s.refs['ref-karaoke']?.start != null)).toBe(true)
  const marks = (await readSave(page)).sections.map((s) => s.refs['ref-karaoke']!)
  expect(marks[0].start!).toBeLessThan(marks[1].start!)
  expect(marks[1].start!).toBeLessThan(marks[2].start!)
  expect(marks[0].end).toBe(marks[1].start)

  // The rung now plays Karaoke on the practice screen, from where Verse 1 starts on it.
  await page.goto('./#/practice/sec-1/rap-fade')
  await expectRoute(page, '/practice/sec-1/rap-fade')
  await expect(page.locator('.practice__step')).toHaveText('Say it with Karaoke')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await ytPlayers(page)).find((p) => p.videoId === KARAOKE)?.playing, { timeout: 15_000 }).toBe(true)
  expect(await seeksOf(page, KARAOKE)).toContain(Math.max(0, Math.round((marks[0].start! - PRE_ROLL) * 100) / 100))
  // Voice guide still isn't marked, so its rung still opens in the room.
  await page.goto('./#/practice/sec-1/rap-say')
  await expectRoute(page, '/room')
})
