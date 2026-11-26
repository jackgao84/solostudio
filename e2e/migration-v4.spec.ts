/**
 * Updating from version 1.2: a grown-up has done most of the setup wizard and she has practised for a
 * while. When 1.3 opens, everything is still there (narration, her lessons, the wizard paused where it
 * was), the 1.2 document is kept as the backup copy, she has no parts of her own yet, and home has the
 * practice room next to Start today's practice.
 */
import { DEFAULT_REFS } from '../src/content/references'
import { addDays } from '../src/model/dates'
import { KEYS } from '../src/storage/keys'
import { v3Save } from '../tests/fixtures/v3-save'
import { checkScreen, expect, expectRoute, holdGate, readSave, tap, test, today, ytPlayers } from './helpers'

/** Version 1.4 adds the two karaoke videos after the videos already there. */
const KARAOKE_REFS = DEFAULT_REFS.filter((r) => r.role === 'voiceGuide' || r.role === 'karaoke')

test('a save from version 1.2 carries over when the app updates', async ({ page }) => {
  const v3 = v3Save({ showDate: addDays(today(), 20), startDate: addDays(today(), -5), trackMediaId: null })
  const text = JSON.stringify(v3)
  await page.goto('./manifest.webmanifest')
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEYS.save, text] as const)

  await page.goto('./#/today')
  await expectRoute(page, '/today')
  await expect(page.getByRole('button', { name: 'Start today’s practice' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Practice room', exact: true })).toBeVisible()
  await expect(page.locator('.dday')).toHaveText('D-20')
  await expect(page.locator('.lesson-path')).toBeVisible()
  await checkScreen(page, 'kid', 'home after the 1.3 update')

  const save = (await readSave(page)) as unknown as Record<string, unknown>
  expect(save.schemaVersion).toBe(5)
  for (const k of Object.keys(v3).filter((k) => k !== 'schemaVersion')) expect(save[k], k).toEqual(k === 'refs' ? [...(v3.refs as unknown[]), ...KARAOKE_REFS] : v3[k])
  expect(save.parts).toEqual([])
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)

  // The practice room is there, with no parts yet.
  await tap(page.getByRole('button', { name: 'Practice room', exact: true }))
  await expectRoute(page, '/room')
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['PBhzOdOIFEY'])
  await expect(page.locator('.my-part')).toHaveCount(0)

  // The wizard is still paused on the beat step.
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: /^(Set up|Carry on setting up)/ }))
  await expectRoute(page, '/grownups/setup')
  await expect(page.locator('.wizard-step[data-step="beat"]')).toHaveClass(/is-open/)

  await page.reload()
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)
})
