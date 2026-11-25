/**
 * Backup: a grown-up exports everything except media to a file, and imports it on a fresh iPad (here:
 * after clearing this one). The track and videos stay out of the file, so the app says which need
 * loading again.
 */
import { readFileSync } from 'node:fs'
import { MEDIA_DB } from '../src/storage/keys'
import { checkScreen, expect, expectRoute, holdGate, loadTrack, readSave, seedSave, setUpSave, tap, test } from './helpers'

test('export everything except media, then import it on a fresh iPad', async ({ page }) => {
  test.setTimeout(120_000)
  const save = setUpSave()
  save.reflections = [{ id: 'r1', at: new Date().toISOString(), kind: 'showtime', target: 'run', wentWell: 'I kept going', workOn: 'Breathing' }]
  await seedSave(page, save)
  await page.goto('./#/today')
  await holdGate(page)
  await loadTrack(page, 8)
  const before = await readSave(page)

  await tap(page.getByRole('button', { name: 'Backup' }))
  await expectRoute(page, '/grownups/backup')
  await checkScreen(page, 'grownup', 'backup')
  const [download] = await Promise.all([page.waitForEvent('download'), tap(page.getByRole('button', { name: 'Export backup' }))])
  expect(download.suggestedFilename()).toMatch(/^solostudio-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const path = await download.path()
  const text = readFileSync(path, 'utf8')
  const file = JSON.parse(text)
  expect(file.app).toBe('solostudio')
  expect(file.data.sections).toEqual(before.sections)
  expect(file.data.reflections).toEqual(before.reflections)
  expect(file.data.track.mediaId).toBe(before.track.mediaId)
  expect(text).not.toMatch(/data:|base64|blob:/i)
  expect(text.length).toBeLessThan(40_000)

  // A fresh iPad: nothing stored, no media.
  await page.evaluate(async (db) => {
    localStorage.clear()
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(db)
      req.onsuccess = req.onerror = req.onblocked = () => resolve(null)
    })
  }, MEDIA_DB)
  await page.goto('./')
  await page.reload()
  await expectRoute(page, '/welcome')
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Backup' }))
  await page.locator('input[type="file"][name="import"]').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(text) })
  await expect(page.locator('.import-summary')).toContainText('3 sections')
  await tap(page.getByRole('button', { name: 'Replace everything with this backup' }))
  await expect(page.locator('.saved-note')).toBeVisible()
  const after = await readSave(page)
  expect(after.sections).toEqual(before.sections)
  expect(after.reflections).toEqual(before.reflections)
  expect(after.show).toEqual(before.show)
  // Her track was not in the file: the grown-ups' home says it needs loading again.
  await tap(page.getByRole('button', { name: 'Done' }))
  await expect(page.locator('.media-missing')).toBeVisible()
})
