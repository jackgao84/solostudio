/**
 * Every screen at iPad portrait and landscape: 48 px touch targets, no sideways scrolling, 16 px text
 * fields, text readable from two metres on her screens, and the YouTube rules wherever a player is.
 * Also: the lessons (each puts her teachers first, with Face Lab linked from the expressions lesson,
 * Up Anyway from the performing lesson, and the links set in the grown-ups' area).
 */
import { DEFAULT_FACE_LAB_URL, DEFAULT_UP_ANYWAY_URL } from '../src/storage/schema'
import { LESSON_IDS } from '../src/content/lessons'
import { assertYouTubeRules, checkScreen, expect, expectRoute, holdGate, seedSave, setUpSave, tap, test, typeInto } from './helpers'

test('her screens', async ({ page }) => {
  test.setTimeout(150_000)
  await seedSave(page, setUpSave())
  const kid: [string, string, boolean][] = [
    ['#/today', 'today', false],
    ['#/sections', 'sections', false],
    ['#/section/sec-1', 'section', false],
    ['#/practice/sec-1/rap-listen', 'rap: listen and read', true],
    ['#/practice/sec-1/rap-say', 'rap: say it with the words', true],
    ['#/practice/sec-1/rap-fade', 'rap: fading words', true],
    ['#/practice/sec-1/rap-memory-75', 'rap: from memory', true],
    ['#/practice/sec-2/dance-watch', 'dance: tutorial', true],
    ['#/practice/sec-2/dance-follow-75', 'dance: follow', true],
    ['#/practice/sec-2/dance-memory', 'dance: from memory', true],
    ['#/practice/sec-3/together-mark-75', 'together: marking', true],
    ['#/practice/sec-3/together-full-100', 'together: full out', true],
    ['#/practice/sec-1/together-linked', 'together: linked from the top', true],
    ['#/quiz/sec-1/words', 'missing words', false],
    ['#/quiz/sec-1/counts', 'counts from memory', true],
    ['#/showtime', 'showtime', false],
    ['#/record/sec-1', 'record', false],
    ['#/clips', 'my clips', false],
    ['#/lessons', 'lessons', false],
  ]
  for (const [hash, label, player] of kid) {
    await page.goto(`./${hash}`)
    await expect(page.locator('.screen').first()).toBeVisible()
    if (player) await expect(page.locator('iframe').first()).toBeVisible()
    await checkScreen(page, 'kid', label)
    if (player) await assertYouTubeRules(page, label)
  }
  for (const id of LESSON_IDS) {
    await page.goto(`./#/lesson/${id}`)
    await expect(page.locator('.teachers-first')).toBeVisible()
    await checkScreen(page, 'kid', `lesson ${id}`)
  }
  // Today's blocks: each one's screen.
  await page.goto('./#/today')
  const ids = await page.locator('.block').evaluateAll((els) => els.map((e) => e.getAttribute('data-block-id')!))
  for (const id of ids) {
    await page.goto(`./#/block/${id}`)
    await expect(page.locator('[data-screen="block"]')).toBeVisible()
    await checkScreen(page, 'kid', `block ${id}`)
  }
})

test('the grown-ups’ screens', async ({ page }) => {
  test.setTimeout(120_000)
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await holdGate(page)
  await checkScreen(page, 'grownup', 'grown-ups home')
  for (const [name, route] of [
    ['Show and plan', '/grownups/plan'],
    ['Her track', '/grownups/track'],
    ['Videos', '/grownups/refs'],
    ['Sections', '/grownups/sections'],
    ['Tempo and counts', '/grownups/tempo'],
    ['Backup', '/grownups/backup'],
    ['Links', '/grownups/links'],
  ] as const) {
    await tap(page.getByRole('button', { name }))
    await expectRoute(page, route)
    await checkScreen(page, 'grownup', name)
    if (name === 'Sections') {
      await tap(page.getByRole('button', { name: 'Edit Chorus' }))
      await expectRoute(page, '/grownups/section/sec-2')
      await checkScreen(page, 'grownup', 'section editor')
      for (const source of ['track', 'ref-original', 'ref-tutorialFull']) {
        await page.locator('select[name="markSource"]').selectOption(source)
        if (source !== 'track') await assertYouTubeRules(page, `marking on ${source}`)
        await checkScreen(page, 'grownup', `marking on ${source}`)
      }
    }
    await tap(page.getByRole('button', { name: 'Done' }))
    if (name === 'Sections') {
      await expectRoute(page, '/grownups/sections')
      await tap(page.getByRole('button', { name: 'Done' }))
    }
    await expectRoute(page, '/grownups')
  }
  // Leaving the grown-ups' area locks it again.
  await tap(page.getByRole('button', { name: 'Back to practice' }))
  await page.goto('./#/grownups')
  await expectRoute(page, '/today')
})

test('lessons put her teachers first and link to Face Lab and Up Anyway', async ({ page }) => {
  await seedSave(page, setUpSave())
  await page.goto('./#/today')
  await tap(page.getByRole('button', { name: 'Lessons' }))
  await expectRoute(page, '/lessons')
  await expect(page.locator('.lesson-card')).toHaveCount(LESSON_IDS.length)
  await tap(page.locator('.lesson-card[data-lesson="performing"]'))
  await expectRoute(page, '/lesson/performing')
  await expect(page.locator('.teachers-first')).toContainText(/teachers/i)
  await expect(page.locator('a.upanyway-link')).toHaveAttribute('href', DEFAULT_UP_ANYWAY_URL)
  await page.goto('./#/lesson/expressions')
  const face = page.locator('a.facelab-link')
  await expect(face).toHaveAttribute('href', DEFAULT_FACE_LAB_URL)
  await expect(face).toHaveAttribute('target', '_blank')

  // A grown-up changes the Face Lab link.
  await tap(page.getByRole('button', { name: 'Today' }))
  await holdGate(page)
  await tap(page.getByRole('button', { name: 'Links' }))
  await typeInto(page.locator('input[name="faceLabUrl"]'), 'https://jackgao84.github.io/face-lab/?from=solo')
  await tap(page.getByRole('button', { name: 'Save links' }))
  await page.goto('./#/lesson/expressions')
  await expect(page.locator('a.facelab-link')).toHaveAttribute('href', 'https://jackgao84.github.io/face-lab/?from=solo')
})
