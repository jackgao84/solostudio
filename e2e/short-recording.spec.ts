/**
 * A recording stopped straight away, in WebKit at iPad sizes (found while making 1.3's checks
 * reliable: WebKit's recorder can hand back an empty clip when Stop comes a few milliseconds after the
 * start, and the app kept it and tried to play it):
 *  - Stop the moment the recording starts: it still runs for a moment, and the clip has her in it;
 *  - a recording with nothing in it is never kept: she is told, and Record is there again.
 */
import { KID_COPY } from '../src/content/kid'
import { expect, holdGate, loadTrack, readMedia, seedSave, setUpSave, tap, test } from './helpers'

async function toRecording(page: import('@playwright/test').Page): Promise<void> {
  const save = setUpSave()
  save.tour.seen = true
  save.showtime.walkOnSeconds = 3
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 20)
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await page.goto('./#/record/sec-1')
  await tap(page.getByRole('button', { name: 'Start camera' }))
  await tap(page.getByRole('button', { name: 'Record' }))
}

/** Tap Stop the moment the recording starts (no human is that quick; the recorder can be). */
async function stopAtOnce(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const t = setInterval(() => {
          if (!document.querySelector('.rec-dot')) return
          clearInterval(t)
          Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Stop')!.click()
          resolve()
        }, 5)
      }),
  )
}

test('Stop the moment the recording starts: the clip still has her in it', async ({ page }) => {
  test.setTimeout(90_000)
  await toRecording(page)
  await stopAtOnce(page)
  await expect(page.locator('[data-view="review"]')).toBeVisible({ timeout: 15_000 })
  const size = await page.evaluate(async () => (await (await fetch(document.querySelector<HTMLVideoElement>('video.clip-player')!.src)).blob()).size)
  expect(size).toBeGreaterThan(0)
  const clips = (await readMedia(page)).filter((m) => m.kind === 'clip')
  expect(clips).toHaveLength(1)
  expect(clips[0].size).toBeGreaterThan(0)
})

test('a recording with nothing in it is never kept, and Record is there again', async ({ page }) => {
  test.setTimeout(90_000)
  // A recorder that hands back nothing at all.
  await page.addInitScript(() => {
    class EmptyRecorder extends EventTarget {
      state: RecordingState = 'inactive'
      mimeType = 'video/mp4'
      ondataavailable: ((e: { data: Blob }) => void) | null = null
      static isTypeSupported(): boolean {
        return true
      }
      constructor(_stream: MediaStream, _opts?: MediaRecorderOptions) {
        super()
      }
      start(): void {
        this.state = 'recording'
      }
      requestData(): void {}
      stop(): void {
        if (this.state === 'inactive') return
        this.state = 'inactive'
        setTimeout(() => {
          this.ondataavailable?.({ data: new Blob([], { type: 'video/mp4' }) })
          this.dispatchEvent(new Event('stop'))
        }, 10)
      }
    }
    ;(window as unknown as { MediaRecorder: unknown }).MediaRecorder = EmptyRecorder
  })
  await toRecording(page)
  await expect(page.locator('.rec-dot')).toBeVisible({ timeout: 15_000 })
  await tap(page.getByRole('button', { name: 'Stop' }))
  await expect(page.locator('.recording-empty')).toHaveText(KID_COPY.record.nothingRecorded)
  await expect(page.getByRole('button', { name: 'Record' })).toBeVisible()
  await expect(page.locator('[data-view="review"]')).toHaveCount(0)
  expect((await readMedia(page)).filter((m) => m.kind === 'clip')).toEqual([])
})
