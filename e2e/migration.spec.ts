/**
 * Updating from version 1.0: a grown-up has already set everything up and she has practised a little.
 * When the new version opens, everything is still there (show, plan, sections, lines, marks, ladders,
 * shaky sections, reflections, settings), the version-1 document is kept as the backup copy, and her
 * screens and the grown-ups' area work as before.
 */
import { DEFAULT_REFS } from '../src/content/references'
import { addDays } from '../src/model/dates'
import { KEYS } from '../src/storage/keys'
import { v1Save } from '../tests/fixtures/v1-save'
import { checkScreen, expect, expectRoute, holdGate, readSave, tap, test, today } from './helpers'

/** Version 1.4 adds the two karaoke videos after the videos already there. */
const KARAOKE_REFS = DEFAULT_REFS.filter((r) => r.role === 'voiceGuide' || r.role === 'karaoke')

test('a save from version 1.0 carries over when the app updates', async ({ page }) => {
  const v1 = v1Save({ showDate: addDays(today(), 20), startDate: addDays(today(), -5), trackMediaId: null })
  const text = JSON.stringify(v1)
  await page.goto('./manifest.webmanifest')
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEYS.save, text] as const)

  await page.goto('./#/today')
  await expectRoute(page, '/today')
  await expect(page.locator('.countdown')).toContainText('20')
  await expect(page.locator('.block').first()).toBeVisible()
  await checkScreen(page, 'kid', 'today after the update')

  const save = (await readSave(page)) as unknown as Record<string, unknown>
  expect(save.schemaVersion).toBe(5)
  for (const k of Object.keys(v1).filter((k) => k !== 'schemaVersion')) expect(save[k], k).toEqual(k === 'refs' ? [...(v1.refs as unknown[]), ...KARAOKE_REFS] : v1[k])
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)
  expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), KEYS.save))!).schemaVersion).toBe(5)

  // Her ladders and her shaky section are as she left them.
  await page.goto('./#/section/v1')
  await expect(page.locator('.ladder[data-ladder="rap"] .rung.is-done')).toHaveCount(2)
  await expect(page.locator('.ladder[data-ladder="dance"] .rung.is-done')).toHaveCount(1)
  await expect(page.getByRole('switch', { name: 'This feels shaky' })).toHaveAttribute('aria-checked', 'true')

  // The grown-ups' area still lists both sections and their lines.
  await page.goto('./#/today')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Sections' }))
  await expect(page.getByRole('button', { name: 'Edit Verse 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit Chorus' })).toBeVisible()
  await tap(page.getByRole('button', { name: 'Edit Chorus' }))
  await expect(page.locator('.line-row')).toHaveCount(4)

  // A reload is a plain load now: nothing is migrated twice, the backup stays the version-1 copy.
  await page.reload()
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)
})
