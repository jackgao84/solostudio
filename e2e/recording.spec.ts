/**
 * Recording (optional): the front camera with a mirrored preview, recording her while her track
 * plays, playing the clip back beside the reference section, one thing that went well and one to
 * work on, clips kept on the iPad (newest 3 per section and 3 run-throughs, and she's told when an
 * older one goes), and the camera switched off when she leaves.
 */
import { assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, loadTrack, readMedia, readSave, seedSave, setUpSave, tap, test, trackAudio } from './helpers'

async function recordOnce(page: import('@playwright/test').Page, ms: number): Promise<void> {
  await tap(page.getByRole('button', { name: 'Record' }))
  await expect(page.locator('.rec-dot')).toBeVisible()
  await expect.poll(async () => (await trackAudio(page))?.paused).toBe(false)
  await page.waitForTimeout(ms)
  await tap(page.getByRole('button', { name: 'Stop' }))
  await expect(page.locator('[data-view="review"]')).toBeVisible()
  await expect(page.locator('video.clip-player')).toBeVisible()
  const reflect = page.locator('.reflect')
  await tap(page.getByRole('radiogroup', { name: 'One thing that went well' }).getByRole('radio').nth(1))
  await tap(reflect.getByRole('button', { name: 'Next' }))
  await tap(page.getByRole('radiogroup', { name: 'One thing to work on next' }).getByRole('radio').nth(1))
  await tap(reflect.getByRole('button', { name: 'Save' }))
  await expect(page.locator('.reflect-saved')).toBeVisible()
}

test('record a section beside the reference, keep the newest 3, and say when one goes', async ({ page }) => {
  test.setTimeout(150_000)
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 20)
  await tap(page.getByRole('button', { name: 'Back to practice' }))

  await page.goto('./#/record/sec-1')
  await expect(page.locator('[data-screen="record"]')).toBeVisible()
  await checkScreen(page, 'kid', 'record (before the camera)')
  await tap(page.getByRole('button', { name: 'Start camera' }))
  const preview = page.locator('video.camera-preview')
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate((v) => getComputedStyle(v).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)')
  const asked = await page.evaluate(() => (window as unknown as { __camera: { constraints: { video?: { facingMode?: string } }[] } }).__camera.constraints[0])
  expect(asked.video?.facingMode).toBe('user')
  await checkScreen(page, 'kid', 'record (camera on)')

  await recordOnce(page, 1500)
  // Played back beside the reference section.
  await expect(page.locator('.side-by-side .ref-pane iframe')).toBeVisible()
  await assertYouTubeRules(page, 'clip beside the reference')
  let clips = (await readMedia(page)).filter((m) => m.kind === 'clip')
  expect(clips).toHaveLength(1)
  expect(clips[0].group).toBe('section:sec-1')
  expect((await readSave(page)).reflections.filter((r) => r.kind === 'clip')).toHaveLength(1)
  await expect(page.locator('.notice')).toHaveCount(0)

  for (let i = 0; i < 2; i++) {
    await tap(page.getByRole('button', { name: 'Record again' }))
    await recordOnce(page, 900)
  }
  clips = (await readMedia(page)).filter((m) => m.kind === 'clip')
  expect(clips).toHaveLength(3)
  await expect(page.locator('.notice')).toHaveCount(0)

  // The fourth: the oldest goes, and she is told.
  const oldest = [...clips].sort((a, b) => a.createdAt - b.createdAt)[0]
  await tap(page.getByRole('button', { name: 'Record again' }))
  await recordOnce(page, 900)
  await expect(page.locator('.notice')).toBeVisible()
  await expect(page.locator('.notice')).toContainText('Verse 1')
  clips = (await readMedia(page)).filter((m) => m.kind === 'clip')
  expect(clips).toHaveLength(3)
  expect(clips.map((c) => c.id)).not.toContain(oldest.id)

  // Her clips page lists them; leaving switches the camera off.
  await tap(page.getByRole('button', { name: 'Today' }))
  await expectRoute(page, '/today')
  await expect.poll(() => page.evaluate(() => (window as unknown as { __camera: { stopped: number } }).__camera.stopped)).toBeGreaterThan(0)
  await tap(page.getByRole('button', { name: 'My clips' }))
  await expectRoute(page, '/clips')
  await expect(page.locator('.clip-row')).toHaveCount(3)
  await checkScreen(page, 'kid', 'my clips')
})

test('a run-through recording is kept with the run-throughs', async ({ page }) => {
  test.setTimeout(90_000)
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 12)
  await page.goto('./#/record/run')
  await tap(page.getByRole('button', { name: 'Start camera' }))
  await expect(page.locator('video.camera-preview')).toBeVisible()
  await recordOnce(page, 1200)
  const clips = (await readMedia(page)).filter((m) => m.kind === 'clip')
  expect(clips.map((c) => c.group)).toEqual(['run'])
  const saved = await readSave(page)
  expect(saved.reflections.map((r) => [r.kind, r.target])).toEqual([['clip', 'run']])
})
