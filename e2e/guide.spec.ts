/**
 * Version 1.4, part 2: a guide file in the app, by touch, at iPad sizes.
 *  - A grown-up loads her track and a guide from Files (Grown-ups → Her track). The app works out
 *    whether the guide is the voice on its own or a full guide mix (lined up with her track) and the
 *    grown-up confirms it, or says it is the other one.
 *  - The voice control wherever her track plays: Off, Light and Full. Her track and the guide play
 *    from one media element (so the voice can't drift from her track), at 75% with the pitch kept;
 *    switching mid-loop changes only how loud the voice is, never where the music is.
 *  - With a guide file the rap ladder uses it: listen at Full, say it at Light, say it at Off, then
 *    from memory (Off), all over her track, with no karaoke video.
 *  - Recording and Showtime start at Off, with Light as a choice before she begins.
 *  - Without a guide file the control is one line telling a grown-up how to add one.
 * Every sound here is made on the spot: tones and clicks, never song audio.
 */
import type { Page } from '@playwright/test'
import { checkScreen, expect, expectRoute, holdGate, readMedia, readSave, seedSave, setUpSave, tap, typeInto, ytPlayers } from './helpers'
import { test } from './voice'

const RATE = 22050
const SECONDS = 30

/** A seeded random source, so every run makes the same clicks. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** 16-bit stereo WAV bytes. */
function wav(samples: (i: number) => number): Buffer {
  const n = RATE * SECONDS
  const buf = Buffer.alloc(44 + n * 4)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 4, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(2, 22)
  buf.writeUInt32LE(RATE, 24)
  buf.writeUInt32LE(RATE * 4, 28)
  buf.writeUInt16LE(4, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    const v = Math.round(Math.max(-1, Math.min(1, samples(i))) * 32767)
    buf.writeInt16LE(v, 44 + i * 4)
    buf.writeInt16LE(v, 46 + i * 4)
  }
  return buf
}

/** Her "track": a steady 440 Hz tone and irregular clicks. */
const clicks = (() => {
  const r = rng(11)
  const at = new Set<number>()
  for (let t = 0.1; t < SECONDS + 1; t += 0.15 + r() * 0.5) at.add(Math.round(t * RATE))
  return at
})()
function trackSample(i: number): number {
  let click = 0
  for (let k = 0; k < 60; k++) if (clicks.has(i - k)) click = 0.5 * Math.exp(-k / 12) * (k % 2 ? -1 : 1)
  return 0.25 * Math.sin((2 * Math.PI * 440 * i) / RATE) + click
}
/** The "voice": a steady 660 Hz tone. */
const voiceSample = (i: number) => 0.25 * Math.sin((2 * Math.PI * 660 * i) / RATE)

const TRACK = { name: 'practice-track.wav', mimeType: 'audio/wav', buffer: wav(trackSample) }
const VOCALS = { name: 'guide-voice.wav', mimeType: 'audio/wav', buffer: wav(voiceSample) }
/** A full guide mix: her track (starting a quarter of a second later) with the voice in it. */
const LAG = 0.25
const MIX = { name: 'guide-mix.wav', mimeType: 'audio/wav', buffer: wav((i) => (i >= LAG * RATE ? trackSample(i - LAG * RATE) : 0) + voiceSample(i)) }

interface VoiceState {
  level: string
  kind: string
  music: number
  guide: number
  playing: boolean
  time: number
  rate: number
  preservesPitch: boolean
  seeks: number
  channels: number
}

declare global {
  interface Window {
    __solostudio?: { voice?: () => VoiceState | null; hear?: (freqs: number[]) => number[] } & Record<string, unknown>
  }
}

const voice = (page: Page) => page.evaluate(() => window.__solostudio!.voice!())
/** How loud each tone is in what she hears right now. */
const hear = (page: Page, freqs: number[]) => page.evaluate((f) => window.__solostudio!.hear!(f), freqs)
const plainTrackPlaying = (page: Page) => page.evaluate(() => !!document.querySelector<HTMLAudioElement>('audio.track-audio') && !document.querySelector<HTMLAudioElement>('audio.track-audio')!.paused)

