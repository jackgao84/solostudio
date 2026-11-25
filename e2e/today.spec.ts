/**
 * Today: the day's blocks from the plan, headset reminders from the middle phase on, moving blocks
 * (refused when it would strain her voice or skip water), a gentle timer that keeps the screen awake,
 * finishing a block, a light day, the show having passed, and resetting the plan for a new show.
 */
import { PHASE_COPY } from '../src/content/blocks'
import { addDays } from '../src/model/dates'
import { moveBlock, planDay, planInputFrom } from '../src/model/plan'
import { checkScreen, expect, expectRoute, holdGate, readSave, seedSave, setUpSave, tap, test, today, typeInto, wakeLock } from './helpers'

const order = (page: import('@playwright/test').Page) => page.locator('.block').evaluateAll((els) => els.map((e) => e.getAttribute('data-block-id')))

test('the middle phase: headset reminders, her own order, and the voice rule', async ({ page }) => {
  const save = setUpSave({ showInDays: 8 })
  save.plan!.holidayStart = today()
  await seedSave(page, save)
  await page.goto('./#/today')
  const day = planDay(planInputFrom(save)!, today())!
  expect(day.phase).toBe('together')
  await expect(page.locator('.block')).toHaveCount(day.blocks.length)
  expect(await order(page)).toEqual(day.blocks.map((b) => b.id))
  await expect(page.locator('.phase')).toContainText(PHASE_COPY.together.name)
  for (const b of day.blocks) await expect(page.locator(`.block[data-block-id="${b.id}"] .headset-note`)).toHaveCount(b.headset ? 1 : 0)
  for (const b of day.blocks.filter((b) => ['warmup', 'water', 'cooldown'].includes(b.type))) await expect(page.locator(`.block[data-block-id="${b.id}"] .move`)).toHaveCount(0)
  await checkScreen(page, 'kid', 'today (middle phase)')

  const candidates = day.blocks.flatMap((b) => ([-1, 1] as const).map((dir) => ({ b, dir, r: moveBlock(day.blocks, b.id, dir) })))
  const refused = candidates.find((c) => !c.r.ok && (c.r.reason === 'voice' || c.r.reason === 'water'))
  expect(refused, 'a move today that the voice or water rule refuses').toBeTruthy()
  await tap(page.locator(`.block[data-block-id="${refused!.b.id}"]`).getByRole('button', { name: refused!.dir < 0 ? 'Move up' : 'Move down' }))
  await expect(page.locator('.move-note')).toBeVisible()
  expect(await order(page)).toEqual(day.blocks.map((b) => b.id))

  const fine = candidates.find((c) => c.r.ok)!
  expect(fine).toBeTruthy()
  await tap(page.locator(`.block[data-block-id="${fine.b.id}"]`).getByRole('button', { name: fine.dir < 0 ? 'Move up' : 'Move down' }))
  const moved = fine.r.ok ? fine.r.blocks.map((b) => b.id) : []
  await expect.poll(() => order(page)).toEqual(moved)
  await page.reload()
  await expect.poll(() => order(page)).toEqual(moved)
  expect((await readSave(page)).days[today()].order).toEqual(moved)
})

test('a light day, a gentle timer that keeps the screen awake, and finishing a block', async ({ page }) => {
  await seedSave(page, setUpSave({ lightToday: true }))
  await page.goto('./#/today')
  await expect(page.locator('.light-day')).toBeVisible()
  expect((await wakeLock(page)).active).toBe(0)
  const dance = page.locator('.block[data-type="dance"]').first()
  const id = await dance.getAttribute('data-block-id')
  await tap(dance.getByRole('button', { name: /^Start/ }))
  await expectRoute(page, `/block/${id}`)
  const timer = page.locator('.block-timer')
  await expect(timer).toBeVisible()
  const first = Number(await timer.getAttribute('data-elapsed'))
  await page.waitForTimeout(2300)
  expect(Number(await timer.getAttribute('data-elapsed'))).toBeGreaterThan(first)
  expect((await wakeLock(page)).active).toBe(1)
  await checkScreen(page, 'kid', 'dance block')
  await tap(page.getByRole('button', { name: 'All done' }))
  await expectRoute(page, '/today')
  await expect(page.locator(`.block[data-block-id="${id}"]`)).toHaveClass(/is-done/)
  await expect.poll(async () => (await wakeLock(page)).active).toBe(0)
  expect((await readSave(page)).days[today()].done).toContain(id)

  // The warm-up and the water break have their own simple steps.
  await tap(page.locator('.block[data-type="warmup"]').getByRole('button', { name: /^Start/ }))
  await expect(page.locator('.routine-step').first()).toBeVisible()
  await checkScreen(page, 'kid', 'warm-up')
  await tap(page.getByRole('button', { name: 'Today' }))
})

test('after the show, today says so and a grown-up can set the next one', async ({ page }) => {
  const save = setUpSave()
  save.show = { name: 'Showcase', date: addDays(today(), -2) }
  save.plan!.startDate = addDays(today(), -30)
  await seedSave(page, save)
  await page.goto('./#/today')
  await expect(page.locator('.show-over')).toBeVisible()
  await expect(page.locator('.block')).toHaveCount(0)
  await checkScreen(page, 'kid', 'after the show')
})

test('a grown-up resets the plan for the talent show; everything she learned stays', async ({ page }) => {
  const save = setUpSave()
  save.progress['sec-1'] = {
    rap: { done: ['rap-listen', 'rap-say'], fade: 0, finishedAt: null, review: null },
    dance: { done: ['dance-watch'], fade: 0, finishedAt: null, review: null },
    together: { done: [], fade: 0, finishedAt: null, review: null },
    shaky: false,
    shakyDue: null,
  }
  await seedSave(page, save)
  await page.goto('./#/today')
  await expect(page.locator('.countdown')).toContainText('30')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Show and plan' }))
  const reset = page.locator('form.reset-form')
  await typeInto(reset.locator('[name="newShowName"]'), 'Talent show')
  await reset.locator('[name="newShowDate"]').fill(addDays(today(), 20))
  await tap(reset.getByRole('button', { name: 'Reset the plan for this show' }))
  await tap(reset.getByRole('button', { name: 'Yes, reset it' }))
  await expect(reset.locator('.saved-note')).toBeVisible()
  const after = await readSave(page)
  expect(after.show).toEqual({ name: 'Talent show', date: addDays(today(), 20) })
  expect(after.pastShows).toEqual([save.show])
  expect(after.plan?.startDate).toBe(today())
  expect(after.sections).toEqual(save.sections)
  expect(after.progress).toEqual(save.progress)
  await tap(page.getByRole('button', { name: 'Done' }))
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await expectRoute(page, '/today')
  await expect(page.locator('.countdown')).toContainText('20')
})
