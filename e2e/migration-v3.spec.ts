/**
 * Updating from version 1.1: a grown-up has already set everything up and she has practised for a
 * while. When 1.2 opens, everything is still there, the 1.1 document is kept as the backup copy, her
 * home page shows today's lessons and her lesson path, and the setup wizard counts what was already
 * set up as done, so nobody has to set it up again.
 */
import { DEFAULT_REFS } from '../src/content/references'
import { addDays } from '../src/model/dates'
import { KEYS } from '../src/storage/keys'
import { v2Save } from '../tests/fixtures/v2-save'
import { checkScreen, expect, expectRoute, holdGate, readSave, tap, test, today } from './helpers'

/** Version 1.4 adds the two karaoke videos after the videos already there. */
const KARAOKE_REFS = DEFAULT_REFS.filter((r) => r.role === 'voiceGuide' || r.role === 'karaoke')

test('a save from version 1.1 carries over when the app updates', async ({ page }) => {
  const v2 = v2Save({ showDate: addDays(today(), 20), startDate: addDays(today(), -5), trackMediaId: null })
  const text = JSON.stringify(v2)
  await page.goto('./manifest.webmanifest')
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEYS.save, text] as const)

  await page.goto('./#/today')
  await expectRoute(page, '/today')
  await expect(page.getByRole('button', { name: 'Start today’s practice' })).toBeVisible()
  await expect(page.locator('.dday')).toHaveText('D-20')
  await expect(page.locator('.block').first()).toBeVisible()
  await expect(page.locator('.lesson-path')).toBeVisible()
  await checkScreen(page, 'kid', 'home after the 1.2 update')

  const save = (await readSave(page)) as unknown as Record<string, unknown>
  expect(save.schemaVersion).toBe(5)
  for (const k of Object.keys(v2).filter((k) => k !== 'schemaVersion')) expect(save[k], k).toEqual(k === 'refs' ? [...(v2.refs as unknown[]), ...KARAOKE_REFS] : v2[k])
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)

  // The wizard: everything 1.1 had is done; only her track (not on this iPad) is still open.
  await holdGate(page)
  await tap(page.getByRole('button', { name: /^(Set up|Carry on setting up)/ }))
  await expectRoute(page, '/grownups/setup')
  await expect(page.locator('.wizard-step[data-step="track"]')).not.toHaveClass(/is-done/)
  for (const s of ['lines', 'starts', 'follow', 'timing', 'beat', 'dates']) await expect(page.locator(`.wizard-step[data-step="${s}"]`)).toHaveClass(/is-done/)
  await checkScreen(page, 'grownup', 'setup after the 1.2 update')

  await page.reload()
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)
})
