/**
 * Updating from version 1.3: she has two parts of her own and a grown-up has added a teacher's demo.
 * When 1.4 opens, everything is still there (her parts, the demo, the wizard paused where it was),
 * the 1.3 document is kept as the backup copy, the practice room has the two karaoke videos by their
 * names after the videos already there, and there is no guide yet.
 */
import { DEFAULT_REFS } from '../src/content/references'
import { addDays } from '../src/model/dates'
import { KEYS } from '../src/storage/keys'
import { emptyGuide, type Reference } from '../src/storage/schema'
import { v4Save } from '../tests/fixtures/v4-save'
import { checkScreen, expect, expectRoute, readSave, tap, test, today, ytPlayers } from './helpers'

test('a save from version 1.3 carries over when the app updates', async ({ page }) => {
  const v4 = v4Save({ showDate: addDays(today(), 20), startDate: addDays(today(), -5), trackMediaId: null })
  const text = JSON.stringify(v4)
  await page.goto('./manifest.webmanifest')
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEYS.save, text] as const)

  await page.goto('./#/today')
  await expectRoute(page, '/today')
  await expect(page.getByRole('button', { name: 'Start today’s practice' })).toBeVisible()
  await expect(page.locator('.dday')).toHaveText('D-20')
  await checkScreen(page, 'kid', 'home after the 1.4 update')

  const save = (await readSave(page)) as unknown as Record<string, unknown>
  expect(save.schemaVersion).toBe(5)
  for (const k of Object.keys(v4).filter((k) => k !== 'schemaVersion' && k !== 'refs')) expect(save[k], k).toEqual(v4[k])
  const added = DEFAULT_REFS.filter((r) => r.id === 'ref-voiceGuide' || r.id === 'ref-karaoke')
  expect(save.refs).toEqual([...(v4.refs as Reference[]), ...added])
  expect(save.guide).toEqual(emptyGuide())
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)

  // The practice room: her parts, and both karaoke videos by their names.
  await tap(page.getByRole('button', { name: 'Practice room', exact: true }))
  await expectRoute(page, '/room')
  await expect(page.locator('.my-part')).toHaveCount(2)
  await expect(page.locator('.my-part').first()).toContainText('Spin')
  const sources = page.locator('.room-sources')
  await expect(sources.getByRole('radio', { name: 'Voice guide (light)', exact: true })).toBeVisible()
  await expect(sources.getByRole('radio', { name: 'Karaoke (no voice)', exact: true })).toBeVisible()
  await expect(sources.getByRole('radio', { name: 'Teacher demo', exact: true })).toBeVisible()
  await tap(sources.getByRole('radio', { name: 'Karaoke (no voice)', exact: true }))
  await expect.poll(async () => (await ytPlayers(page)).map((p) => p.videoId)).toEqual(['d_-jC3519xI'])

  await page.reload()
  expect(await page.evaluate((k) => localStorage.getItem(k), KEYS.backup)).toBe(text)
  expect(((await readSave(page)) as unknown as Record<string, unknown>).schemaVersion).toBe(5)
})
