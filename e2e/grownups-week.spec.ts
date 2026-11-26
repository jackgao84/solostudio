/**
 * For grown-ups (version 1.1):
 * - Her week: the last 7 days at a glance (days and minutes practised, ladder steps per section,
 *   sections marked shaky, her "one thing" notes). Nothing older shows.
 * - Practising fills it in: time with a practice screen open, the steps she ticks, shaky marks.
 * - A teacher's note for a section shows on that section's practice screen (and no other).
 * - A short note for her shows on Today until she taps it.
 */
import { addDays } from '../src/model/dates'
import { checkScreen, expect, expectRoute, holdGate, readSave, seedSave, setUpSave, tap, test, today, typeInto } from './helpers'

const localIso = (day: string, hour = 18) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}

test('her week: the last 7 days at a glance', async ({ page }) => {
  const save = setUpSave()
  const t = today()
  save.activity = {
    [t]: { seconds: 1200, ticks: [{ section: 'sec-1', step: 'rap-listen' }, { section: 'sec-1', step: 'rap-say' }], shaky: [] },
    [addDays(t, -3)]: { seconds: 1800, ticks: [{ section: 'sec-2', step: 'dance-watch' }], shaky: ['sec-2'] },
    [addDays(t, -10)]: { seconds: 3600, ticks: [{ section: 'sec-3', step: 'dance-watch' }], shaky: ['sec-3'] },
  }
  save.reflections = [
    { id: 'r1', at: localIso(addDays(t, -1)), kind: 'showtime', target: 'run', wentWell: 'I kept going', workOn: 'Breathing' },
    { id: 'r2', at: localIso(addDays(t, -12)), kind: 'clip', target: 'sec-1', wentWell: 'Big energy', workOn: 'A tricky move' },
  ]
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Her week' }))
  await expectRoute(page, '/grownups/week')
  await expect(page.locator('.week-days')).toContainText('3 days')
  await expect(page.locator('.week-minutes')).toContainText('50 minutes')
  await expect(page.locator('.week-section[data-section="sec-1"] .week-steps')).toHaveText('2')
  await expect(page.locator('.week-section[data-section="sec-2"] .week-steps')).toHaveText('1')
  await expect(page.locator('.week-section[data-section="sec-3"] .week-steps')).toHaveText('0')
  await expect(page.locator('.week-shaky')).toContainText('Chorus')
  await expect(page.locator('.week-shaky')).not.toContainText('Dance Break')
  await expect(page.locator('.week-notes')).toContainText('I kept going')
  await expect(page.locator('.week-notes')).toContainText('Breathing')
  await expect(page.locator('.week-notes')).not.toContainText('Big energy')
  await checkScreen(page, 'grownup', 'her week')
})

test('practising fills in her week: time, ticked steps and shaky marks', async ({ page }) => {
  test.setTimeout(90_000)
  await seedSave(page, setUpSave())
  await page.goto('./#/practice/sec-1/rap-listen')
  await tap(page.getByRole('button', { name: 'Play' }))
  await page.waitForTimeout(12_000)
  await tap(page.getByRole('button', { name: 'I did it' }))
  await expectRoute(page, '/practice/sec-1/rap-say')
  await page.goto('./#/section/sec-2')
  await tap(page.getByRole('switch', { name: 'This feels shaky' }))
  const log = (await readSave(page)).activity[today()]
  expect(log.seconds).toBeGreaterThanOrEqual(5)
  expect(log.ticks).toEqual([{ section: 'sec-1', step: 'rap-listen' }])
  expect(log.shaky).toEqual(['sec-2'])
})

test('a teacher’s note shows on that section’s practice screen', async ({ page }) => {
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Notes' }))
  await expectRoute(page, '/grownups/notes')
  await checkScreen(page, 'grownup', 'notes')
  await typeInto(page.locator('textarea[name="teacher-sec-2"]'), 'Bend your knees on the turn.')
  await tap(page.getByRole('button', { name: 'Save teacher notes' }))
  await expect.poll(async () => (await readSave(page)).notes.teacher).toEqual({ 'sec-2': 'Bend your knees on the turn.' })
  await tap(page.getByRole('button', { name: 'Done' }))
  await tap(page.getByRole('button', { name: 'Back to practice' }))

  await page.goto('./#/practice/sec-2/dance-follow-50')
  await expect(page.locator('.teacher-note')).toContainText('Bend your knees on the turn.')
  await checkScreen(page, 'kid', 'practice with a teacher’s note')
  await page.goto('./#/practice/sec-1/dance-follow-50')
  await expect(page.locator('[data-screen="practice"]')).toBeVisible()
  await expect(page.locator('.teacher-note')).toHaveCount(0)
})

test('a note for her shows on Today until she taps it', async ({ page }) => {
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await expect(page.locator('.note-for-her')).toHaveCount(0)
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Notes' }))
  await typeInto(page.locator('textarea[name="forHer"]'), 'Have fun today. We are proud of you.')
  await tap(page.getByRole('button', { name: 'Show this on her Today screen' }))
  await expect(page.locator('.saved-note')).toBeVisible()
  await tap(page.getByRole('button', { name: 'Done' }))
  await tap(page.getByRole('button', { name: 'Back to practice' }))

  const note = page.locator('.note-for-her')
  await expect(note).toContainText('Have fun today. We are proud of you.')
  await checkScreen(page, 'kid', 'today with a note for her')
  await page.reload()
  await expect(note).toBeVisible()
  await tap(note.getByRole('button', { name: 'Got it' }))
  await expect(note).toHaveCount(0)
  expect((await readSave(page)).notes.forHer?.seen).toBe(true)
  await page.reload()
  await expect(page.locator('.block').first()).toBeVisible()
  await expect(note).toHaveCount(0)

  // The grown-up can see she has read it.
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Notes' }))
  await expect(page.locator('.for-her-status')).toContainText('She has seen it')
})
