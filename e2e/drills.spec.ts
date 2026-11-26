/**
 * Start anywhere and jump back in (the rejoin drill), version 1.1.
 * - Both are on Today from the together phase on, as rap-and-dance-together blocks.
 * - Start anywhere: a random section, named out loud, then "5, 6, 7, 8" on the beat, then the music
 *   from that section's start; lyrics and video optional; Next drops her somewhere else.
 * - Jump back in: on her track, once in each rep the music drops out for 2 to 4 seconds while the
 *   track keeps its place, or jumps ahead one line; the screen says keep going.
 * - Nothing is ever spoken over her track or a video.
 */
import type { Page } from '@playwright/test'
import { COUNT_IN_WORDS } from '../src/model/countin'
import { planDay, planInputFrom } from '../src/model/plan'
import { assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, loadTrack, seedSave, setUpSave, tap, today } from './helpers'
import { nothingSpokenOverMedia, spoken, test } from './voice'

const STAND_IN = 'JSFG-IE8n_c'

function togetherSave() {
  const save = setUpSave({ showInDays: 8 })
  save.plan!.holidayStart = today()
  return save
}

async function fakeSeeks(page: Page, videoId: string): Promise<number[]> {
  return page.evaluate((id) => {
    const fake = (window as unknown as { __ytFake?: { players: { videoId: string; destroyed: boolean; seeks: number[] }[] } }).__ytFake
    return (fake?.players ?? []).filter((p) => p.videoId === id && !p.destroyed).flatMap((p) => p.seeks)
  }, videoId)
}

async function fakePlaying(page: Page, videoId: string): Promise<boolean> {
  return page.evaluate((id) => {
    const fake = (window as unknown as { __ytFake?: { players: { videoId: string; destroyed: boolean; playing: boolean }[] } }).__ytFake
    return (fake?.players ?? []).some((p) => p.videoId === id && !p.destroyed && p.playing)
  }, videoId)
}

test('both drills are on Today from the together phase on', async ({ page }) => {
  const save = togetherSave()
  await seedSave(page, save)
  await page.goto('./#/today')
  const day = planDay(planInputFrom(save)!, today())!
  for (const drill of ['anywhere', 'rejoin'] as const) {
    const b = day.blocks.find((x) => x.drill === drill)!
    expect(b, drill).toBeTruthy()
    await expect(page.locator(`.block[data-block-id="${b.id}"]`)).toHaveAttribute('data-drill', drill)
  }
  await expect(page.locator('.block[data-drill="anywhere"] .block__title').first()).toHaveText('Start anywhere')
  await expect(page.locator('.block[data-drill="rejoin"] .block__title').first()).toHaveText('Jump back in')
  await checkScreen(page, 'kid', 'today with drills')

  // Not while she is still learning the parts.
  await seedSave(page, setUpSave({ showInDays: 30 }))
  await page.goto('./#/today')
  await expect(page.locator('.block').first()).toBeVisible()
  await expect(page.locator('.block[data-drill]')).toHaveCount(0)
})