/** In Grown-ups → Her track: load her track, then the guide, and confirm (or correct) what the app worked out. */
async function loadGuide(page: Page, guide: typeof VOCALS, answer: 'Yes, that’s right' | 'No, it’s the voice on its own' | 'No, it’s a full guide mix' = 'Yes, that’s right', singer = 'Coco'): Promise<void> {
  await tap(page.getByRole('button', { name: 'Her track' }))
  await expectRoute(page, '/grownups/track')
  await page.locator('input[type="file"][name="track"]').setInputFiles(TRACK)
  await expect(page.locator('.track-file')).toContainText(TRACK.name)
  await page.locator('input[type="file"][name="guide"]').setInputFiles(guide)
  await expect(page.locator('.guide-guess')).toBeVisible({ timeout: 30_000 })
  await checkScreen(page, 'grownup', 'her track, with the guide worked out')
  await tap(page.getByRole('button', { name: answer }))
  await expect(page.locator('.guide-status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  if (singer) {
    await typeInto(page.locator('input[name="singer"]'), singer)
    await tap(page.getByRole('button', { name: 'Save the name' }))
    await expect.poll(async () => (await readSave(page)).guide.singer).toBe(singer)
  }
}

async function setUpWithGuide(page: Page, guide = VOCALS): Promise<void> {
  const save = setUpSave()
  save.tour.seen = true
  save.showtime = { breaths: 1, walkOnSeconds: 3 }
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadGuide(page, guide)
}

test('a grown-up loads the voice on its own; she hears it in time with her track, and switching never moves the music', async ({ page }) => {
  test.setTimeout(150_000)
  await setUpWithGuide(page)
  const save = await readSave(page)
  expect(save.guide).toMatchObject({ kind: 'vocals', guess: 'vocals', offset: 0, fileName: VOCALS.name, forTrack: save.track.mediaId, singer: 'Coco' })
  expect(save.guide.mixId).toBeTruthy()
  const media = await readMedia(page)
  expect(media.filter((m) => m.kind === 'guide').map((m) => m.name)).toEqual([VOCALS.name])
  expect(media.filter((m) => m.kind === 'mix')).toHaveLength(1)

  // Listen at Full: her track and the voice, no video.
  await page.goto('./#/practice/sec-1/rap-listen')
  await expectRoute(page, '/practice/sec-1/rap-listen')
  await expect(page.locator('.practice__step')).toHaveText('Listen and read')
  const control = page.locator('.voice-control')
  await expect(control).toContainText('Coco’s voice')
  await expect(control.getByRole('radio', { name: 'Full' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('iframe')).toHaveCount(0)
  await checkScreen(page, 'kid', 'listen at Full')
  await tap(page.getByRole('button', { name: 'Play', exact: true }))
  await expect.poll(async () => (await voice(page))?.playing, { timeout: 15_000 }).toBe(true)
  let v = (await voice(page))!
  expect(v).toMatchObject({ level: 'full', kind: 'vocals', rate: 0.75, preservesPitch: true, channels: 4 })
  expect(v.music).toBeCloseTo(1, 2)
  expect(v.guide).toBeCloseTo(1, 2)
  expect(await plainTrackPlaying(page)).toBe(false)
  await page.waitForTimeout(800)
  let [f440, f330, f660] = await hear(page, [440, 330, 660])
  expect(f440, 'her track').toBeGreaterThan(0.03)
  expect(f660, 'the voice').toBeGreaterThan(0.03)
  // At 75% the pitch is kept: her 440 Hz tone is still 440 Hz, not 330.
  expect(f440).toBeGreaterThan(f330 * 4)

  // Switch to Off mid-loop: the voice goes, the music carries on from where it was.
  const before = (await voice(page))!
  const t0 = Date.now()
  await tap(control.getByRole('radio', { name: 'Off' }))
  await expect.poll(async () => (await voice(page))!.guide).toBeLessThan(0.01)
  await page.waitForTimeout(600)
  v = (await voice(page))!
  const elapsed = (Date.now() - t0) / 1000
  expect(v.seeks, 'no seek when the voice changes').toBe(before.seeks)
  expect(v.time - before.time).toBeGreaterThan(elapsed * 0.75 * 0.6)
  expect(v.time - before.time).toBeLessThan(elapsed * 0.75 * 1.4 + 0.1)
  ;[f440, , f660] = await hear(page, [440, 330, 660])
  expect(f440).toBeGreaterThan(0.03)
  expect(f660).toBeLessThan(f440 * 0.1)

  // Light: the voice comes back, softer.
  await tap(control.getByRole('radio', { name: 'Light' }))
  await expect.poll(async () => (await voice(page))!.guide).toBeCloseTo(0.35, 2)
  await page.waitForTimeout(500)
  const [l440, , l660] = await hear(page, [440, 330, 660])
  expect(l660).toBeGreaterThan(0.005)
  expect(l660).toBeLessThan(l440 * 0.6)
  expect((await voice(page))!.seeks).toBe(before.seeks)
  await tap(page.getByRole('button', { name: 'Pause', exact: true }))

  // The rest of the ladder: say it at Light, say it at Off, then from memory at Off, all on her track.
  for (const [step, name, level] of [
    ['rap-say', 'Say it with a light voice', 'Light'],
    ['rap-fade', 'Say it with no voice', 'Off'],
    ['rap-memory-75', 'From memory, slow', 'Off'],
    ['rap-memory-100', 'From memory, full speed', 'Off'],
  ] as const) {
    await page.goto(`./#/practice/sec-1/${step}`)
    await expectRoute(page, `/practice/sec-1/${step}`)
    await expect(page.locator('.practice__step')).toHaveText(name)
    await expect(control.getByRole('radio', { name: level })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('iframe')).toHaveCount(0)
    expect(await ytPlayers(page)).toEqual([])
  }
  await checkScreen(page, 'kid', 'from memory with the voice control')

  // The practice room on her track: the control, at Off.
  await page.goto('./#/room?source=track')
  await expectRoute(page, '/room')
  await expect(page.locator('.room-sources [data-source="track"]')).toHaveAttribute('aria-checked', 'true')
  await expect(control.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
  await tap(control.getByRole('radio', { name: 'Full' }))
  await expect.poll(async () => (await voice(page))!.level).toBe('full')
  await checkScreen(page, 'kid', 'the room on her track with the voice')
})

test('a full guide mix is worked out as one and lined up with her track; Full plays the mix, Light crossfades', async ({ page }) => {
  test.setTimeout(150_000)
  await setUpWithGuide(page, MIX)
  const save = await readSave(page)
  expect(save.guide).toMatchObject({ kind: 'mix', guess: 'mix' })
  expect(save.guide.offset).toBeCloseTo(LAG, 2)

  await page.goto('./#/room?source=track')
  const control = page.locator('.voice-control')
  await expect(control.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
  await tap(control.getByRole('radio', { name: 'Full' }))
  await expect.poll(async () => (await voice(page))!).toMatchObject({ level: 'full', kind: 'mix' })
  await expect.poll(async () => (await voice(page))!.music).toBeLessThan(0.01)
  await expect.poll(async () => (await voice(page))!.guide).toBeGreaterThan(0.99)
  await tap(control.getByRole('radio', { name: 'Light' }))
  await expect.poll(async () => (await voice(page))!.music).toBeCloseTo(0.65, 2)
  expect((await voice(page))!.guide).toBeCloseTo(0.35, 2)

  // A grown-up removes the guide: the rap ladder goes back to the karaoke videos.
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Her track' }))
  await tap(page.getByRole('button', { name: 'Remove the guide' }))
  await tap(page.getByRole('button', { name: 'Yes, remove it' }))
  await expect.poll(async () => (await readSave(page)).guide.mediaId).toBeNull()
  expect((await readMedia(page)).filter((m) => m.kind === 'guide' || m.kind === 'mix')).toEqual([])
  await page.goto('./#/practice/sec-1/rap-say')
  await expect(page.locator('.practice__step')).toHaveText('Say it with Voice guide')
})

test('a grown-up can say the guide is the other kind', async ({ page }) => {
  test.setTimeout(120_000)
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadGuide(page, VOCALS, 'No, it’s a full guide mix', '')
  const g = (await readSave(page)).guide
  expect(g).toMatchObject({ guess: 'vocals', kind: 'mix', singer: '' })
  await page.goto('./#/practice/sec-1/rap-memory-75')
  await expect(page.locator('.voice-control')).toContainText('The singer’s voice')
})

test('recording and Showtime start at Off, with Light as a choice before she begins', async ({ page }) => {
  test.setTimeout(150_000)
  await setUpWithGuide(page)
  const control = page.locator('.voice-control')

  await page.goto('./#/record/sec-1')
  await tap(page.getByRole('button', { name: 'Start camera' }))
  await expect(page.locator('video.camera-preview')).toBeVisible()
  await expect(control.getByRole('radio')).toHaveCount(2)
  await expect(control.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
  await expect(control.getByRole('radio', { name: 'Full' })).toHaveCount(0)
  await checkScreen(page, 'kid', 'recording, before she begins')
  await tap(control.getByRole('radio', { name: 'Light' }))
  await expect.poll(async () => (await voice(page))!.level).toBe('light')
  await tap(page.getByRole('button', { name: 'Record', exact: true }))
  await expect(control).toBeHidden()
  await expect.poll(async () => (await voice(page))?.playing, { timeout: 20_000 }).toBe(true)
  expect((await voice(page))!.level).toBe('light')
  expect((await voice(page))!.guide).toBeCloseTo(0.35, 2)
  await tap(page.getByRole('button', { name: 'Stop', exact: true }))

  await page.goto('./#/showtime')
  await expect(control.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
  await expect(control.getByRole('radio')).toHaveCount(2)
  await checkScreen(page, 'kid', 'Showtime, before she begins')
  await tap(control.getByRole('radio', { name: 'Light' }))
  await tap(page.getByRole('button', { name: 'Start', exact: true }))
  await expect(control).toBeHidden()
  await expect.poll(async () => (await voice(page))?.level).toBe('light')
})

test('without a guide file the control tells a grown-up in one line how to add one', async ({ page }) => {
  test.setTimeout(120_000)
  const save = setUpSave()
  save.tour.seen = true
  await seedSave(page, save)
  // No track yet: a video stands in, and there is no voice control at all.
  await page.goto('./#/practice/sec-1/rap-memory-75')
  await expect(page.locator('.practice__step')).toHaveText('From memory, slow')
  await expect(page.locator('.voice-control')).toHaveCount(0)

  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Her track' }))
  await page.locator('input[type="file"][name="track"]').setInputFiles(TRACK)
  await expect(page.locator('.track-file')).toContainText(TRACK.name)
  await expect(page.locator('.guide-status')).toHaveAttribute('data-state', 'none')

  for (const route of ['#/practice/sec-1/rap-memory-75', '#/room?source=track', '#/showtime']) {
    await page.goto(`./${route}`)
    const control = page.locator('.voice-control')
    await expect(control, route).toHaveText('A grown-up can add a guide file in Grown-ups → Her track.')
    await expect(control.getByRole('radio')).toHaveCount(0)
  }
  // The rap ladder is the karaoke one.
  await page.goto('./#/practice/sec-1/rap-say')
  await expect(page.locator('.practice__step')).toHaveText('Say it with Voice guide')
  await expect(page.locator('.voice-control')).toHaveCount(0)
})
