/**
 * YouTube rules in practice: a video that won't embed (error 150 or 101) shows "Open in YouTube"
 * instead of a broken player, and a grown-up can swap it; a local video (a teacher's demo) can be
 * added as a reference and shown mirrored, while YouTube players are never transformed.
 */
import { watchUrl } from '../src/media/youtube-util'
import { assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, makeVideo, readSave, seedSave, setUpSave, tap, test, typeInto, ytPlayers } from './helpers'

test('a video that will not embed offers "Open in YouTube", and a grown-up swaps it', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __ytFakeErrors: Record<string, number> }).__ytFakeErrors = { '6DBtz2enWSA': 150 }
  })
  await seedSave(page, setUpSave())
  await page.goto('./#/practice/sec-1/rap-listen')
  const error = page.locator('.yt-error')
  await expect(error).toBeVisible()
  const link = error.locator('a.open-in-youtube')
  await expect(link).toHaveAttribute('href', watchUrl('6DBtz2enWSA'))
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
  await expect(page.locator('iframe')).toHaveCount(0)
  // The lines are still there to read.
  await expect(page.locator('.lyric-line')).toHaveCount(4)
  await checkScreen(page, 'kid', 'video will not embed')

  // A grown-up swaps the video.
  await tap(page.getByRole('button', { name: 'Today' }))
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Videos' }))
  const row = page.locator('.ref-row[data-ref-id="ref-listen"]')
  await typeInto(row.locator('input[name="youtubeId"]'), 'https://youtu.be/JSFG-IE8n_c')
  await tap(row.getByRole('button', { name: 'Save' }))
  await expect.poll(async () => (await readSave(page)).refs.find((r) => r.id === 'ref-listen')?.youtubeId).toBe('JSFG-IE8n_c')
  await page.goto('./#/practice/sec-1/rap-listen')
  await expect(page.locator('iframe')).toHaveCount(1)
  await expect(page.locator('.yt-error')).toHaveCount(0)
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['JSFG-IE8n_c'])
  await assertYouTubeRules(page, 'swapped video')
})

test('error 101 in the grown-ups’ marking screen offers the same way out', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __ytFakeErrors: Record<string, number> }).__ytFakeErrors = { 'XD00TJ-6WSw': 101 }
  })
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Sections' }))
  await tap(page.getByRole('button', { name: 'Edit Verse 1' }))
  await page.locator('select[name="markSource"]').selectOption('ref-performance')
  const marks = page.locator('.marks[data-source="ref-performance"]')
  await expect(marks.locator('.yt-error a.open-in-youtube')).toHaveAttribute('href', watchUrl('XD00TJ-6WSw'))
  await expect(marks.locator('iframe')).toHaveCount(0)
})

test('a local video can be added as a reference and mirrored; YouTube players never are', async ({ page }) => {
  const save = setUpSave()
  // Dance Break has no mirrored YouTube marks, so following uses a local video shown mirrored.
  delete save.sections[2].refs['ref-mirrored']
  await seedSave(page, save)
  await page.goto('./#/today')
  const video = await makeVideo(page, 3000)
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Videos' }))
  await typeInto(page.locator('input[name="localLabel"]'), 'Teacher demo')
  await page.locator('input[type="file"][name="localVideo"]').setInputFiles({ name: 'teacher-demo.mp4', mimeType: video.mimeType, buffer: video.buffer })
  const row = page.locator('.ref-row[data-kind="local"]')
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Teacher demo')
  const mirror = row.getByRole('switch', { name: 'Mirror' })
  await expect(mirror).toHaveAttribute('aria-checked', 'false')
  await tap(mirror)
  await expect(mirror).toHaveAttribute('aria-checked', 'true')
  await checkScreen(page, 'grownup', 'videos with a local video')
  const refId = await row.getAttribute('data-ref-id')
  expect(refId).toBeTruthy()

  // Mark it on Dance Break while it plays.
  await tap(page.getByRole('button', { name: 'Done' }))
  await tap(page.getByRole('button', { name: 'Sections' }))
  await tap(page.getByRole('button', { name: 'Edit Dance Break' }))
  await page.locator('select[name="markSource"]').selectOption(refId!)
  const marks = page.locator(`.marks[data-source="${refId}"]`)
  const local = marks.locator('video.local-video')
  await expect(local).toBeVisible()
  await expect.poll(() => local.evaluate((v) => getComputedStyle(v).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)')
  await tap(marks.getByRole('button', { name: 'Mark start' }))
  await tap(marks.getByRole('button', { name: 'Play' }))
  await page.waitForTimeout(2000)
  await tap(marks.getByRole('button', { name: 'Mark end' }))
  await expect.poll(async () => (await readSave(page)).sections[2].refs[refId!]?.end ?? null).not.toBeNull()

  // Following Dance Break at 50% plays the local video, mirrored; nothing is sent anywhere.
  await page.goto('./#/practice/sec-3/dance-follow-50')
  const follow = page.locator('video.local-video')
  await expect(follow).toBeVisible()
  await expect.poll(() => follow.evaluate((v) => getComputedStyle(v).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)')
  await tap(page.getByRole('button', { name: 'Play' }))
  await expect.poll(() => follow.evaluate((v) => (v as HTMLVideoElement).playbackRate)).toBe(0.5)
  await expect(page.locator('iframe')).toHaveCount(0)

  // The mirrored YouTube follow-along on Verse 1 is the video as it is: no transform anywhere.
  await page.goto('./#/practice/sec-1/dance-follow-50')
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['PBhzOdOIFEY'])
  await assertYouTubeRules(page, 'mirrored YouTube video')
  await expectRoute(page, '/practice/sec-1/dance-follow-50')
})
