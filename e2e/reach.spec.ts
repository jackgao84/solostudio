/**
 * She practises across the room, so on her screens the main buttons are on screen as soon as it
 * opens, without scrolling (checked in portrait, and in landscape too), and the ones she taps between
 * reps (Play or Pause, Next, I did it, Start) are big enough to hit from a step away.
 */
import type { Page } from '@playwright/test'
import { expect, seedSave, setUpSave, test } from './helpers'

/** Height of a button she taps from a step away. */
const BIG_PX = 88
const BIG = new Set(['Play', 'Pause', 'Next', 'I did it', 'Start', 'Start today’s practice', 'Play your track', 'Start the drill', 'Start a run-through', 'Start performing'])

async function onScreen(page: Page, label: string, names: string[]): Promise<void> {
  const vh = page.viewportSize()!.height
  expect(await page.evaluate(() => window.scrollY), `${label}: opens at the top`).toBe(0)
  for (const name of names) {
    const b = page.getByRole('button', { name, exact: true }).first()
    await expect(b, `${label}: ${name}`).toBeVisible()
    const box = (await b.boundingBox())!
    expect(box.y, `${label}: ${name} top`).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height, `${label}: "${name}" is on screen without scrolling`).toBeLessThanOrEqual(vh)
    if (BIG.has(name)) expect(box.height, `${label}: ${name} height`).toBeGreaterThanOrEqual(BIG_PX)
  }
}

test('the main buttons are on screen without scrolling, and big', async ({ page }) => {
  test.setTimeout(150_000)
  const save = setUpSave({ showInDays: 8 })
  save.tour.seen = true
  save.notes.teacher = { 'sec-1': 'A teacher’s note that runs to a couple of lines, to be sure it never pushes the buttons off the screen.' }
  await seedSave(page, save)
  const screens: [string, string[]][] = [
    ['#/today', ['Start today’s practice']],
    ['#/practice/sec-1/rap-listen', ['Play', 'I did it']],
    ['#/practice/sec-1/rap-say', ['Play', 'I did it']],
    ['#/practice/sec-1/rap-fade', ['Play', 'I did it']],
    ['#/practice/sec-1/rap-memory-100', ['Play', 'I did it']],
    ['#/practice/sec-1/dance-watch', ['Play', 'I did it']],
    ['#/practice/sec-1/dance-follow-50', ['Play', 'I did it']],
    ['#/practice/sec-1/dance-memory', ['Play', 'I did it']],
    ['#/practice/sec-2/together-mark-75', ['Play', 'I did it']],
    ['#/practice/sec-2/together-linked', ['Play', 'I did it']],
    ['#/drill/anywhere', ['Play', 'Next']],
    ['#/drill/rejoin', ['Play', 'Next']],
    ['#/showtime', ['Start']],
    ['#/quiz/sec-1/words', ['I did it']],
    ['#/quiz/sec-1/counts', ['Play', 'I did it']],
  ]
  for (const [hash, names] of screens) {
    await page.goto(`./${hash}`)
    await expect(page.locator('.screen').first()).toBeVisible()
    await page.waitForTimeout(400)
    await onScreen(page, hash, names)
  }
  // Every block of today's plan.
  await page.goto('./#/today')
  const ids = await page.locator('.block').evaluateAll((els) => els.map((e) => [e.getAttribute('data-block-id')!, e.getAttribute('data-type')!, e.getAttribute('data-drill') ?? ''] as const))
  for (const [id, type, drill] of ids) {
    await page.goto(`./#/block/${id}`)
    await expect(page.locator('[data-screen="block"]')).toBeVisible()
    const names = drill ? ['Start the drill'] : type === 'runthrough' ? ['Start a run-through'] : type === 'family' ? ['Start performing'] : ['All done']
    await onScreen(page, `block ${id}`, names)
  }
})