test('start anywhere: a section named out loud, a count-in on the beat, then the music from there', async ({ page }) => {
  test.setTimeout(120_000)
  const save = togetherSave()
  await seedSave(page, save)
  await page.goto('./#/today')
  await tap(page.locator('.block[data-drill="anywhere"]').first().getByRole('button', { name: /^Start/ }))
  await expectRoute(page, /^\/block\//)
  await checkScreen(page, 'kid', 'start anywhere block')
  await tap(page.getByRole('button', { name: 'Start the drill' }))
  await expectRoute(page, '/drill/anywhere')
  await checkScreen(page, 'kid', 'start anywhere')
  await expect(page.getByRole('switch', { name: 'Show the words' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Show the video' })).toBeVisible()

  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(async () => (await spoken(page)).filter((u) => COUNT_IN_WORDS.includes(u.text)).length).toBe(4)
  const said = await spoken(page)
  const cue = said.find((u) => u.text.startsWith('Next: '))
  expect(cue, 'the section is named before the count-in').toBeTruthy()
  const section = save.sections.find((s) => cue!.text === `Next: ${s.name}`)
  expect(section, cue!.text).toBeTruthy()
  const counts = said.filter((u) => COUNT_IN_WORDS.includes(u.text))
  expect(counts.map((u) => u.text)).toEqual(COUNT_IN_WORDS)
  expect(counts[0].at).toBeGreaterThan(cue!.at)
  // On the beat: 120 BPM at full speed is 500 ms a beat.
  for (let i = 1; i < 4; i++) expect(Math.abs(counts[i].at - counts[i - 1].at - 500), `beat ${i}`).toBeLessThan(150)

  await expect.poll(() => fakePlaying(page, STAND_IN)).toBe(true)
  expect(await fakeSeeks(page, STAND_IN)).toContain(section!.track.start)
  await expect(page.locator('.drill-now')).toContainText(section!.name)
  await expect(page.locator('.lyric-line')).toHaveCount(4)
  await checkScreen(page, 'kid', 'start anywhere playing')

  // Next: somewhere else, named, and counted in again.
  await tap(page.getByRole('button', { name: 'Next' }))
  await expect.poll(async () => (await spoken(page)).filter((u) => u.text.startsWith('Next: ')).length).toBe(2)
  const second = (await spoken(page)).filter((u) => u.text.startsWith('Next: '))[1]
  expect(second.text).not.toBe(cue!.text)
  await expect.poll(async () => (await spoken(page)).filter((u) => COUNT_IN_WORDS.includes(u.text)).length).toBe(8)

  // Lyrics are optional.
  await tap(page.getByRole('switch', { name: 'Show the words' }))
  await expect(page.locator('.lyrics')).toBeHidden()

  // Pause: the music stops and nothing more is said.
  await expect.poll(() => fakePlaying(page, STAND_IN)).toBe(true)
  await tap(page.getByRole('button', { name: 'Pause' }))
  await expect.poll(() => fakePlaying(page, STAND_IN)).toBe(false)
  const quiet = (await spoken(page)).length
  await page.waitForTimeout(3000)
  expect((await spoken(page)).length).toBe(quiet)

  // The video is optional too: the mirrored follow-along, with the YouTube rules kept.
  await tap(page.getByRole('switch', { name: 'Show the video' }))
  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(() => fakePlaying(page, 'PBhzOdOIFEY'), { timeout: 15_000 }).toBe(true)
  await assertYouTubeRules(page, 'start anywhere with the video')
  await checkScreen(page, 'kid', 'start anywhere with the video')
  expect(await nothingSpokenOverMedia(page)).toEqual([])
})

test('jump back in: the music drops out or skips a line, her track keeps its place, and she keeps going', async ({ page }) => {
  test.setTimeout(150_000)
  const save = togetherSave()
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 26)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await page.goto('./#/drill/rejoin')
  await checkScreen(page, 'kid', 'jump back in')
  await expect(page.getByRole('switch', { name: 'Show the video' })).toHaveCount(0)
  await tap(page.getByRole('button', { name: 'Play' }))

  type Sample = { at: number; time: number; muted: boolean; paused: boolean; keep: boolean }
  const samples: Sample[] = []
  const lineStarts = save.sections.flatMap((s) => s.lines.map((l) => l.time!))
  let event: string | null = null
  const t0 = Date.now()
  while (!event && Date.now() - t0 < 40_000) {
    const s = await page.evaluate(() => {
      const a = document.querySelector<HTMLAudioElement>('audio.track-audio')!
      const keep = document.querySelector('.keep-going')
      return { at: performance.now(), time: a.currentTime, muted: a.muted, paused: a.paused, keep: !!keep && !(keep as HTMLElement).hidden }
    })
    samples.push(s)
    const prev = samples[samples.length - 2]
    // A drop-out: muted while playing, then the sound comes back with the track further on.
    const mutedRun = samples.filter((x) => x.muted && !x.paused)
    if (mutedRun.length && prev && prev.muted && !s.muted) {
      const real = (mutedRun[mutedRun.length - 1].at - mutedRun[0].at) / 1000
      const moved = mutedRun[mutedRun.length - 1].time - mutedRun[0].time
      expect(real, 'drop-out length').toBeGreaterThan(1.6)
      expect(real, 'drop-out length').toBeLessThan(4.4)
      expect(moved, 'the track kept its place while silent').toBeGreaterThan(real * 0.7)
      expect(mutedRun.some((x) => x.keep), 'keep going shows during the drop-out').toBe(true)
      event = 'dropout'
    }
    // A jump: the track moves forward by more than real time allows, to the start of a line.
    if (prev && !prev.paused && !s.paused && s.time - prev.time > (s.at - prev.at) / 1000 + 0.6) {
      const near = lineStarts.some((t) => Math.abs(t - s.time) < 0.4)
      expect(near, `jumped to ${s.time.toFixed(2)}, the start of a line`).toBe(true)
      event = 'jump'
    }
    await page.waitForTimeout(80)
  }
  expect(event, 'a drop-out or a jump in the first rep').not.toBeNull()
  expect(await nothingSpokenOverMedia(page)).toEqual([])
  await tap(page.getByRole('button', { name: 'Pause' }))
  await expect.poll(() => page.evaluate(() => document.querySelector<HTMLAudioElement>('audio.track-audio')!.muted)).toBe(false)
})
